import axios from 'axios';
import fs from 'fs';
import formData from 'form-data';
import mime from 'mime-types';

const maxBytes = 50000000; // 50 MB for axios

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const env = require('./env.json');

const API_KEY = env.apiKey;

const baseUrl = env.url;
const mainFolderPath = env.mainFolderPath;
const outputFilesPath = env.outputFilesPath;
const projects = env.projects; // array of projects, ex:  [ "all", "the-plant-list" ]
const resultsLimit = env.resultsLimit;
const maxParallelQueries = env.maxParallelQueries; // try 5 or 10

let tasks = [];
const results = [];

async function main() {
    const subFolders = fs.readdirSync(mainFolderPath);
    for (const subFolder of subFolders) {
        const subFolderPath = mainFolderPath + '/' + subFolder;
        const stats = fs.statSync(subFolderPath);
        // exclude non-folders
        if (! stats.isDirectory()) continue;
        const expectedSpeciesLowercase = subFolder.replace('_', ' ').toLowerCase();
        console.log('== ' + expectedSpeciesLowercase + ' ==');
        const files = fs.readdirSync(subFolderPath);
        for (const fileName of files) {
            const filePath = subFolderPath + '/' + fileName;
            const sfStats = fs.statSync(filePath);
            // is it another subfolder ?
            if (sfStats.isDirectory()) {
                // multi-images identification request
                console.log('==== (multi) ' + fileName);
                const subFiles = fs.readdirSync(filePath);
                const images = [];
                for (const subFileName of subFiles) {
                    const subFilePath = filePath + '/' + subFileName;
                    const mimeType = mime.lookup(subFilePath);
                    // exclude non-images (JPEG / PNG)
                    if ([ "image/jpeg", "image/png" ].includes(mimeType)) {
                        images.push(subFilePath);
                    }
                }
                if (images.length > 0) {
                    for (const project of projects) {
                        const url = baseUrl + '/' + project + '?api-key=' + API_KEY;
                        const organs = []; // auto
                        await parallelize(sendMultiPost(url, images, organs), expectedSpeciesLowercase, fileName, project);
                    }
                }
            } else {
                // single image identification request
                const mimeType = mime.lookup(filePath);
                // exclude non-images (JPEG / PNG)
                if (! [ "image/jpeg", "image/png" ].includes(mimeType)) continue;
                for (const project of projects) {
                    const url = baseUrl + '/' + project + '?api-key=' + API_KEY;
                    const organ = 'auto';
                    await parallelize(sendPost(url, filePath, organ), expectedSpeciesLowercase, fileName, project);
                }
            }
        }
    }

    // process remaining parallel tasks if any
    if (tasks.length > 0) {
        await processTasks();
    }

    // convert to CSV
    let CSVdata = 'subfolder;image;project;is top1;in top5;rank;genus top1;genus top5;genus rank;match score'; // headers
    for (let i = 0; i < resultsLimit; i++) {
        CSVdata += `;r${i+1} name; r${i+1} score`;
    }
    CSVdata += '\n';
    for (const r of results) {
        CSVdata += r.join(';') + '\n';
    }
    // write
    const outputFile = outputFilesPath + '/plantnet_benchmark_' + (new Date()).toISOString().substring(0, 19) + '.csv';
    fs.writeFileSync(outputFile, CSVdata);
    console.log('results written to: ' + outputFile);
}

async function sendPost(url, image, organ='auto') {
    const form = new formData();
	form.append('images', fs.createReadStream(image));
	form.append('organs', organ);
	try {
		const source = axios.CancelToken.source();     
		const { status, data } = await axios.post(
            url,
            form,
            {
                cancelToken: source.token,
                headers: form.getHeaders(),
                maxContentLength: maxBytes,
                maxBodyLength: maxBytes
            }
        );
		return { status, data };
	} catch (error) {
		console.error(error.response.data || error);
		// throw error;
	}
}

async function sendMultiPost(url, images, organs=[]) {
    const form = new formData();
    if (organs.length > 0) {
        if (organs.length !== images.length) {
            throw new Error('organs length must be equal to images length');
        }
        for (const organ of organs) {
            form.append('organs', organ);
        }
    }
    for (const image of images) {
	    form.append('images', fs.createReadStream(image));
    }
	try {
		const source = axios.CancelToken.source();
		const { status, data } = await axios.post(
            url,
            form,
            {
                cancelToken: source.token,
                headers: form.getHeaders(),
                maxContentLength: maxBytes,
                maxBodyLength: maxBytes
            }
        );
		return { status, data };
	} catch (error) {
		console.error(((error || {}).response || {}).data || error);
		// throw error;
	}
}

async function parallelize(task, expectedSpeciesLowercase, fileName, project) {
    tasks.push({
        task,
        expectedSpeciesLowercase,
        fileName,
        project
    });
    if (tasks.length >= maxParallelQueries) {
        await processTasks();
    }
}

async function processTasks() {
    const responses = await Promise.all(tasks.map(t => t.task));
    for (const [i, resp] of responses.entries()) {
        processResponse(resp, tasks[i].expectedSpeciesLowercase, tasks[i].fileName, tasks[i].project);
    }
    tasks = [];
}

function processResponse(resp, expectedSpeciesLowercase, fileName, project) {
    if (resp) {
        let isTop1 = false;
        let isInTop5 = false;
        let rank = '-';
        let genusIsTop1 = false;
        let genusIsInTop5 = false;
        let genusRank = '-';
        let matchScore = '-';
        const expectedGenusLowercase = expectedSpeciesLowercase.split(' ')[0];
        const { status, data } = resp;
        console.log(fileName + ' : OK', status);
        if (status === 200 && data && Array.isArray(data.results) && data.results.length > 0) {
            const resultsLineHeader = [
                expectedSpeciesLowercase,
                fileName,
                project,
                // organ
            ];
            let resultsLine = [];
            for (let i=0; i < resultsLimit; i++) {
                let topN = [ '-', '-' ];
                if (data.results.length > i) {
                    topN = [
                        data.results[i].species.scientificName,
                        data.results[i].score
                    ];
                    const speciesName = data.results[i].species.scientificNameWithoutAuthor.toLowerCase();
                    const genusName = speciesName.split(' ')[0];
                    if (i == 0) {
                        isTop1 = (speciesName === expectedSpeciesLowercase);
                        genusIsTop1 = (genusName === expectedGenusLowercase);
                    }
                    if (i < 5) {
                        isInTop5 = isInTop5 || (speciesName === expectedSpeciesLowercase);
                        genusIsInTop5 = genusIsInTop5 || (genusName === expectedGenusLowercase);
                    }
                    if (speciesName === expectedSpeciesLowercase) {
                        rank = i+1;
                        matchScore = data.results[i].score;
                    }
                    if (genusRank === '-' && genusName === expectedGenusLowercase) {
                        genusRank = i+1;
                    }
                }
                resultsLine = [...resultsLine, ...topN];
            }
            resultsLine = [...resultsLineHeader, ...[ isTop1, isInTop5, rank, genusIsTop1, genusIsInTop5, genusRank, matchScore ], ...resultsLine];
            results.push(resultsLine);
        }
    } else {
        console.error(fileName + ' : FAILED');
        results.push([
            expectedSpeciesLowercase,
            fileName,
            project,
            // organ,
            'FAILED'
        ]);
    }
}

main();

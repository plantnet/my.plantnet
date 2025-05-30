import axios from 'axios';
import fs from 'fs';
import formData from 'form-data';
import mime from 'mime-types';
import pLimit from 'p-limit'
import path from 'path';

const maxBytes = 50000000; // 50 MB for axios

const env = JSON.parse(fs.readFileSync('env.json', 'utf8'))

const API_KEY = env.apiKey;
const noReject = env.noReject;

const baseUrl = env.url;
const mainFolderPath = env.mainFolderPath;
const outputFilesPath = env.outputFilesPath;
const projects = env.projects; // array of projects, ex:  [ "all", "the-plant-list" ]
const resultsLimit = env.resultsLimit;
const maxParallelQueries = env.maxParallelQueries; // try 5 or 10

const concurrentTaskLimit = pLimit(maxParallelQueries);

const tasks = [];
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
                    // detail images order for correspondance with predicted organs array
                    let detailedFileName = fileName;
                    if (env.includePredictedOrgans) {
                        detailedFileName += ' (' + images.map((i) => path.basename(i)).join(',') + ')';
                    }
                    for (const project of projects) {
                        const url = baseUrl + '/' + project + '?api-key=' + API_KEY + '&nb-results=' + resultsLimit + (noReject ? '&no-reject=true' : '');
                        const organs = []; // auto
                        parallelize(() => sendMultiPost(url, images, organs), expectedSpeciesLowercase, detailedFileName, project, images.length);
                    }
                }
            } else {
                // single image identification request
                const mimeType = mime.lookup(filePath);
                // exclude non-images (JPEG / PNG)
                if (! [ "image/jpeg", "image/png" ].includes(mimeType)) continue;
                for (const project of projects) {
                    const url = baseUrl + '/' + project + '?api-key=' + API_KEY + '&nb-results=' + resultsLimit + (noReject ? '&no-reject=true' : '');
                    const organ = 'auto';
                    parallelize(() => sendPost(url, filePath, organ), expectedSpeciesLowercase, fileName, project, 1);
                }
            }
        }
    }

    // process in parallel
    if (tasks.length > 0) {
        await Promise.all(tasks);
    } else {
        console.log('No images to benchmark. Exiting.');
        return
    }

    // convert to CSV
    let CSVdata = 'subfolder;images;nb_images;project;';
    if (env.includePredictedOrgans) {
        CSVdata += 'predicted organs;';
    }
    CSVdata += 'is top1;in top5;rank;genus top1;genus top5;genus rank;match score';
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
		console.error(error.response?.data || error);
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

async function parallelize(task, expectedSpeciesLowercase, fileName, project, nbImages) {
    tasks.push(concurrentTaskLimit( async () => {
        const response = await task();
        processResponse(response, expectedSpeciesLowercase, fileName, project, nbImages);
    }))
}

function processResponse(resp, expectedSpeciesLowercase, fileName, project, nbImages) {
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
                nbImages,
                project
            ];
            if (env.includePredictedOrgans) {
                if (Array.isArray(data.predictedOrgans)) {
                    resultsLineHeader.push(
                        data.predictedOrgans
                            .map((po) => `${po.organ} (${po.score})`)
                            .join(',')
                    );
                }
            }
            let resultsLine = [];
            for (let i=0; i < resultsLimit; i++) {
                let topN = [ '-', '-' ];
                if (data.results.length > i) {
                    topN = [
                        data.results[i].species.scientificName,
                        data.results[i].score
                    ];
                    const speciesName = data.results[i].species.scientificNameWithoutAuthor.toLowerCase();
                    const speciesNameWithAuthor = data.results[i].species.scientificName.toLowerCase();
                    const genusName = speciesName.split(' ')[0];

                    const speciesNamesMatched = speciesName === expectedSpeciesLowercase || speciesNameWithAuthor === expectedSpeciesLowercase;
                    const genusNamesMatched = genusName === expectedGenusLowercase;

                    if (i === 0) {
                        isTop1 = speciesNamesMatched;
                        genusIsTop1 = genusNamesMatched;
                    }
                    if (i < 5) {
                        isInTop5 = isInTop5 || speciesNamesMatched;
                        genusIsInTop5 = genusIsInTop5 || genusNamesMatched;
                    }
                    if (speciesNamesMatched) {
                        rank = i+1;
                        matchScore = data.results[i].score;
                    }
                    if (genusRank === '-' && genusNamesMatched) {
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
            nbImages,
            project,
            'FAILED'
        ]);
    }
}

main();

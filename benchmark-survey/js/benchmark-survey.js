import axios from 'axios';
import fs from 'fs';
import formData from 'form-data';
import mime from 'mime-types';

const maxBytes = 50000000; // 50 MB for axios

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const env = require('./env.json');

const API_KEY = env.apiKey; // survey-enabled API key

const baseUrl = env.url;

const mainFolderPath = env.mainFolderPath;
const outputFilesPath = env.outputFilesPath;
const projects = env.projects; // array of projects, ex:  [ "all", "the-plant-list" ]
const sortBy = env.sortBy; // "max_score" (default), "coverage", or "count"

const tile_size = env.tile_size; // Minimal window size. Default value : 600
const tile_stride = env.tile_stride; // (pixel) Drive the image sampling. Default value: 300
const size_factor = env.size_factor; // The multiplicative factor applied to 2 successive image sizes. Default value : √2
const min_score = env.min_score; // Only species with a score higher than min_score will be considered. Default value : 0.3
const max_rank = env.max_rank; // Only species with a rank lower than max_rank will be considered. Default value : 3
const multi_scale = env.multi_scale; // Disable multi-scaling, if false only sub-queries with a size of tile_size pixels will be generated. Default value : true

const results = [];
let mostResultsForAnImage = 0;

async function main() {
    const subFolders = fs.readdirSync(mainFolderPath);
    for (const subFolder of subFolders) {
        const subFolderPath = mainFolderPath + '/' + subFolder;
        const stats = fs.statSync(subFolderPath);
        // exclude non-folders
        if (! stats.isDirectory()) continue;
        const expectedSpeciesLowercase = subFolder.replace('_', ' ').toLowerCase();
        const expectedGenusLowercase = expectedSpeciesLowercase.split(' ')[0];
        const files = fs.readdirSync(subFolderPath);
        for (const fileName of files) {
            const filePath = subFolderPath + '/' + fileName;
            // exclude non-images (JPEG / PNG)
            const mimeType = mime.lookup(filePath);
            if (! [ "image/jpeg", "image/png" ].includes(mimeType)) continue;
            for (const project of projects) {
                const url = baseUrl + '/' + project + '?api-key=' + API_KEY;
                const resp = await sendPost(url, filePath);
                if (resp) {
                    let isTop1 = false;
                    let isInTop5 = false;
                    let rank = '-';
                    let genusIsTop1 = false;
                    let genusIsInTop5 = false;
                    let genusRank = '-';
                    const { status, data } = resp;
                    console.log(fileName + ' : OK', status);
                    if (status === 200 && data && data.results) {
                        const resultsLineHeader = [
                            expectedSpeciesLowercase,
                            fileName,
                            project,
                            data.results.image.width,
                            data.results.image.height,
                            data.results.nb_sub_queries,
                            data.results.nb_matching_sub_queries,
                            data.results.species.length,
                            data.results.genus.length,
                            data.results.family.length
                        ];
                        let resultsLine = [];
                        if (Array.isArray(data.results.species) && data.results.species.length > 0) {
                            // remove rejects
                            data.results.species = data.results.species.filter((r) => r.name != null && r.reject == null);
                            // sort by custom field desc.
                            data.results.species = data.results.species.sort((a, b) => a[sortBy] > b[sortBy] ? -1 : 1 );
                            mostResultsForAnImage = Math.max(mostResultsForAnImage, data.results.species.length);
                            for (let i=0; i < data.results.species.length; i++) {
                                const topN = [
                                    data.results.species[i].name,
                                    data.results.species[i].max_score,
                                    data.results.species[i].count,
                                    data.results.species[i].coverage
                                ];
                                const speciesName = data.results.species[i].name.split(' ').slice(0, 2).join(' ').toLowerCase();
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
                                }
                                if (genusRank === '-' && genusName === expectedGenusLowercase) {
                                    genusRank = i+1;
                                }
                                resultsLine = [...resultsLine, ...topN];
                            }
                            resultsLine = [...resultsLineHeader, ...[ isTop1, isInTop5, rank, genusIsTop1, genusIsInTop5, genusRank ], ...resultsLine];
                            results.push(resultsLine);
                        } else {
                            console.error(fileName + ' : FAILED SP');
                            results.push([...resultsLineHeader, 'FAILED SP']);
                        }
                    }
                } else {
                    console.error(fileName + ' : FAILED');
                    results.push([
                        expectedSpeciesLowercase,
                        fileName,
                        project,
                        'FAILED'
                    ]);
                }
            }
        }
    }

    // convert to CSV
    let CSVdata = 'subfolder;image;project;image width;image height;nb sub-queries;nb match;nb species;nb genus;nb family;is top1;in top5;rank;genus top1;genus top5;genus rank'; // headers
    for (let i = 0; i < mostResultsForAnImage; i++) {
        CSVdata += `;r${i+1} name;r${i+1} max score;r${i+1} count;r${i+1} coverage`;
    }
    CSVdata += '\n';
    for (const r of results) {
        CSVdata += r.join(';') + '\n';
    }
    // write
    const outputFile = outputFilesPath + '/plantnet_benchmark_survey_' + (new Date()).toISOString().substring(0, 19) + '.csv';
    fs.writeFileSync(outputFile, CSVdata);
    console.log('results written to: ' + outputFile);
}

async function sendPost(url, image) {
    const form = new formData();
	form.append('image', fs.createReadStream(image));
    if (tile_size !== null) {
	    form.append('tile_size', tile_size);
    }
    if (tile_stride !== null) {
	    form.append('tile_stride', tile_stride);
    }
    if (size_factor !== null) {
	    form.append('size_factor', size_factor);
    }
    if (min_score !== null) {
	    form.append('min_score', min_score);
    }
    if (max_rank !== null) {
	    form.append('max_rank', max_rank);
    }
    if (multi_scale !== null) {
	    form.append('multi_scale', '' + multi_scale); // '' casts booleans to strings, or else Axios complains
    }
	form.append('show_species', 'true');
	form.append('show_genus', 'true');
	form.append('show_family', 'true');
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
		console.error((error.response || {}).data || error);
		// throw error;
	}
}

main();

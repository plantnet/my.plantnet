import axios from 'axios';
import fs from 'fs';
import formData from 'form-data';
import mime from 'mime-types';

const API_KEY = '';

const baseUrl = 'https://my-api.plantnet.org/v2/identify';
const mainFolderPath = '/data/pn-benchmark/images';
const outputFilesPath = '/data/pn-benchmark';
const projects = [ 'all'/*, 'the-plant-list'*/ ];
const resultsLimit = 5;

const results = [];

async function main() {
    const subFolders = fs.readdirSync(mainFolderPath);
    for (const subFolder of subFolders) {
        const subFolderPath = mainFolderPath + '/' + subFolder;
        const stats = fs.statSync(subFolderPath);
        // exclude non-folders
        if (! stats.isDirectory()) continue;
        const expectedSpeciesLowercase = subFolder.replace('_', ' ');
        const files = fs.readdirSync(subFolderPath);
        for (const fileName of files) {
            const filePath = subFolderPath + '/' + fileName;
            // exclude non-images (JPEG / PNG)
            const mimeType = mime.lookup(filePath);
            if (! [ "image/jpeg", "image/png" ].includes(mimeType)) continue;
            for (const project of projects) {
                const url = baseUrl + '/' + project + '?api-key=' + API_KEY;
                const organ = 'auto';
                const resp = await sendPost(url, filePath, organ);
                if (resp) {
                    let isTop1 = false;
                    let isInTop5 = false;
                    let rank = '-';
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
                                if (i == 0) {
                                    isTop1 = (speciesName === expectedSpeciesLowercase);
                                }
                                if (i < 5) {
                                    isInTop5 = isInTop5 || (speciesName === expectedSpeciesLowercase);
                                }
                                if (speciesName === expectedSpeciesLowercase) {
                                    rank = i+1;
                                }
                            }
                            resultsLine = [...resultsLine, ...topN];
                        }
                        resultsLine = [...resultsLineHeader, ...[ isTop1, isInTop5, rank ], ...resultsLine];
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
        }
    }

    // convert to CSV
    let CSVdata = 'subfolder;image;project;is top1;in top5;rank'; // headers
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
		const { status, data } = await axios.post(url, form, {
			cancelToken: source.token,
			headers: form.getHeaders()
		});
		return { status, data };
	} catch (error) {
		console.error(error.response.data || error);
		// throw error;
	}
}

main();

# benchmark / batch processing

How to run Pl@ntNet identification on a set of images, with or without a ground-truth to assess results quality.

## usage

### configuration

Edit the script before running it. You'll find a few adjustable options at the top of the code.

#### API_KEY

Add your API key here

#### mainFolderPath

Absolute path of the main data folder containing images subfolders (no trailing `/`); see "images folder" below

#### outputFilesPath

Folder where to place output files (no trailing `/`)

#### projects

Default value of `[ "all" ]` is acceptable for most cases. Add more projects if you wish to compare results: `[ "all", "the-plant-list", "weurope" ]` ; each image will be identified in every project) 

#### resultsLimit

How many possible determinations will you keep in the output table, for every image (highest scores come first)

#### maxParallelQueries

How many HTTP requests will you make to the Pl@ntNet API at once. Max 10, defaults to 1 (sequential).

#### noReject

Set to true to get plant species results even when top1 result is a reject class (not a plant: animal, object…)

#### includePredictedOrgans

Set to true to add a new `predicted_organs` column to the output file, containing the top1 predicted organ for each submited image, along with the prediction score.


### images folder

Organize your image files in subfolders named after ground truth as show below. Ground truth muth be a binomial name without author, separated by space or underscore. Case does not matter. Subfolders must contain image files in JPEG or PNG format. Image files don't have to be named after ground truth. If a subfolder contains another subfolder (name does not matter), all images contained in the latter will be processed at once, as a multi-image identification request.

```
main_data_folder
|
|__acacia_saligna
|  |__DSC00123.jpeg
|  |__DSC00124.jpeg
|  |__Folder with multiple images
|     |__DSC00145.jpeg
|     |__flower 1.png
|     |__DSC00158.jpeg
|
|__Acer campestre
|  |__Acer_campestre_L._2022-02-18.JPG
|  |__other maple pic.png
|
|__gunnera_tinctoria
|  |__whatever.jpg
|
|__IRIS GERMANICA
|  |__d8614efc6114b6a156a616514e16b151.jpeg
|
…
```

### results
Run code (see below)

Results in CSV format are written to file `./plantnet_benchmark_{date-time}.csv`

## code

### Node.js
[Benchmark script](js/benchmark.js) using Node.js

#### install
`npm install`

#### run

`nodejs benchmark.js`

### R
[Benchmark script](R/benchmark.R) using R

R version **does not** support muti-images queries at the moment. Sub-folders inside species-names sub-folders are ignored.

R version **is not** parallelised at the moment.

#### install
```R
install.packages("httr")
install.packages("wand")
```

#### run

`Rscript benchmark.R`

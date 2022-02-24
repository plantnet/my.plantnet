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

### images folder

Organize your image files in subfolders named after ground truth as show below. Ground truth muth be a binomial name without author, separated by space or underscore. Case does not matter. Subfolders must contain only image files in JPEG or PNG format. Image files don't have to be named after ground truth.

```
main_data_folder
|
|__acacia_saligna
|  |__DSC00123.jpeg
|  |__DSC00124.jpeg
|  |__…
|
|__Acer campestre
|  |__Acer_campestre_L._2022-02-18.JPG
|  |__other maple pic.png
|  |__…
|
|__gunnera_tinctoria
|  |__whatever.jpg
|  |__…
|
|__IRIS GERMANICA
|  |__d8614efc6114b6a156a616514e16b151.jpeg
|  |__…
|
|__…
```

### results
Run code (see below)

Results in CSV format are written to file `./plantnet_benchmark_{date-time}.csv`

## code

### Node.js
[Benchmark script](benchmark/js/benchmark.js) using Node.js

#### install
`npm install`

#### run

`nodejs benchmark.js`

### R
[Benchmark script](benchmark/R/benchmark.R) using R

#### install
```R
install.packages("httr")
install.packages("wand")
```

#### run

`Rscript benchmark.R`

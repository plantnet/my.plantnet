# benchmark / batch processing for multi-species identification

How to run Pl@ntNet multi-species identification on a set of images, with or without a ground-truth to assess results quality.

## usage

### configuration

See "code" section below for how to configure each version of the script

#### API_KEY

Add your API key here

#### mainFolderPath

Absolute path of the main data folder containing images subfolders (no trailing `/`); see "images folder" below

#### outputFilesPath

Folder where to place output files (no trailing `/`)

#### projects

Default value of `[ "best" ]` is acceptable for most cases. Add more projects if you wish to compare results: `[ "k-southwestern-europe", "k-world-flora" ]` ; each image will be identified in every project

### images folder

Organize your image files in subfolders named after ground truth as show below. Ground truth muth be a binomial name without author, separated by space or underscore. Case does not matter. Subfolders must contain image files in JPEG or PNG format. Image files don't have to be named after ground truth.

```
main_data_folder
|
|__acacia_saligna
|  |__DSC00123.jpeg
|  |__DSC00124.jpeg
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

Results in CSV format are written to file `./plantnet_benchmark_survey_{date-time}.csv`

## code

### Node.js
[Benchmark script](js/benchmark-survey.js) using Node.js

#### install
`npm install`

#### configure
`cp env.example.json env.json`
then edit `env.json`

#### run

`nodejs benchmark-survey.js`

# my.plantnet
How to use [my.plantnet API](https://my.plantnet.org/) ?

Two options:
- **GET HTTP request**: for remote images (URLs are required)
- **POST HTTP request**: for local images (local files are required)

## POST requests

### Node.js
[Example](examples/post/js/run.js) of a POST request using Node.js

### Java
[Example](examples/post/Run.java) of a POST request using Java

### PHP
[Example](examples/post/php/run.php) of a POST request using PHP

### Python
[Example](examples/post/run.py) of a POST request using Python

### R
[Example](examples/post/run.R) of a POST request using R

## GET requests

### R
[Example](examples/get/run.R) of a GET request using R

## Web page integration

To integrate Pl@ntNet identification to your Web page, you are greatly encouraged to deploy this ready-to-use component: https://github.com/plantnet/ai-taxonomist-webcomponent

If it does not fit your needs, see below for other ways to integrate Pl@ntNet to your Web page
### HTML / PHP
[Example](examples/web/index.php) of a Web page integration using HTML and PHP

## Benchmark / batch processing
How to run Pl@ntNet identification on a set of images, with or without a ground-truth to assess results quality.

See [benchmark documentation](benchmark/README.md)

### Node.js
[Benchmark script](benchmark/js/benchmark.js) using Node.js

## Third-party libraries

### R
R-package [BiologicalRecordsCentre/plantnet](https://github.com/BiologicalRecordsCentre/plantnet) 

<?php
	// don't forget to run "composer install" first
	require 'vendor/autoload.php';

	$PROJECT = "all"; // try "weurope" or "canada"
	$API_URL = 'https://my-api.plantnet.org/v2/identify/' . $PROJECT . '?api-key=';
	$API_PRIVATE_KEY = 'your-private-api-key-here'; // secret
	$API_SIMSEARCH_OPTION = '&include-related-images=true'; // optional: get most similar images
	$API_LANG = '&lang=fr'; // default: en
	
	$client = new GuzzleHttp\Client();
	$apiRequest = $client->request('POST', $API_URL . $API_PRIVATE_KEY . $API_SIMSEARCH_OPTION . $API_LANG, 
		[
			'multipart' => [
				[
					'name'     => 'images',
					'contents' => fopen('../../data/image_1.jpeg', 'r')
				],
				[
					'name'     => 'images',
					'contents' => fopen('../../data/image_2.jpeg', 'r')
				],
				[
					'name'     => 'organs',
					'contents' => 'flower'
				],
				[
					'name'     => 'organs',
					'contents' => 'leaf'
				]
			]
		]
	);
	$response = json_decode($apiRequest->getBody());

	var_dump($response);
?>

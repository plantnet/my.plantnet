<?php
	// make PHP / CURL compliant with multidimensional arrays
	function curl_setopt_custom_postfields($ch, $postfields, $headers = null) {
		$algos = hash_algos();
		$hashAlgo = null;

		foreach (array('sha1', 'md5') as $preferred) {
			if (in_array($preferred, $algos)) {
				$hashAlgo = $preferred;
				break;
			}
		}

		if ($hashAlgo === null) {
			list($hashAlgo) = $algos;
		}

		$boundary = '----------------------------' . substr(hash(
			$hashAlgo, 'cURL-php-multiple-value-same-key-support' . microtime()
		), 0, 12);

		$body = array();
		$crlf = "\r\n";
		$fields = array();

		foreach ($postfields as $key => $value) {
			if (is_array($value)) {
				foreach ($value as $v) {
					$fields[] = array($key, $v);
				}
			} else {
				$fields[] = array($key, $value);
			}
		}

		foreach ($fields as $field) {
			list($key, $value) = $field;

			if (strpos($value, '@') === 0) {
				preg_match('/^@(.*?)$/', $value, $matches);
				list($dummy, $filename) = $matches;

				$body[] = '--' . $boundary;
				$body[] = 'Content-Disposition: form-data; name="' . $key . '"; filename="' . basename($filename) . '"';
				$body[] = 'Content-Type: application/octet-stream';
				$body[] = '';
				$body[] = file_get_contents($filename);
			} else {
				$body[] = '--' . $boundary;
				$body[] = 'Content-Disposition: form-data; name="' . $key . '"';
				$body[] = '';
				$body[] = $value;
			}
		}

		$body[] = '--' . $boundary . '--';
		$body[] = '';

		$contentType = 'multipart/form-data; boundary=' . $boundary;
		$content = join($crlf, $body);

		$contentLength = strlen($content);

		curl_setopt($ch, CURLOPT_HTTPHEADER, array(
			'Content-Length: ' . $contentLength,
			'Expect: 100-continue',
			'Content-Type: ' . $contentType
		));

		curl_setopt($ch, CURLOPT_POSTFIELDS, $content);
	}

	$API_URL = 'https://my-api.plantnet.org/v2/identify/all?api-key=';
	$API_PRIVATE_KEY = 'your-private-api-key'; // secret
	$API_SIMSEARCH_OPTION = '&include-related-images=true'; // optional: get most similar images
	$API_LANG = '&lang=fr'; // default: en

	$data = array(
		'organs' => array(
			'flower',
			'leaf',
		),
		'images' => array(
			'@../data/image_1.jpeg',
			'@../data/image_2.jpeg'
		)
	);

	$ch = curl_init(); // init cURL session

	// list of probable species
	curl_setopt($ch, CURLOPT_URL, $API_URL . $API_PRIVATE_KEY); // set the required URL

	// list of probable species + most similar images
	// curl_setopt($ch, CURLOPT_URL, $API_URL . $API_PRIVATE_KEY . $API_SIMSEARCH_OPTION);

	// list of probable species + french common names
	// curl_setopt($ch, CURLOPT_URL, $API_URL . $API_PRIVATE_KEY . $API_LANG);

	curl_setopt($ch, CURLOPT_POST, true); // set the HTTP method to POST
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // get a response, rather than print it
	curl_setopt($ch, CURLOPT_SAFE_UPLOAD, false); // allow "@" files management
	curl_setopt_custom_postfields($ch, $data); // set the multidimensional array param
	$response = curl_exec($ch); // execute the cURL session

	curl_close($ch); // close the cURL session

	echo $response;
?>

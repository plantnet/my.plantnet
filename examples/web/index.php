<html>
    <?php
        // CONFIGURATION
        $API_URL = 'https://my-api.plantnet.org/v2/identify/all?api-key=';
        $API_PRIVATE_KEY = ''; // secret
        $API_SIMSEARCH_OPTION = '&include-related-images=true'; // optional: get most similar images
        $API_LANG = '&lang=fr'; // default: en
    ?>
    <head>
        <meta charset="utf-8">
        <title>Example of Pl@ntNet identification service</title>
    </head>

    <body>
        <h1>Pl@ntNet identification</h1>
        <form method="POST" action="index.php" enctype="multipart/form-data">
            <label>Project</label>
            <select name="project">
                <option value="weurope">Western Europe</option>
                <option value="the-plant-list">World flora</option>
                <option value="…">…</option>
            </select>
            <br><br>
            <label>Image</label>
            <input type="file" name="image">
            <br><br>
            <label>Organ</label>
            <select name="organ">
                <option value="flower">Flower</option>
                <option value="leaf">Leaf</option>
                <option value="fruit">Fruit</option>
                <option value="bark">Bark</option>
            </select>
            <br><br>
            <input type="submit" value="Identify !">
        </form>

        <?php
            // var_dump($_POST);
            // var_dump($_FILES);
            $response = false;

            if (
                ! empty($_POST['project'])
                && ! empty($_POST['organ'])
                && ! empty($_FILES['image']['name'])
            ) {
                // ----------- THIS IS A COPY OF examples/post/run.php -------------------

                // make PHP / CURL compliant with multidimensional arrays
                // to be replaced by a simpler and cleaner method with Guzzle or Requests
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

                $data = array(
                    'organs' => array(
                        $_POST['organ']
                    ),
                    'images' => array(
                        '@' . $_FILES['image']['tmp_name']
                    )
                );

                $ch = curl_init(); // init cURL session

                // list of probable species + most similar images
                curl_setopt($ch, CURLOPT_URL, $API_URL . $API_PRIVATE_KEY . $API_SIMSEARCH_OPTION);

                // list of probable species + french common names
                // curl_setopt($ch, CURLOPT_URL, $API_URL . $API_PRIVATE_KEY . $API_LANG);

                curl_setopt($ch, CURLOPT_POST, true); // set the HTTP method to POST
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // get a response, rather than print it
                curl_setopt($ch, CURLOPT_SAFE_UPLOAD, false); // allow "@" files management
                curl_setopt_custom_postfields($ch, $data); // set the multidimensional array param
                $response = curl_exec($ch); // execute the cURL session
                if ($response) {
                    $response = json_decode($response, true);
                }

                curl_close($ch); // close the cURL session
            }
        ?>

        <!-- display identification results if any -->
        <?php
            if ($response && ! empty($response['results'])) {
                $results = array_slice($response['results'], 0, 3); // keep 3 best results
                echo '<h2>Results</h2>';
                echo '(hover images for credits and license)<br><br>';
                foreach($results as $res) {
                    echo '<b>' . $res['score'] . '</b> : <i>' . $res['species']['scientificNameWithoutAuthor'] . ' ' . $res['species']['scientificNameAuthorship'] . '</i>' . ' (' . $res['species']['family']['scientificNameWithoutAuthor'] . ')<br>';
                    foreach ($res['images'] as $img) {
                        echo '<img title="' . $img['license'] . ' - ' . $img['author'] . ' - ' . $img['date']['string'] . '" src="' . $img['url']['s'] . '">';
                    }
                    echo '<br><br>';
                }
            } else {
                echo '<h2>Error</h2>';
                var_dump($response);
            }
        ?>

    </body>

</html>

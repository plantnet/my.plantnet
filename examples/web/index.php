<html>
    <?php
        // don't forget to run "composer install" first
        require 'vendor/autoload.php';

        // CONFIGURATION
        $API_URL = 'https://my-api.plantnet.org/v2/identify/all?api-key=';
        $API_PRIVATE_KEY = 'your-private-api-key-here'; // secret
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

                $client = new GuzzleHttp\Client();
                try {
                    $apiRequest = $client->request('POST', $API_URL . $API_PRIVATE_KEY . $API_SIMSEARCH_OPTION . $API_LANG, 
                        [
                            'multipart' => [
                                [
                                    'name'     => 'images',
                                    'contents' => fopen($_FILES['image']['tmp_name'], 'r')
                                ],
                                [
                                    'name'     => 'organs',
                                    'contents' => $_POST['organ']
                                ]
                            ]
                        ]
                    );
                    $response = json_decode($apiRequest->getBody(), true);
                    if (! empty($response['results'])) {
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
                    }
                } catch (GuzzleHttp\Exception\ClientException $e) {
                    echo '<h2>Error</h2>';
                    echo $e->getResponse()->getBody();
                }
            }
        ?>

        <!-- display identification results if any -->
        <?php
            if ($response) {
               
            }
            ?>

    </body>

</html>

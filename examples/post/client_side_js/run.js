const PROJECT = 'all'; // try 'weurope', 'canada'…
const API_URL = 'https://my-api.plantnet.org/v2/identify/' + PROJECT;

// to make this example work you have to expose your API key and
// authorize your webserver address in "Authorized domains" section
// see https://my.plantnet.org/account/doc#exposekey
const API_KEY = 'your-private-api-key';

const identify = async () => {
    // 1. Get the file from an input type=file : 
    const fileInput = document.getElementById('picture');
    const images = fileInput.files;
    if (images.length === 0) {
        console.error('choose a file');
        return false;
    }

    // 2. Build POST form data
    const form = new FormData();
    for (let i = 0; i < images.length; i += 1) {
        form.append('organs', 'auto');
        form.append('images', images[i]);
    }

    // 3. Add GET URL parameters
    const url = new URL(API_URL);
    url.searchParams.append('include-related-images', 'true'); // try false
    url.searchParams.append('api-key', API_KEY);

    // 4. Send request
    fetch(url.toString(), {
        method: 'POST',
        body: form,
    })
    .then((response) => {
        if (response.ok) {
            response.json()
            .then((r) => {
                document.getElementById('results').innerHTML = JSON.stringify(r);
            })
            .catch(console.error);
        } else {
            const resp = `status: ${response.status} (${response.statusText})`;
            document.getElementById('results').innerHTML = resp;
        }
    })
    .catch((error) => {
        console.error(error);
    });
};

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('myform');
    form.addEventListener('submit', (evt) => {
        evt.preventDefault();
        identify();
    });

});

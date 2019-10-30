package run;

import java.io.File;
import java.io.IOException;

import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.mime.MultipartEntityBuilder;
import org.apache.http.entity.mime.content.FileBody;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.util.EntityUtils;

public class Run {
	private static final String IMAGE1 = "../data/image_1.jpeg";
	private static final String ORGAN1 = "flower";
	private static final String IMAGE2 = "../data/image_2.jpeg";
	private static final String ORGAN2 = "leaf";

	private static final String API_URL = "https://my-api.plantnet.org/v2/identify/all?api-key=";
	private static final String API_PRIVATE_KEY = 'your-private-api-key'; // secret
	private static final String API_SIMSEARCH_OPTION = '&include-related-images=true'; // optional: get most similar images
	private static final String API_LANG = '&lang=fr'; // default: en

	public static void main(String[] args) {
		File file1 = new File(IMAGE1);
		File file2 = new File(IMAGE2);

		HttpEntity entity = MultipartEntityBuilder.create()
			.addPart("images", new FileBody(file1)).addTextBody("organs", ORGAN1)
			.addPart("images", new FileBody(file2)).addTextBody("organs", ORGAN2)
			.build();

		// list of probable species
		HttpPost request = new HttpPost(API_URL + API_PRIVATE_KEY);

		// list of probable species + most similar images
		// HttpPost request = new HttpPost(API_URL + API_PRIVATE_KEY + API_SIMSEARCH_OPTION);

		// list of probable species + french common names
		// HttpPost request = new HttpPost(API_URL + API_PRIVATE_KEY + API_LANG);

		request.setEntity(entity);

		HttpClient client = HttpClientBuilder.create().build();
		HttpResponse response;
		try {
			response = client.execute(request);
			String jsonString = EntityUtils.toString(response.getEntity());
			System.out.println(jsonString);
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
}


API_URL <- "https://my-api.plantnet.org/v2/identify"

key <- "" # Your API key here
project <- "all" # try "weurope" or "canada"

lang <- "fr"
includeRelatedImages <- FALSE # try TRUE

URL <- paste0(API_URL,
        "/", project, "?",
        "lang=", lang,
        "&include-related-images=", includeRelatedImages,
        "&api-key=", key)

image_1 <- "../data/image_1.jpeg"
image_2 <- "../data/image_2.jpeg"

data <- list(
    "images" = httr::upload_file(image_1),
    "images" = httr::upload_file(image_2),
    "organs" = "flower",
    "organs" = "leaf"
)

response <- httr::POST(URL, body=data, encode="multipart")

status <- response$status_code
message(status)

result <- httr::content(response, as = 'parsed')

message(result)

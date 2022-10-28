
API_URL <- "https://my-api.plantnet.org/v2/identify"

key <- "" # Your API key here
project <- "all" # try "weurope" or "canada"

imageURL <- "" # A JPG image URL here
lang <- "fr"
organs <- "flower"
includeRelatedImages <- FALSE # try TRUE

URLencoded <- sapply(imageURL, FUN = URLencode, reserved = TRUE, repeated = TRUE)

URL <- paste0(API_URL,
        "/", project, "?",
        "images=", paste(URLencoded, collapse = "&images="),
        "&organs=", paste(organs, collapse = "&organs="),
        "&lang=", lang,
        "&include-related-images=", includeRelatedImages,
        "&api-key=", key)

message(URL)

# Hit the API
response <- httr::GET(URL)

# Check the status
status <- response$status_code
message(status)

# the status is 200 so let's parse the content of the response
prediction <- httr::content(response, as = 'parsed')

message(prediction)

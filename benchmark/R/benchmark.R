library("wand")
library("httr")

API_KEY <- "" # Your API key here

base_url <- "https://my-api.plantnet.org/v2/identify"
main_folder_path <- "/data/pn-benchmark/images"
output_files_path <- "/data/pn-benchmark"
projects <- list("all")
# projects <- list("all", "the-plant-list")
results_limit <- 5

send_post <- function(url, image, organ = "auto") {
    data <- list(
        "images" = httr::upload_file(image),
        "organs" = organ
    )
    response <- httr::POST(url, body = data, encode = "multipart")
    status <- response$status_code
    result <- httr::content(response, as = "parsed")
    return(list(status, result))
}

results <- list()

sub_folders <- list.dirs(path = main_folder_path, recursive = FALSE)

for (sub_folder in sub_folders) {
    subfolder_name <- tail(strsplit(sub_folder, "/")[[1]], n <- 1)
    expected_species <- tolower(sub("_", " ", subfolder_name))
    print(expected_species)
    files <- list.files(path = sub_folder, full.names = TRUE)
    for (file_path in files) {
        # eclude directories
        if (!dir.exists(file_path)) {
            # exclude non-images (JPEG / PNG)
            mime_type <- wand::get_content_type(file_path)
            if (! mime_type %in% c("image/jpeg", "image/png")) next
            for (project in projects) {
                url <- paste0(base_url, "/", project, "?api-key=", API_KEY)
                organ <- "auto"
                resp <- send_post(url, file_path, organ)
                if (! is.null(resp)) {
                    status <- resp[[1]]
                    data <- resp[[2]]
                    is_top_1 <- FALSE
                    is_in_top_5 <- FALSE
                    rank <- "-"
                    match_score <- "-"
                    file_name <- tail(strsplit(file_path, "/")[[1]], n <- 1)
                    if (status == 200 && is.list(data["results"]) && length(data["results"][[1]]) > 0) {
                        message(sprintf("%s : OK %d", file_name, status))
                        results_line_header <- list(
                            expected_species,
                            file_name,
                            project
                        )
                        results_line <- c()
                        for (i in 1: results_limit) {
                            top_n <- c("-", "-")
                            if (length(data["results"][[1]]) >= i) {
                                res <- data["results"][[1]][i]
                                top_n <- c(
                                    res[[1]]["species"][[1]]["scientificName"],
                                    res[[1]]["score"]
                                )
                                species_name <- tolower(res[[1]]["species"][[1]]["scientificNameWithoutAuthor"])
                                if (i == 1) {
                                    is_top_1 <- (species_name == expected_species)
                                }
                                if (i <= 5) {
                                    is_in_top_5 <- is_in_top_5 || (species_name == expected_species)
                                }
                                if (species_name == expected_species) {
                                    rank <- i
                                    match_score <- res[[1]]["score"]
                                }
                            }
                            results_line <- c(results_line, top_n)
                        }
                        results_line <- c(results_line_header, c(is_top_1, is_in_top_5), c(rank, match_score), results_line)
                        results <- append(results, list(results_line))
                    } else {
                        message(sprintf("%s : NO RESULTS", file_name))
                        results <- append(results, list(list(
                        expected_species,
                        file_name,
                        project,
                        "NO RESULTS"
                        )))
                    }
                } else {
                    message(sprintf("%s : FAILED", file_name))
                    results <- append(results, list(list(
                    expected_species,
                    file_name,
                    project,
                    "FAILED"
                    )))
                }
            }
        }
    }
}

# convert to CSV
csv_data <- "subfolder/ground truth;image;project;is top1;in top5;rank;match score" # headers
for (i in 1: results_limit) {
    csv_data <- paste(csv_data, ";r", i, " name; r", i, " score", sep = "")
}
csv_data <- paste(csv_data, "\n")
for (r in results) {
    csv_data <- paste(csv_data, paste(r, collapse = ";"), "\n", sep = "")
}

# write
date_time <- format(Sys.time(), format = "%Y-%m-%dT%H:%M:%S")
output_file <- paste(output_files_path, "/plantnet_benchmark_", date_time, ".csv", sep = "")
cat(csv_data, file = output_file)
message(sprintf("results written to: %s", output_file))

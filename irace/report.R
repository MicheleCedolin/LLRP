suppressMessages(library(irace))
load("irace.Rdata")
ids <- iraceResults$allElites[[length(iraceResults$allElites)]]
best <- getConfigurationById(iraceResults, ids = ids)
print(best, digits = 5)
write.csv(best, "best_configurations.csv", row.names = FALSE)
cat("\nexperiments used:", iraceResults$state$experimentsUsedSoFar, "\n")
cat("iterations:", length(iraceResults$allElites), "\n")

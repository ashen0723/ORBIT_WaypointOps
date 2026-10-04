-- Record the Loader acknowledgement after a Dispatcher resolves an issue.
ALTER TABLE "LoadingIssue"
ADD COLUMN "acknowledgedById" TEXT,
ADD COLUMN "acknowledgedAt" TIMESTAMP(3);

-- Preserve an object/file reference for optional Loader issue evidence.
ALTER TABLE "LoadingIssue" ADD COLUMN "evidenceRef" TEXT;

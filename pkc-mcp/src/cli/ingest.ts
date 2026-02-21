import { ingestPaths } from "../ingest.js";

const inputs = process.argv.slice(2);
if (!inputs.length) {
  console.error("Usage: npm run ingest -- \"docs/**/*.md\"");
  process.exit(1);
}

const result = await ingestPaths(inputs);
console.log(`Ingested ${result.files} files, ${result.chunks} chunks`);

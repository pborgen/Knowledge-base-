import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ingestPaths } from "./ingest.js";
import { retrieve, answerWithCitations } from "./retrieve.js";
const server = new McpServer({
    name: "personal-knowledge-copilot",
    version: "0.1.0"
});
server.tool("ingest_documents", "Ingest local documents into vector store", { paths: z.array(z.string()).min(1) }, async ({ paths }) => {
    const result = await ingestPaths(paths);
    return {
        content: [{ type: "text", text: `Ingested ${result.files} files into ${result.chunks} chunks.` }]
    };
});
server.tool("search_knowledge", "Search indexed knowledge base", { query: z.string().min(1), topK: z.number().int().min(1).max(20).optional() }, async ({ query, topK = 5 }) => {
    const hits = await retrieve(query, topK);
    return {
        content: [{ type: "text", text: JSON.stringify(hits, null, 2) }]
    };
});
server.tool("answer_with_citations", "Answer using retrieved chunks with source citations", { question: z.string().min(1), topK: z.number().int().min(1).max(20).optional() }, async ({ question, topK = 5 }) => {
    const text = await answerWithCitations(question, topK);
    return { content: [{ type: "text", text }] };
});
const transport = new StdioServerTransport();
await server.connect(transport);

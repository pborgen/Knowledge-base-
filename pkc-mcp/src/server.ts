import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ingestPaths } from "./ingest.js";
import { retrieve, answerWithCitations } from "./retrieve.js";

const server = new McpServer({
  name: "personal-knowledge-copilot",
  version: "0.2.0"
});

const filterSchema = z
  .object({
    sourceType: z.enum(["file", "google_doc", "text"]).optional(),
    owner: z.string().optional(),
    tags: z.array(z.string()).optional()
  })
  .optional();

server.tool(
  "ingest_documents",
  "Ingest local documents into vector store",
  { paths: z.array(z.string()).min(1), owner: z.string().optional() },
  async ({ paths, owner = "local" }) => {
    const result = await ingestPaths(paths, owner);
    return {
      content: [{ type: "text", text: `Ingested ${result.files} files into ${result.chunks} chunks.` }]
    };
  }
);

server.tool(
  "search_knowledge",
  "Search indexed knowledge base",
  { query: z.string().min(1), topK: z.number().int().min(1).max(20).optional(), filters: filterSchema },
  async ({ query, topK = 5, filters }) => {
    const hits = await retrieve(query, topK, filters);
    return {
      content: [{ type: "text", text: JSON.stringify(hits, null, 2) }]
    };
  }
);

server.tool(
  "answer_with_citations",
  "Answer using retrieved chunks with source citations",
  { question: z.string().min(1), topK: z.number().int().min(1).max(20).optional(), filters: filterSchema },
  async ({ question, topK = 5, filters }) => {
    const text = await answerWithCitations(question, topK, filters);
    return { content: [{ type: "text", text }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

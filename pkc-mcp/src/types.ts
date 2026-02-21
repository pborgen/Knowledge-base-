export type IngestMetadata = {
  source: string;
  sourceType?: "file" | "google_doc" | "text";
  owner?: string;
  tags?: string[];
  hash: string;
  docId: string;
  spaceId?: string;
  visibility?: "private" | "shared" | "public";
  allowedEmails?: string[];
};

export type SearchFilters = {
  sourceType?: "file" | "google_doc" | "text";
  owner?: string;
  tags?: string[];
  spaceId?: string;
  requesterEmail?: string;
};

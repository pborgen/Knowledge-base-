import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { config } from "./config.js";

const verifier = new OAuth2Client(config.googleClientId || undefined);

export async function verifyGoogleIdToken(idToken: string) {
  const ticket = await verifier.verifyIdToken({
    idToken,
    audience: config.googleClientId || undefined
  });
  const payload = ticket.getPayload();
  if (!payload?.email) throw new Error("Invalid Google token");
  return {
    email: payload.email,
    name: payload.name ?? payload.email
  };
}

export async function fetchGoogleDocText(accessToken: string, docId: string): Promise<string> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const docs = google.docs({ version: "v1", auth });
  const res = await docs.documents.get({ documentId: docId });

  const body = res.data.body?.content ?? [];
  const out: string[] = [];
  for (const item of body) {
    const p = item.paragraph;
    if (!p?.elements) continue;
    for (const el of p.elements) {
      const t = el.textRun?.content;
      if (t) out.push(t);
    }
  }
  return out.join("").trim();
}

export function extractGoogleDocId(urlOrId: string): string {
  const m = urlOrId.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  return m?.[1] ?? urlOrId;
}

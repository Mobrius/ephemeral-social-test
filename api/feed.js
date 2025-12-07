// api/feed.js

const OWNER = process.env.GITHUB_OWNER || "Mobrius";
const REPO = process.env.GITHUB_REPO || "ephemeral-social-test";
const TOKEN = process.env.GITHUB_TOKEN; // lo stesso che usi per new-post

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues?state=open&per_page=100&sort=created&direction=desc`;

    const headers = {
      "Accept": "application/vnd.github+json",
      "User-Agent": "ephemeral-social",
    };

    if (TOKEN) {
      headers["Authorization"] = `Bearer ${TOKEN}`;
    }

    const ghRes = await fetch(url, { headers });
    const text = await ghRes.text(); // può essere errore o json

    res.status(ghRes.status).setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (err) {
    console.error("Error in /api/feed:", err);
    res.status(500).json({ error: "Internal error fetching issues" });
  }
}

// api/new-post.js
// Vercel Serverless Function (Node.js)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { title, body, labels } = req.body || {};

  if (!title || !body) {
    return res.status(400).json({ error: "Missing title or body" });
  }

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  if (!owner || !repo || !token) {
    return res.status(500).json({
      error: "Server not configured. Missing GITHUB_OWNER/REPO/TOKEN env vars.",
    });
  }

  const finalLabels = Array.isArray(labels)
    ? labels.filter((l) => typeof l === "string" && l.trim().length > 0)
    : [];

  // Aggiungi una label di sistema
  finalLabels.push("es-post");

  const payload = {
    title,
    body,
    labels: finalLabels,
  };

  try {
    const ghRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "ephemeral-social-open-edition",
          Accept: "application/vnd.github+json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!ghRes.ok) {
      const text = await ghRes.text();
      console.error("GitHub API error:", text);
      return res.status(ghRes.status).send(text);
    }

    const data = await ghRes.json();
    return res.status(201).json({ ok: true, issueNumber: data.number });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

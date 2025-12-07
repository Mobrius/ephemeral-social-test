// api/cleanup.js
//
// Pulisce i post "vecchi" in base alle variabili ambiente.
//
// Env:
//   GITHUB_OWNER  (es. "Mobrius")
//   GITHUB_REPO   (es. "ephemeral-social-test")
//   GITHUB_TOKEN  (token con permesso "public_repo")
//   CLEAN         = "ON" / "OFF"   (default "ON")
//   CLEAN_MODE    = "CLOSE" / "DELETE" (default "CLOSE")
//   CLEAN_TIMER   = ore, es. "48"  (default 48)

const OWNER = process.env.GITHUB_OWNER || "Mobrius";
const REPO = process.env.GITHUB_REPO || "ephemeral-social-test";
const TOKEN = process.env.GITHUB_TOKEN;

const CLEAN = (process.env.CLEAN || "ON").toUpperCase();
const CLEAN_MODE = (process.env.CLEAN_MODE || "CLOSE").toUpperCase();
const CLEAN_TIMER_HOURS = parseInt(process.env.CLEAN_TIMER || "48", 10) || 48;

// per sicurezza, limitiamo i post ripuliti per singola run
const MAX_ISSUES_PER_RUN = 30;

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (CLEAN !== "ON") {
    return res.status(200).json({ status: "disabled", CLEAN });
  }

  if (!TOKEN) {
    return res.status(500).json({ error: "Missing GITHUB_TOKEN env" });
  }

  try {
    const now = Date.now();
    const cutoffMs = CLEAN_TIMER_HOURS * 60 * 60 * 1000;
    const cutoffTime = new Date(now - cutoffMs);

    // Prendiamo fino a 100 issue (state=all per vedere anche le chiuse)
    const listUrl = `https://api.github.com/repos/${OWNER}/${REPO}/issues?state=all&per_page=100&sort=created&direction=asc`;

    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "ephemeral-social-cleaner",
      Authorization: `Bearer ${TOKEN}`,
    };

    const listRes = await fetch(listUrl, { headers });
    if (!listRes.ok) {
      const txt = await listRes.text();
      return res
        .status(listRes.status)
        .json({ error: "Error listing issues from GitHub", details: txt });
    }

    const issues = await listRes.json();

    // Filtra solo "vere" issue, non PR, più vecchie del cutoff
    const oldIssues = issues.filter((iss) => {
      if (iss.pull_request) return false;
      const created = new Date(iss.created_at);
      return created < cutoffTime;
    });

    const toProcess = oldIssues.slice(0, MAX_ISSUES_PER_RUN);

    const results = [];

    for (const issue of toProcess) {
      const issueUrl = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${issue.number}`;

      if (CLEAN_MODE === "CLOSE") {
        // Solo chiusura (lo togliamo dal feed che mostra solo "open")
        const body = JSON.stringify({ state: "closed" });
        const r = await fetch(issueUrl, {
          method: "PATCH",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body,
        });
        results.push({
          number: issue.number,
          action: "closed",
          status: r.status,
        });
      } else if (CLEAN_MODE === "DELETE") {
        // "DELETE" simulato: chiudiamo e scrub del contenuto
        const body = JSON.stringify({
          state: "closed",
          title: `[expired] #${issue.number}`,
          body:
            "_This post has expired and its content has been removed by Ephemeral Social cleanup._",
          // opzionale: aggiungi una label "expired"
          labels: [
            ...new Set(
              (issue.labels || []).map((l) => l.name || "").filter(Boolean)
            ),
            "expired",
          ],
        });

        const r = await fetch(issueUrl, {
          method: "PATCH",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body,
        });

        results.push({
          number: issue.number,
          action: "scrubbed",
          status: r.status,
        });
      } else {
        // modalità sconosciuta: non facciamo niente
        results.push({
          number: issue.number,
          action: "skipped_unknown_mode",
          status: 0,
        });
      }
    }

    return res.status(200).json({
      status: "ok",
      mode: CLEAN_MODE,
      cutoff: cutoffTime.toISOString(),
      processed: results.length,
      details: results,
    });
  } catch (err) {
    console.error("Error in /api/cleanup:", err);
    return res.status(500).json({ error: "Internal error in cleanup" });
  }
}

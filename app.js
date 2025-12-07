// ====== CONFIGURAZIONE ======
// Cambia questi valori con i tuoi
const GITHUB_OWNER = "Mobrius";
const GITHUB_REPO = "ephemeral-social-test"; // o il nome del repo
const MAX_POSTS_CLIENT = 50; // quanti post mostrare al massimo nel feed

// ====== UTIL ======
const interestsKey = "es_interests_v1";

const defaultTopics = [
  "ai",
  "freedom",
  "school",
  "coding",
  "art",
  "politics",
  "science",
  "games",
];

function getLocalInterests() {
  try {
    const raw = localStorage.getItem(interestsKey);
    if (!raw) {
      const base = {};
      defaultTopics.forEach((t) => (base[t] = 0.0));
      return base;
    }
    return JSON.parse(raw);
  } catch {
    const base = {};
    defaultTopics.forEach((t) => (base[t] = 0.0));
    return base;
  }
}

function setLocalInterests(map) {
  localStorage.setItem(interestsKey, JSON.stringify(map));
}

function extractTopicsFromLabels(labels) {
  // label names come from GitHub issue labels
  return labels
    .map((l) => l.name || l)
    .map((n) => n.toLowerCase())
    .filter((n) => !n.startsWith("meta:")); // puoi usare label meta se vuoi
}

function relevanceScoreForIssue(issue, interests) {
  const topics = extractTopicsFromLabels(issue.labels || []);
  if (!topics.length) return 0;

  let sum = 0;
  let count = 0;
  topics.forEach((t) => {
    if (interests[t] !== undefined) {
      sum += interests[t];
      count++;
    }
  });
  if (!count) return 0;
  return sum / count;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString();
}

// ====== UI: interessi ======
function renderInterestsChips() {
  const interests = getLocalInterests();
  const container = document.getElementById("interestsChips");
  container.innerHTML = "";

  const allTopics = new Set(defaultTopics);
  // potremmo aggiungere in futuro topics dinamici dalle issue

  allTopics.forEach((topic) => {
    if (interests[topic] === undefined) {
      interests[topic] = 0.0;
    }
  });

  Object.entries(interests).forEach(([topic, weight]) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "es-chip" + (weight > 0 ? " es-chip--active" : "");
    chip.textContent = topic;
    chip.addEventListener("click", () => {
      const newWeight = weight > 0 ? 0 : 1.0;
      interests[topic] = newWeight;
      setLocalInterests(interests);
      renderInterestsChips();
      loadFeed(); // ricalcola ordinamento
    });
    container.appendChild(chip);
  });
}

// ====== API: lettura issue ======
async function fetchIssues() {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=open&per_page=100&sort=created&direction=desc`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Error fetching issues from GitHub");
  }
  const data = await res.json();
  // Filtra solo "issue vere" e non PR (di solito hanno field pull_request)
  return data.filter((item) => !item.pull_request);
}

// ====== FEED ======
async function loadFeed() {
  const feedEl = document.getElementById("feed");
  const infoEl = document.getElementById("feedInfo");
  feedEl.innerHTML = "<p class='es-help-text'>Loading feed...</p>";

  try {
    const issues = await fetchIssues();
    const interests = getLocalInterests();

    // Calcola score e ordina
    const scored = issues.map((iss) => ({
      issue: iss,
      score: relevanceScoreForIssue(iss, interests),
    }));

    scored.sort((a, b) => {
      // prima per score, poi per data
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.issue.created_at) - new Date(a.issue.created_at);
    });

    const limited = scored.slice(0, MAX_POSTS_CLIENT);

    feedEl.innerHTML = "";
    limited.forEach(({ issue, score }) => {
      const postEl = document.createElement("article");
      postEl.className = "es-post";

      const header = document.createElement("div");
      header.className = "es-post-header";
      header.innerHTML = `
        <span>@${issue.user.login}</span>
        <span>${formatDate(issue.created_at)}</span>
      `;

      const title = document.createElement("div");
      title.className = "es-post-title";
      title.textContent = issue.title || "(no title)";

      const body = document.createElement("div");
      body.className = "es-post-body";
      body.textContent = issue.body || "";

      const tagsWrap = document.createElement("div");
      tagsWrap.className = "es-post-tags";

      const topics = extractTopicsFromLabels(issue.labels || []);
      topics.forEach((t) => {
        const span = document.createElement("span");
        const active = interests[t] > 0;
        span.className = "es-tag-pill" + (active ? " es-tag-pill--match" : "");
        span.textContent = "#" + t;
        tagsWrap.appendChild(span);
      });

      // Se vuoi mostrare lo score:
      if (topics.length) {
        const scoreSpan = document.createElement("span");
        scoreSpan.className = "es-tag-pill";
        scoreSpan.textContent = `score: ${score.toFixed(2)}`;
        tagsWrap.appendChild(scoreSpan);
      }

      postEl.appendChild(header);
      postEl.appendChild(title);
      postEl.appendChild(body);
      if (topics.length) postEl.appendChild(tagsWrap);

      feedEl.appendChild(postEl);
    });

    infoEl.textContent = `Showing ${limited.length} posts · source: GitHub Issues (${issues.length} open)`;
  } catch (err) {
    console.error(err);
    feedEl.innerHTML = `<p class="es-help-text">Error loading feed. Please try again later.</p>`;
    infoEl.textContent = "";
  }
}

// ====== PUBBLICAZIONE POST ======
async function publishPost() {
  const titleInput = document.getElementById("postTitle");
  const bodyInput = document.getElementById("postBody");
  const tagsInput = document.getElementById("postTags");
  const statusEl = document.getElementById("publishStatus");

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();
  const tags = tagsInput.value
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);

  if (!title || !body) {
    statusEl.textContent = "Please write a title and a text.";
    statusEl.className = "es-status es-status--err";
    return;
  }

  statusEl.textContent = "Publishing...";
  statusEl.className = "es-status";

  try {
    const res = await fetch("/api/new-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, labels: tags }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Error from API");
    }

    statusEl.textContent = "Post published! It will appear in the feed soon.";
    statusEl.className = "es-status es-status--ok";
    titleInput.value = "";
    bodyInput.value = "";
    tagsInput.value = "";

    // Ricarica feed dopo un attimo
    setTimeout(loadFeed, 1000);
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Error publishing. Please try again.";
    statusEl.className = "es-status es-status--err";
  }
}

// ====== INIT ======
window.addEventListener("DOMContentLoaded", () => {
  renderInterestsChips();
  loadFeed();

  document.getElementById("publishBtn").addEventListener("click", publishPost);

  document.getElementById("refreshFeedBtn").addEventListener("click", loadFeed);

  document.getElementById("newPostBtn").addEventListener("click", () => {
    document.getElementById("postTitle").focus();
  });

  // Aggiorna automaticamente il feed ogni 20 secondi
  setInterval(() => {
    loadFeed();
  }, 10000);

});

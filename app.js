// ====== CONFIGURAZIONE ======
// Cambia questi valori con i tuoi
const GITHUB_OWNER = "Mobrius";
const GITHUB_REPO = "ephemeral-social-test"; // o il nome del repo
const MAX_POSTS_CLIENT = 50; // quanti post mostrare al massimo nel feed

// ====== THEME (classic / military) ======
const THEME_KEY = "es_theme_v1";

function applyTheme(theme) {
  const body = document.body;
  if (theme === "military") {
    body.classList.add("military");
  } else {
    body.classList.remove("military");
  }

  const btn = document.getElementById("themeToggleBtn");
  if (btn) {
    btn.textContent = theme === "military" ? "Theme: Ops" : "Theme: Classic";
  }
}

function initTheme() {
  let theme = localStorage.getItem(THEME_KEY);
  if (theme !== "military" && theme !== "classic") {
    theme = "classic";
  }
  applyTheme(theme);
}

function toggleTheme() {
  const isMilitary = document.body.classList.contains("military");
  const next = isMilitary ? "classic" : "military";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

// ====== AUTHOR ID LOCALE ======
const AUTHOR_ID_KEY = "es_author_id_v1";

function getOrCreateAuthorId() {
  let id = localStorage.getItem(AUTHOR_ID_KEY);
  if (!id) {
    // crea ID tipo esuser-8f3a29c1
    const rand =
      Math.random().toString(36).substring(2, 8) +
      Math.random().toString(36).substring(2, 6);
    id = "esuser-" + rand;
    localStorage.setItem(AUTHOR_ID_KEY, id);
  }
  return id;
}

// Estrarre l'author id dal body del post, es. [es-author]:esuser-xxxx
function extractAuthorIdFromBody(body) {
  if (!body) return null;
  const match = body.match(/\[es-author\]:(\S+)/);
  return match ? match[1].trim() : null;
}

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
  if (!container) return;
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
  if (!feedEl) return;

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

      const rawBody = issue.body || "";
      const authorId = extractAuthorIdFromBody(rawBody);

      const header = document.createElement("div");
      header.className = "es-post-header";

      const leftSpan = document.createElement("span");
      // Se abbiamo un authorId, usiamo quello, altrimenti fallback a @github_user
      leftSpan.textContent = authorId ? authorId : `@${issue.user.login}`;

      const rightSpan = document.createElement("span");
      rightSpan.textContent = formatDate(issue.created_at);

      header.appendChild(leftSpan);
      header.appendChild(rightSpan);

      const title = document.createElement("div");
      title.className = "es-post-title";
      title.textContent = issue.title || "(no title)";

      const bodyEl = document.createElement("div");
      bodyEl.className = "es-post-body";

      // Mostriamo il body SENZA la riga tecnica [es-author]:... e la firma
      const cleanedBody = rawBody
        .replace(/\[es-author\]:\S+/, "")
        .replace(/\n?_Posted via Ephemeral Social_/, "")
        .trim();
      bodyEl.textContent = cleanedBody;

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
      postEl.appendChild(bodyEl);
      if (topics.length) postEl.appendChild(tagsWrap);

      feedEl.appendChild(postEl);
    });

    if (infoEl) {
      infoEl.textContent = `Showing ${limited.length} posts · source: GitHub Issues (${issues.length} open)`;
    }
  } catch (err) {
    console.error(err);
    feedEl.innerHTML = `<p class="es-help-text">Error loading feed. Please try again later.</p>`;
    if (infoEl) infoEl.textContent = "";
  }
}

// ====== COMPOSER (overlay stile X) ======
function openComposer() {
  const overlay = document.getElementById("composerOverlay");
  if (!overlay) return;
  overlay.classList.remove("es-hidden");

  const titleInput = document.getElementById("postTitle");
  if (titleInput) {
    setTimeout(() => titleInput.focus(), 10);
  }

  const statusEl = document.getElementById("publishStatus");
  if (statusEl) {
    statusEl.textContent = "";
    statusEl.className = "es-status";
  }
}

function closeComposer() {
  const overlay = document.getElementById("composerOverlay");
  if (!overlay) return;
  overlay.classList.add("es-hidden");
}

// ====== PUBBLICAZIONE POST ======
async function publishPost() {
  const titleInput = document.getElementById("postTitle");
  const bodyInput = document.getElementById("postBody");
  const tagsInput = document.getElementById("postTags");
  const statusEl = document.getElementById("publishStatus");

  if (!titleInput || !bodyInput || !tagsInput || !statusEl) return;

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

  const authorId = getOrCreateAuthorId();

  // Corpo che andrà nell'issue
  let fullBody = body;

  if (tags.length) {
    fullBody += "\n\n---\nTags: " + tags.map((t) => `#${t}`).join(" ");
  }

  // Riga tecnica per identificare l'autore
  fullBody += `\n\n[es-author]:${authorId}`;
  fullBody += "\n_Posted via Ephemeral Social_";

  statusEl.textContent = "Publishing...";
  statusEl.className = "es-status";

  try {
    const res = await fetch("/api/new-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body: fullBody, labels: tags }),
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

    // chiudi il composer dopo il publish
    closeComposer();

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
  // Tema
  initTheme();
  const themeBtn = document.getElementById("themeToggleBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", toggleTheme);
  }

  // Interessi + feed
  renderInterestsChips();
  loadFeed();

  // Mostra il tuo Author ID
  const myAuthorId = getOrCreateAuthorId();
  const badge = document.getElementById("authorIdBadge");
  if (badge) {
    badge.textContent = `Your ID: ${myAuthorId}`;
  }

  const publishBtn = document.getElementById("publishBtn");
  if (publishBtn) {
    publishBtn.addEventListener("click", publishPost);
  }

  const newPostBtn = document.getElementById("newPostBtn");
  if (newPostBtn) {
    newPostBtn.addEventListener("click", openComposer);
  }

  const fabNewPost = document.getElementById("fabNewPost");
  if (fabNewPost) {
    fabNewPost.addEventListener("click", openComposer);
  }

  const fabRefresh = document.getElementById("fabRefresh");
  if (fabRefresh) {
    fabRefresh.addEventListener("click", loadFeed);
  }

  const closeComposerBtn = document.getElementById("closeComposerBtn");
  if (closeComposerBtn) {
    closeComposerBtn.addEventListener("click", closeComposer);
  }

  const overlay = document.getElementById("composerOverlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      // chiudi se clicchi fuori dal box
      if (e.target === overlay) {
        closeComposer();
      }
    });
  }

  // Aggiorna automaticamente il feed ogni 10 secondi
  setInterval(() => {
    loadFeed();
  }, 10000);
});

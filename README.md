# **Ephemeral Social**

### **A lightweight, ephemeral, forkable social network powered entirely by GitHub Issues**

#### ⚡ No database · 🧩 No backend server · 🌍 100% open source · 🫥 Posts disappear over time

<br>

<img src="https://img.shields.io/badge/status-active-brightgreen" />
<img src="https://img.shields.io/badge/license-MIT-blue" />
<img src="https://img.shields.io/badge/backend-GitHub%20Issues-black" />
<img src="https://img.shields.io/badge/hosting-Vercel-black" />

</div>

---

## 🎯 **What is Ephemeral Social?**

**Ephemeral Social** is a tiny, privacy-friendly social network where posts are intentionally *not permanent*.
It is designed to be:

* **Ephemeral** — posts automatically disappear after a configurable lifetime
* **Forkable** — anyone can create their own instance in minutes
* **Serverless** — everything runs via GitHub Issues + Vercel Functions
* **Open source** — fully transparent, fully modifiable
* **Lightweight** — ideal for communities, classrooms, hacks, or experimentation

No login required, no endless archive, no algorithmic addiction — just short-lived thoughts flowing through a minimal, elegant interface.

---

## ✨ **Key Features**

### 🔹 **Anonymous persistent user identity**

Each visitor gets a unique local ID (e.g., `esuser-83ba4f1d`) stored in localStorage.
Posts appear under that ID instead of the user’s GitHub account.

### 🔹 **Ephemeral posts with automatic cleanup**

Posts older than a defined age are **closed** or **deleted**, depending on your settings.

Environment-controlled logic:

```env
CLEAN=ON
CLEAN_MODE=DELETE   # or CLOSE
CLEAN_TIMER=48       # hours
```

The system guarantees:

* no young posts are ever removed,
* minimal API calls (client-side throttling),
* deterministic behavior.

### 🔹 **Smart client-side interest scoring**

Users select topics they care about → feed automatically orders posts by relevance.

### 🔹 **Modern mobile-first UX**

* Floating Action Button (FAB) for new posts
* FAB for feed refresh
* Full-screen composer overlay
* Smooth feed update (no flicker)
* Optional **Military Green Theme** for a tactical guerrilla-style interface

### 🔹 **Zero database — the feed is literally GitHub Issues**

Each post = an Issue
Tags = Labels
Backend = GitHub API
Everything transparent and auditable.

### 🔹 **Easily brandable**

Custom colors, logos, themes, and domain are trivial to customize.
Ideal for schools, companies, communities, activists, or friends.

---

## 🧩 **Architecture Overview**

```
Frontend (Vercel / GitHub Pages)
↓
app.js (local identity + feed logic + composer + interest engine)
↓
GitHub Issues API (public_repo token)
↓
Vercel Serverless Functions (new-post, cleanup)
```

No servers, no databases, no vendor lock-in.

---

## 🚀 **Deploy Your Own Instance**

### 1️⃣ Fork this repository

```
https://github.com/Mobrius/ephemeral-social
```

### 2️⃣ Create a dedicated GitHub repository to store your posts

Your social network’s feed will live inside **Issues** of this repo.

Then set these constants in `app.js`:

```js
const GITHUB_OWNER = "your-username";
const GITHUB_REPO  = "your-posts-repo";
```

### 3️⃣ Deploy on Vercel

Press:

**“Deploy” → Import GitHub Repo → Add Environment Variables**

### 4️⃣ Add required environment variables on Vercel

| Variable       | Type   | Example       | Description                                 |
| -------------- | ------ | ------------- | ------------------------------------------- |
| `GITHUB_TOKEN` | secret | ghp_abc123... | Must have `public_repo` permission          |
| `CLEAN`        | string | ON            | Enables automatic post cleanup              |
| `CLEAN_MODE`   | string | CLOSE/DELETE  | CLOSE keeps history, DELETE removes content |
| `CLEAN_TIMER`  | number | 48            | Number of hours before posts expire         |

### 5️⃣ Visit your new social network

Enjoy the experience — or customize it endlessly.

---

## 🌿 **Optional Themes**

### 🎨 Default Dark Theme

Clean, minimal, modern.

### 🪖 Military Green Theme

A tactical, guerrilla-inspired UI variant.

To enable manually:

```html
<link rel="stylesheet" href="style-military.css">
```

Or use the built-in theme switcher in the footer.

---

## 🧹 Automatic Cleanup Logic

Cleanup is triggered by:

* Client-side call every **CLEAN_TIMER hours**, per browser
* Server-side filtering strictly removes **only posts older** than CLEAN_TIMER

This means:

✔ No risk of deleting younger posts
✔ Minimal API usage
✔ No need for Cron jobs
✔ Distributed cleanup — effortless scalability

---

## 🖥️ **Tech Stack**

* **Frontend** → Vanilla JS + CSS + Vercel static hosting
* **Backend** → Vercel Serverless Functions
* **Database** → GitHub Issues
* **Auth** → Anonymous local identity (no GitHub login required)

---

## 🧩 Folder Structure

```
/
├── index.html
├── style.css
├── style-military.css
├── app.js
└── api/
    ├── new-post.js
    └── cleanup.js
```

---

## 🤝 Contributing

Contributions are welcome!
Open an Issue or submit a PR — this project thrives on community forks and experimentation.

---

## 🧑‍💼 Custom-Branded Versions (Pro)

For custom-branded or commercial instances:

👉 Open a discussion here:  
https://github.com/Mobrius/ephemeral-social/discussions

---

## 📜 License

MIT — free to use, free to modify, free to fork.

---

## 🧭 Final Notes

Ephemeral Social was created to explore a *different* kind of social network:
one that values **impermanence**, **simplicity**, and **transparency** over engagement farming.

You are free to fork it, break it, remix it, or build entire new ecosystems on top of it.

> “Nothing on the internet should last forever — except open source.”

---

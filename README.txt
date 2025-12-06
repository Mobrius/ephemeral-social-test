Ephemeral Social – Open Edition

Ephemeral Social is a lightweight, ephemeral, forkable mini-social
network built entirely on GitHub Issues as a decentralized-like post
database. No backend databases, no tracking, no user analytics — just
open source code + GitHub API + Vercel serverless.

FEATURES - Uses GitHub Issues as posts - Serverless API for creating
posts - Fully open source and forkable - Ephemeral feed (only shows
latest posts) - Local preferences for interest-based ranking - Zero
profiling, zero permanent archives

HOW IT WORKS - Users publish posts through a serverless API that creates
GitHub Issues - The frontend fetches Issues from the repo using GitHub
public API - The feed is sorted locally by user interests saved in
localStorage - Everything is hosted on Vercel using this same repository

QUICK DEPLOYMENT 1. Fork this repository on GitHub 2. Create a GitHub
Personal Access Token (PAT) with permission to create issues 3. Import
the repo into Vercel for automatic deployment 4. Add these environment
variables in Vercel: - GITHUB_OWNER → your GitHub username - GITHUB_REPO
→ repository name - GITHUB_TOKEN → your PAT 5. Edit app.js and
index.html with your repo/user info 6. Deploy and enjoy your own
Ephemeral Social instance

CUSTOM INSTANCES If you need a personalized branded version (logo,
domain, custom styling, added features, moderation tools), contact the
creator for professional setup and integration.

LICENSE See LICENSE.txt for details.

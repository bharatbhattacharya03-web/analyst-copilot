# Analyst Copilot

An AI chat assistant + resume match scorer + LinkedIn job search launcher, built for Business Analyst, Data Analyst, and Risk Analyst job seekers.

Note on LinkedIn: LinkedIn does not allow scraping or automated search access without an official data partnership. This app does **not** scrape LinkedIn — instead it builds correct, direct LinkedIn job-search URLs (role, location, remote filter) and opens them in a new tab, which is fully within LinkedIn's normal usage.

## Features

- **Job search launcher** — pick Business Analyst / Data Analyst / Risk Analyst, add a location and remote filter, and open a live LinkedIn search in one tap.
- **Resume match score** — upload a PDF resume, pick a target role (optionally paste a job description), get an AI-generated 0–100 fit score with strengths, gaps, and keywords to add.
- **Chat** — ask career, resume, or interview-prep questions specific to analyst roles.
- Mobile-friendly, single Node.js service, ready to deploy on Render's free tier.

## 1. Run locally

Requires Node.js 18+.

```bash
npm install
cp .env.example .env
npm start

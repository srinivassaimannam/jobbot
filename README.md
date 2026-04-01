# JobBot — Standalone Web App

Your personal job search assistant for LinkedIn, Indeed & Naukri.

## What it does
- Auto-searches jobs on page load using your saved profile
- Filters by experience level, job type, platform, remote
- One-click Apply Now button for each job
- Star/save jobs and track application status
- All settings saved in your browser — no account needed

---

## Deploy to Vercel (Free) — Step by Step

### Step 1 — Create a GitHub account (if you don't have one)
Go to https://github.com and sign up for free.

### Step 2 — Create a new repository
1. Click the **+** button (top right) → **New repository**
2. Name it: `jobbot`
3. Set to **Public**
4. Click **Create repository**

### Step 3 — Upload the files
1. On your new repo page, click **uploading an existing file**
2. Drag and drop ALL 4 files:
   - `index.html`
   - `style.css`
   - `app.js`
   - `vercel.json`
3. Click **Commit changes**

### Step 4 — Deploy on Vercel
1. Go to https://vercel.com and sign up with your GitHub account
2. Click **Add New Project**
3. Select your `jobbot` repository
4. Click **Deploy** (no settings to change)
5. In ~30 seconds, Vercel gives you a URL like: `https://jobbot-yourname.vercel.app`

### Step 5 — Open your app!
Visit your Vercel URL. You'll see the setup screen:
1. Enter your name, role, skills, location
2. Paste your RapidAPI key (from https://rapidapi.com → JSearch → free tier)
3. Click **Save & Start searching**

That's it! Next time you open the URL, it auto-searches immediately.

---

## Getting your free RapidAPI key
1. Go to https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
2. Sign up free (no credit card)
3. Click **Subscribe to Test** → select **Basic (Free)** plan
4. Your key appears at the top as `X-RapidAPI-Key`
5. Copy and paste it into the app setup

Free tier = 200 searches/month (more than enough for daily use)

---

## Bookmark it!
Once deployed, bookmark the Vercel URL on your phone and desktop.
Every time you open it, jobs auto-load for your target role instantly.

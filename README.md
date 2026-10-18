# Velaris in Winter — study journal

A winter-night study planner with your full UGC NET JRF plan (18 Oct → 16 Dec 2026) built in. Tick tasks with a hand-inked checkmark, get a line of encouragement for each one, and have everything sync between laptop, phone and iPad through Supabase. Hosted free on GitHub Pages.

```
site/              the website (this is what gets published)
supabase/schema.sql   run once in Supabase
.github/workflows/pages.yml   publishes site/ to GitHub Pages on every push
```

## Set-up (about 15 minutes)

### 1. Supabase (the database and login)
1. Create a project at supabase.com (or reuse the one from your other tracker; the new table `vw_items` does not clash with `tracker_state`).
2. **SQL Editor → New query**, paste all of `supabase/schema.sql`, press **Run**. It creates the table, privacy rules (each account sees only its own rows), the "newest edit wins" rule, and turns on realtime. Safe to run twice.
3. **Authentication → Providers**: make sure **Email** is on. For the simplest start, switch off **Confirm email** (otherwise you must click an email link after creating the account).
4. **Authentication → URL Configuration**: set **Site URL** to your GitHub Pages address (step 3 below, e.g. `https://YOURNAME.github.io/velaris-winter/`). Add the same address under **Redirect URLs**. This is only needed for the "email me a sign-in link" button.
5. **Project Settings → API**: copy the **Project URL** and the **anon / publishable** key.

### 2. Put your keys in `site/config.js`
```js
window.VW_CONFIG = {
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "your anon / publishable key",
};
```
The anon key is meant to be public; the privacy rules in the database are what protect your data. **Never** paste the `service_role` / secret key anywhere in this project.

### 3. GitHub
1. Create a new repository (for example `velaris-winter`) and upload everything in this folder (or `git init`, `git add .`, `git commit`, `git push`) to the `main` branch.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The push starts the **Deploy to GitHub Pages** workflow (Actions tab). When it turns green your site is at `https://YOURNAME.github.io/REPO/`.

### 4. First use
1. Open the site, choose **Create account** (email + password, 6+ characters).
2. On your phone and iPad open the same address and **Sign in** with the same email and password. Use **Share → Add to Home Screen** for an app-like icon.
3. Tick a task on one device and watch it appear on the other. The pill at the top shows **Saved to cloud / Syncing / Offline · N queued / Sync problem**.

To try it on your computer before uploading: `cd site && python3 -m http.server 8000`, then open http://localhost:8000 (it must be served; opening the file directly will not work).

## Using it

- **Day** is the main page. Sections are Morning, Afternoon, Evening, Night Study. Tap the box to tick; tap ⋯ to edit, reorder, carry to the next day, or delete.
- **Add a task** (any date, with category, minutes, start time, priority, unit, note, and "repeat daily/weekly until the exam").
- **Swap this day with another** moves the whole day's load. Use it after 2 Nov, when your college timetable shows your lightest weekday: swap Wednesday (the 8-hour day in this plan) with that day.
- **Week** shows planned vs done NET hours and lists everything still open from earlier days. Nothing is dropped automatically; you move, finish or delete it.
- **Units** shows progress per unit. **Shelf** keeps every message you have earned and the cats you unlock. **Settings** has your name, exam date, animations/snow/decoration toggles, backup export/import.
- Messages say whether they are an **Original message** (written for this app) or a **Published quotation** (author and book shown). The six quotations were checked against web sources when this was built. To add more, only add lines you have checked in your own copy of the book (`site/quotes.js`).

## About the plan
- Hafsa ma'am's weekend 5-hour unit sessions are in as "replay at 2x (~2.5h)" tasks, one per unit, placed on the weekend that closes the week you study that unit. I don't know which unit she teaches on which weekend. If a unit's session isn't out yet, edit that task's date to swap in another unit's replay.
- The weekday pattern (Mon 2h, Tue 5h, Wed 8h, Thu 5h, Fri 5h) is a placeholder until your timetable arrives.
- The exam date is assumed to be 16 Dec. Change it in Settings once NTA publishes your shift.
- Plan tasks live in `site/plan.js`. If you edit that file, only add tasks at the end of a day; your ticks are stored against each task's id (`date-index`).

## How syncing works
Every tick and edit is saved on the device first (so it works offline), queued, and sent to Supabase when there is a connection. Each item is its own row, so editing different tasks on different devices never conflicts. If two devices edit the *same* task, the newer edit wins (the database enforces it). Other open devices update live through Supabase Realtime, with a refresh every minute as a backup. Deleted tasks are marked deleted rather than erased.

## Troubleshooting
- **"Sync problem · retrying"**: usually the SQL wasn't run, or the URL/key in `config.js` is wrong. Open the Settings page to see the last error message.
- **"Email not confirmed"**: confirm the email, or switch off Confirm email in Supabase (step 1.3).
- **Magic link opens the wrong address**: fix Site URL and Redirect URLs (step 1.4).
- **Changes don't show on another device straight away**: pull down to refresh, or press **Sync now**.
- **Page looks old after an update**: the app caches itself for offline use; reload once or twice.

## What has and hasn't been tested
Tested automatically: the SQL (privacy rules, newest-edit-wins, safe re-run) in a real Postgres engine; the website in Chromium with two simulated devices (ticking, ink animation, a different message each tick, refresh, cross-device sync, offline queue and recovery, both conflict directions, date navigation, edit/move/swap/delete, all views, animations off, phone-size layout and touch tapping, sign-in, local-only mode, opening offline).
Not tested: a live Supabase project (the cloud calls were exercised against a stand-in with the same API shape) and Apple Pencil on a real iPad (taps use ordinary click events, which Pencil produces).

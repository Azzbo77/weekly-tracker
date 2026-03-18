# Monthly Work Tracker

A lightweight, self-contained monthly status tracker for keeping your manager informed. No server, no database, no installation required — just a small static site that runs in any browser.

## What it does

Organises your monthly work into three columns:

- **In progress** — what you are actively working on right now
- **Planned** — what you intend to start this month
- **Blocked** — tasks you cannot progress due to something outside your control

As you add tasks throughout the month, a **manager update** is automatically formatted at the bottom of the page, ready to copy and paste into an email, Teams message, or Slack.

## Features

- **Five task states** — in progress, planned, blocked, completed, and cancelled
- **Move tasks between columns** — e.g. move a planned task to blocked if it hits a problem, or unblock a task back to in progress
- **Notes on tasks** — with bullet point and strikethrough formatting support
- **Ongoing tasks** — mark a task as ongoing and it automatically carries over to the next month without any manual action
- **Carry over** — incomplete tasks from previous months can be carried forward in one click
- **Month navigation** — browse forwards and backwards through any month; each month's data is stored separately
- **Totals** — item counts for each column shown at a glance
- **Dark mode** — toggle between light and dark themes; preference is remembered
- **Export and import** — download a JSON backup of all your data at any time and restore it on any device
- **Auto-save** — data saves automatically to browser local storage on every change

## How to use

Open the tracker in your browser and use the **How to use** button in the top right for a full guide.

## Hosting

This tracker is hosted via GitHub Pages.

## Running locally

Keep `index.html`, `styles.css`, and the `js/` folder together in the same project structure, then open `index.html` in any modern browser. No web server or internet connection is required (the Google Font will fall back to a system font if offline).

Tested in Chrome, Firefox, Safari, and Edge.

## Data and privacy

All data is stored locally in your browser's local storage. Nothing is sent to any server. The tracker makes no network requests other than loading the Google Font on first use.

## Saving your data

Data persists in local storage as long as you use the same browser on the same device. For backups or moving to a new machine, use the **Export JSON** button to download your data and **Import JSON** to restore it.


GitHub Pages will update within a minute or two. Do a hard refresh in your browser (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac) if you do not see the changes.

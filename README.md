# Monthly Work Tracker

A lightweight, self-contained monthly status tracker for keeping your manager informed. No server, no database, no installation required — just a small static site that runs in any browser.

## What it does

Organises your monthly work into three active columns:

- **In progress** — what you are actively working on right now
- **Planned** — what you intend to start this month
- **Blocked** — tasks you cannot progress due to something outside your control

As you add tasks throughout the month, a **manager update** is automatically formatted at the bottom of the page, ready to copy and paste into an email, Teams message, or Slack.

## Features

- **Five task states** — in progress, planned, blocked, completed, and cancelled
- **Drag and drop** — reorder tasks within a column or move them between columns
- **Priority levels** — mark tasks as high, medium, or low priority with colour-coded dots
- **Progress tracking** — set a percentage complete on any task; reaching 100 % automatically marks it as done
- **Notes on tasks** — with bullet point, strikethrough formatting, and an inline date picker
- **Ongoing flag** — mark a task as ongoing to make it easy to identify when carrying tasks forward
- **Carry over** — incomplete tasks from previous months can be carried forward to the current month in one click
- **Month navigation** — browse forwards and backwards through any month; each month's data is stored separately
- **Global search** — search across all months and tasks in one place
- **Manager update** — auto-generated summary at the bottom of the page; copy to clipboard in one click
- **PDF export** — export one month, all months, or a custom selection to a formatted PDF
- **JSON export and import** — download a full backup of your data and restore it on any device
- **Dark mode** — toggle between light and dark themes; preference is remembered
- **Auto-save** — every change is saved instantly to browser local storage

## How to use

Open the tracker in your browser and use the **How to use** button in the top right for a full guide.

## Hosting

This tracker is hosted via GitHub Pages.

## Project structure

```
index.html        — markup only
styles.css        — all styles
js/
  constants.js    — shared named constants
  state.js        — shared runtime state
  utils.js        — formatting helpers and UI utilities
  storage.js      — localStorage read/write and theme restoration
  modals.js       — modal wiring and import file handling
  months.js       — month key helpers, carry-over logic
  tasks.js        — all item actions (add, remove, prioritise, mark done, etc.)
  notes.js        — note editor, date picker, note-to-HTML rendering
  render.js       — DOM rendering and manager update summary
  export.js       — JSON export/import and PDF generation
  search.js       — global search, confetti, and drag-and-drop
  main.js         — bootstrap
```

## Running locally

Keep `index.html`, `styles.css`, and the `js/` folder together in the same project structure, then open `index.html` in any modern browser. No web server or internet connection is required (the Google Font will fall back to a system font if offline).

Tested in Chrome, Firefox, Safari, and Edge.

## Data and privacy

All data is stored locally in your browser's local storage. Nothing is sent to any server. The tracker makes no network requests other than loading the Google Font on first use.

## Saving your data

Data persists in local storage as long as you use the same browser on the same device. For backups or moving to a new device, use the **Export JSON** button to download your data and **Import JSON** to restore it.

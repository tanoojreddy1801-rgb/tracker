# DueGuard Work Tracker

DueGuard is a personal client due-date tracker for compliance work such as Income Tax, GST, ROC, Accounting, Trademark, and other client commitments.

It is built as a static browser app, so it can run directly on GitHub Pages without a backend, database, or build step.

## Features

- Client-wise due date tracking
- Overdue, due today, this week, and completed summaries
- Risk scoring based on urgency, priority, and compliance category
- AI-style deadline brief for the highest-risk matter
- Search and filters by category and priority
- Add, edit, complete, delete, and export work items
- Browser notifications while the app is open
- Local browser storage using `localStorage`

## Run Locally

Open `index.html` in a browser.

## Deploy On GitHub Pages

1. Create a new GitHub repository.
2. Upload these files to the repository root:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
   - `.nojekyll`
3. Go to repository `Settings`.
4. Open `Pages`.
5. Under `Build and deployment`, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. Save.

GitHub will publish the app at:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY-NAME/`

## Privacy Note

DueGuard stores data in the browser on the device where it is used. If you open the same GitHub Pages link from another computer or browser, the saved tasks will not automatically appear there.

For multi-device sync, the app would need a backend such as Firebase, Supabase, or a private database.

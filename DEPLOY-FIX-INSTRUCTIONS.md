# My Golf Calendar - GitHub Pages build fix

This archive contains the full mobile React/Vite app and the corrected GitHub Pages workflow.

## Fix the failing workflow first

1. In your GitHub repository, open `.github/workflows/deploy.yml`.
2. Click the pencil **Edit** button.
3. Replace the ENTIRE file with `.github/workflows/deploy.yml` from this ZIP.
4. Click **Commit changes** to `main`.
5. Confirm Settings -> Pages -> Build and deployment -> Source = **GitHub Actions**.
6. GitHub Actions -> Deploy to GitHub Pages will run automatically after the commit.

**IMPORTANT:** Merely uploading a ZIP to the repository does not extract it. Unzip on your computer and upload the files *inside* it, keeping paths intact. You can also replace the workflow manually using the GitHub editor as in step 1. A leading dot in `.github` is significant.

## Why this version changes the workflow

The original starter repository's `package-lock.json` contains React 19, Vite 8 and other dependency versions that do not match this prototype's `package.json`. `npm ci` refuses to install inconsistent lockfiles (EUSAGE). The workflow now runs `npm install` instead, which updates the existing lockfile in the temporary GitHub Actions runner before building. This does not modify the file in your GitHub repository; for reproducible installs, regenerate/commit a matching lockfile later using `npm install` locally.

## App features

- Responsive weekly/monthly calendar and saved plans stored in localStorage
- OpenStreetMap/Leaflet real map tiles (internet needed) and curated NJ golf course points
- Course filters, public/private labels, course info and links, reference scorecards
- Create plan -> select date/time/buffers -> preview -> save

Prices, ratings and travel time are not live; recommendations are rule-based, not AI server requests. Saved plans do **not** book tee times.

## If it still fails

Open Actions -> the most recent failed run -> click `deploy` -> copy the FIRST red failing step and its first detailed error lines. `exit code 1` by itself does not identify the problem.

# My Golf Calendar — CourseFit mobile prototype

A functional, mobile-first **React + TypeScript + Vite** prototype based on the supplied Figma screens. Designed for **GitHub Pages**, with no accounts, API keys, server, or database.

## Features

- Weekly calendar with an optional full-month view
- No-plans state, saved plan cards and rule-based course suggestions
- Searchable, draggable **OpenStreetMap** with course-name/approximate price-tier/review labels (Leaflet)
- Filters for radius, holes, public/private access, review-rating threshold, budget tier, and facilities
- Course details: access, holes, par, yardage, selected slope/course rating, facilities, official external websites and phone
- Hole-by-hole scorecards for courses with a sourced reference dataset; otherwise a source link
- Course preview with available image, information and external map link
- Editable golf-day plan: date, target tee time, driving time, check-in, warm-up and time to first tee
- Timeline preview, save, delete, and share a saved plan
- Plan persistence in the **current browser's localStorage**

## Important: data and limitations

The included course directory is a **bundled reference dataset** for real New Jersey courses (in `src/data.ts`). It is **not** a live feed. Approximate map coordinates identify real course locations. Review scores are source snapshots, **not real-time**, and should not be confused with official USGA course ratings. `$` tiers are approximate, not live greens fees. Hole-by-hole scorecards use specified published reference tees where available; check the linked source for current details. This project does not book tee times.

**Map tiles require internet access** (public OpenStreetMap tiles). The app code and saved data do not require a backend; the internet is still needed to initially load the deployed website, map imagery, external websites, and remote course photos. No commercial routing/traffic service is used: suggested drive durations are editable examples, not actual road travel times.

**Suggestions are rule-based**, using stored course details, not live OpenAI or another AI service. To implement real AI recommendations or live inventory, a hosted API/backend would be required.

Private courses (notably Liberty National) are marked private and excluded by default; appearing on a map does not imply public access.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite in a browser. To test on a phone on the **same Wi-Fi**, open your computer's local network IP with the printed port. For a deployment build:

```bash
npm run build
npm run preview
```

## Publish to your existing GitHub repository

Destination: `https://github.com/Dandyun/my-golf-calendar`

1. Unzip this archive on your computer.
2. Add **all files and folders inside** `my-golf-calendar` to the *root* of that repo (including `src`, `.github`, `index.html`, `package.json`, `vite.config.ts`, `tsconfig.json`). Do not upload just the ZIP itself or nest the project in another folder.
3. Commit the changes to the **main** branch.
4. Open **Settings → Pages**, choose **GitHub Actions** as the build/deploy source.
5. Go to **Actions** and wait for the `Deploy to GitHub Pages` workflow to finish. If it doesn't run automatically, use **Run workflow**.
6. Visit `https://dandyun.github.io/my-golf-calendar/` from a phone.

The `vite.config.ts` contains the GitHub Pages subfolder path. If you rename the repository, update that `base` value.

## Source files

- `src/App.tsx` — main UI and application state
- `src/styles.css` — responsive styling
- `src/MapView.tsx` — Leaflet/OpenStreetMap
- `src/data.ts` — local reference data and scorecards
- `.github/workflows/deploy.yml` — static deployment

## Data note

All planning data is **per-browser**, not shared across devices. Private/incognito tabs or clearing site data may delete plans. Treat the prototype as a planning helper and confirm current course access, prices, facilities, published scorecards and tee-time availability with course operators.


## GitHub Pages troubleshooting

1. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Upload the *contents* of this `my-golf-calendar` folder to your repository root (including `src/` and `.github/workflows/deploy.yml`). Do not nest the folder inside itself.
3. Open **Actions → Deploy to GitHub Pages**. A successful run needs both a `build` and a `deploy` job.
4. If a run fails, click the failed **job**, expand the first failed step, and read the error immediately above `Process completed with exit code 1`.
5. This ZIP intentionally does not include `node_modules/` or `package-lock.json`. The workflow installs dependencies using `npm install` before building.

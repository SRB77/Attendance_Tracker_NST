# Attendance Tracker NST

A Chrome extension (Manifest V3, React + Vite) that fetches and displays attendance analytics for Newton School of Technology courses directly in the browser popup.

## Features
- One-click attendance summary grouped by subject (main vs. lab/tutorial)
- Works from any tab after one-time setup on a Newton course page
- Uses cached data when offline or when Newton is not open
- Refresh button and stale-data banner

## Prerequisites
- Node.js 18+ and npm
- Google Chrome (or any Chromium browser with MV3 support)

## Installation & Setup
```bash
git clone https://github.com/SRB77/Attendance_Tracker_NST.git
cd Attendance_Tracker_NST
npm install
npm run build        # outputs the production bundle to dist/
```

## Load the extension (Chrome)
1. Open `chrome://extensions/` and enable **Developer mode**.
2. Click **Load unpacked** and select the `dist` folder.
3. Pin the extension (optional) for quick access.

## Usage
1. In Chrome, log in to `https://my.newtonschool.co` and open any course page once.  
2. Click the extension icon: it will fetch your attendance, cache results, and show totals per subject.  
3. Use **Refresh** to pull fresh data; if the network fails, cached data is shown with a stale notice.

## Scripts
- `npm run dev` – Vite dev server (useful for UI tweaks; remember the popup still runs as an extension)
- `npm run build` – production build to `dist/`
- `npm run preview` – preview built files
- `npm run lint` – lint sources

## Contributing
1. Fork the repo and create a branch (`git checkout -b docs/readme`).
2. Make your changes (tests not yet defined for this project).
3. Run `npm run lint` if you touch code.
4. Open a PR against `main` referencing the relevant issue.

## License
The repository does not currently include a LICENSE file. Please open an issue or contact the maintainer (`@SRB77`) to clarify licensing before redistribution.

## Contact
Maintainer: **SRB77** — https://github.com/SRB77

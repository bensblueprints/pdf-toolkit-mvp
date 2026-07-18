# PDF Toolkit

## Demo



https://github.com/user-attachments/assets/fff5ec3d-9419-4c12-b372-0c67853623ec



[![License: MIT](https://img.shields.io/badge/License-MIT-8f7bff.svg)](LICENSE)

**Every PDF tool you actually use — merge, split, rotate, watermark, convert, edit — running 100% on your machine. Pay once. Own it forever. No subscription.**

SmallPDF charges **$12/month, forever**, to do things your computer can do for free — and it uploads your documents to their servers to do it. PDF Toolkit does the same jobs locally, offline, with zero telemetry, for a **one-time $29**.

![PDF Toolkit screenshot](docs/screenshot.png)

## Features

- **Merge PDFs** — drag-drop any number of PDFs, reorder them in the list, combine into one file
- **Split PDF** — extract any page ranges (`1-2 | 3 | 4-6`) into separate new PDFs
- **Rotate pages** — 90° / 180° / 270°, all pages or a specific range, batch across files
- **Watermark** — text (position, size, opacity, diagonal) or image stamp (position, scale, opacity), batch across files
- **Images → PDF** — JPG/PNG to PDF, one image per page, reorderable, A4-fit or native size
- **Metadata editor** — read and rewrite title, author, and subject

All processing happens **locally with [pdf-lib](https://pdf-lib.js.org/)** — pure JavaScript, no native dependencies, no network calls, no uploads, no account.

## ☕ Skip the setup — get the 1-click installer

Don't want to install Node and build from source? Grab the packaged Windows installer — pay once, own it forever:

**[Get PDF Toolkit on Whop →](https://whop.com/benjisaiempire/pdfsmith)**

## Quick start (from source)

```bash
npm i && npm start
```

Requires Node 18+ (built on Node 24). Run the smoke test with `npm test`. Build a Windows installer with `npm run dist`.

## PDF Toolkit vs SmallPDF

| | **PDF Toolkit** | SmallPDF Pro |
|---|---|---|
| Price | **$29 once** | $12/month ($144/yr, forever) |
| Your files | **Never leave your machine** | Uploaded to their servers |
| Works offline | **Yes** | No |
| Account required | **No** | Yes |
| Merge / split / rotate | Yes | Yes |
| Watermark (text + image) | Yes | Yes (Pro only) |
| Images → PDF | Yes | Yes |
| Metadata editor | Yes | No |
| Telemetry | **None** | Extensive |
| Source code | **MIT, on GitHub** | Closed |

Two and a half months of SmallPDF pays for PDF Toolkit outright. Everything after that is money you keep.

## Tech stack

- **Electron** — main + preload + renderer, context-isolated, no node integration in the renderer
- **pdf-lib** — all PDF operations, pure JS
- **Plain HTML/CSS/JS renderer** — no framework, fast startup, premium dark UI
- **electron-builder** — Windows NSIS installer via `npm run dist`

## Project structure

```
src/
  main.js        # Electron main — window, dialogs, IPC handlers
  preload.js     # contextBridge API surface
  pdf-ops.js     # all PDF logic (pure Node, also used by tests)
  renderer/      # index.html + styles.css + app.js
test/smoke.js    # real end-to-end smoke test (npm test)
launch-kit/      # Product Hunt, ad copy, launch strategy
```

## License

[MIT](LICENSE) © 2026 Ben (bensblueprints)

## macOS build

See [MAC-BUILD.md](MAC-BUILD.md). Quickest path: GitHub **Actions** tab -> run the **Mac Build** (`mac-build.yml`) workflow to get a downloadable `.dmg` (unsigned - right-click -> Open on first launch).

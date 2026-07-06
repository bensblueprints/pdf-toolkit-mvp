# Product Hunt Launch — PDF Toolkit

## Name
PDF Toolkit

## Tagline (60 chars max)
Every PDF tool you need. $29 once. 100% offline. (47 chars)

## Description (260 chars max)
Merge, split, rotate, watermark, convert images to PDF, and edit metadata — all locally on your machine. No uploads, no account, no telemetry, no $12/mo subscription. Pay $29 once, own it forever. Open source (MIT) with a 1-click Windows installer. (249 chars)

## Full description

PDF Toolkit is a desktop app that replaces the SmallPDF subscription with a one-time purchase.

**The problem:** the most common PDF tasks — merging contracts, splitting scans, stamping "CONFIDENTIAL" on a draft — are trivial operations, yet the popular web tools charge $12/month forever and require you to upload your documents (contracts! financials! medical records!) to their servers.

**The fix:** PDF Toolkit does all of it locally:

- **Merge** — drag-drop PDFs, reorder, combine
- **Split** — extract any page ranges into new files
- **Rotate** — 90/180/270°, all pages or a range, in batch
- **Watermark** — text or image, with position, size, and opacity controls
- **Images → PDF** — JPG/PNG to PDF, one per page, reorderable
- **Metadata** — edit title, author, subject

Zero network calls. Zero telemetry. No account. Works on a plane. The source is MIT-licensed on GitHub; the $29 buys you the polished 1-click installer and supports development.

$29 once vs $144/year, forever. It pays for itself in under 3 months.

## Maker first comment

Hey PH 👋

I built this because I got tired of paying $12/mo to SmallPDF to merge two PDFs — something my laptop can do in 40 milliseconds without sending my documents to anyone's server.

One month I looked at my subscriptions and realized I'd paid them over $140 that year for what amounts to a for-loop over pages. Worse: every contract and invoice I "processed" got uploaded to a third party first.

So I built the offline version. Everything runs locally with pdf-lib — merge, split, rotate, watermark, images-to-PDF, metadata. There's no server because there doesn't need to be one.

Honest notes:
- It's the 6 tools I actually use, not 40 tools of shovelware. If you need OCR or e-signing, this isn't that (yet).
- The code is MIT on GitHub — you can build it yourself for free. The $29 is for the 1-click installer and to keep me shipping.
- Windows-first today; the code is cross-platform Electron, other builds coming.

Would love to hear which PDF task you're still paying monthly for — it's probably next on my list.

## Gallery shots (5)

1. **Hero** — full app window on the Merge tool: dark UI, sidebar with 6 tools, three PDFs in the reorder list, glowing "Merge PDFs" button. Caption: "Every PDF tool you use. One window. $29 once."
2. **Drag-drop in action** — dropzone in its highlighted dragover state with a file mid-drop. Caption: "Drop files. Done."
3. **Watermark controls** — Watermark tool with text "CONFIDENTIAL", position grid, opacity slider at 30%, diagonal on. Caption: "Text or image watermarks with full position + opacity control."
4. **Split results** — Split tool showing ranges `1-2 | 3-4` and the green success state listing two output files with "Show in folder" links. Caption: "Extract exactly the pages you need."
5. **Comparison card** — designed graphic of the README comparison table: $29 once vs $144/year, offline vs uploads, MIT vs closed. Caption: "Pays for itself in under 3 months."

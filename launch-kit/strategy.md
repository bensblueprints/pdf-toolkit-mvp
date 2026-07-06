# Launch Strategy — PDF Toolkit

## Positioning
"Pay once. Own it forever. No subscription." — the local, private, one-time-purchase replacement for SmallPDF Pro ($12/mo) and iLovePDF Premium ($6.61/mo).

## Pricing math
- **Suggested price: $29 one-time.**
- SmallPDF Pro: $12/mo → PDF Toolkit pays for itself in **2.4 months**. Year one saves $115; every following year saves $144.
- iLovePDF Premium: $6.61/mo (annual) → pays for itself in **4.4 months**.
- Anchor in copy: "$29 once vs $144 every year, forever."
- Launch promo option: $19 first-week Product Hunt price, back to $29 after.

## Target communities (rules-aware angles)

- **r/selfhosted** (self-reliance crowd) — angle: "I de-SaaS'd my PDF workflow." Position as removing a cloud dependency; lead with the open-source repo, mention the paid installer only if asked. No direct sales posts — share the GitHub link, let the README sell.
- **r/privacy** — angle: "PDF websites upload your contracts to their servers — here's an offline alternative." Lead with the zero-network-calls claim (verifiable, it's open source). Never link the Whop page directly in the post; put it in the repo.
- **r/software** — allows recommendations/discussions; post as "I built a one-time-purchase alternative to SmallPDF" in a Saturday self-promo-friendly window; disclose you're the author (required).
- **r/DataHoarder** — angle: batch/local document processing without upload limits or file-size caps. Mention no file-size limits (it's your RAM, not their server).
- **r/SideProject and r/indiehackers** — full transparency angle: the anti-subscription business model itself ("MIT source + paid installer — does this model work?"). These communities allow direct promo and love pricing-model discussions.
- **Hacker News** — see Show HN draft below. Never use marketing language on HN; lead with the technical story.

## Show HN draft

**Title:** Show HN: PDF Toolkit – offline SmallPDF replacement, pay once (MIT)

**Post:**
I kept paying $12/mo to merge PDFs in a browser, which also meant uploading contracts and invoices to a third-party server for what is essentially a loop over page objects.

So I built the local version: an Electron app that does merge, split, rotate, text/image watermark, images→PDF, and metadata editing — all with pdf-lib (pure JS, no native deps), fully offline. No account, no telemetry, no network calls at all.

The source is MIT on GitHub — `npm i && npm start` and you have the whole thing. I sell a $29 packaged installer for people who don't want to touch Node; that's the business model experiment: open source + paid convenience, versus the $144/yr subscription incumbents.

Honest limitations: no OCR, no e-sign, no PDF/A conversion — it's the six tools I actually used SmallPDF for. pdf-lib can't decrypt password-protected files, so those are out of scope for now.

Happy to answer anything about pdf-lib quirks (page rotation state, embedded image handling) or the pay-once model.

## SEO keywords (10)
1. smallpdf alternative
2. offline pdf editor windows
3. merge pdf offline
4. pdf tools no subscription
5. one time purchase pdf software
6. split pdf without uploading
7. pdf watermark tool windows
8. ilovepdf alternative desktop
9. private pdf merger no upload
10. jpg to pdf converter offline

## AppSumo / PitchGround pitch

PDF Toolkit is the anti-subscription answer to SmallPDF: a polished Windows desktop app that merges, splits, rotates, watermarks, converts, and edits PDFs entirely on the user's machine — no uploads, no account, no telemetry. The market leader charges $144/year for tools that are, frankly, loops over page objects; we charge once. Your audience of agencies, freelancers, and small firms handles sensitive client documents daily and hates both recurring fees and cloud upload requirements — this hits both nerves. The code is open source (MIT), which de-risks the purchase and builds trust; the paid product is the 1-click installer plus lifetime updates. Strong LTV story for a lifetime-deal audience: our $29 direct price leaves comfortable margin for a $19–24 deal tier, and the "pays for itself in under 3 months vs SmallPDF" math writes the campaign copy for you.

## Launch sequence (suggested)
1. Repo public on GitHub with polished README + screenshot.
2. Product Hunt launch (Tuesday, 00:01 PT) with launch-week $19 price.
3. Show HN same week (Wednesday morning US time).
4. Reddit drip over the following 2 weeks (one community per 3-4 days, tailored angle each).
5. X thread: the "subscription math" graphic + build story.
6. AppSumo/PitchGround outreach after 100+ organic sales (social proof for the pitch).

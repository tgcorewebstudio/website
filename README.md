# TG Core — Website

Website for **TG Core**, a media company and web studio in Tempe, Arizona.
Plain HTML, CSS and JavaScript: no build step, ready for GitHub Pages.

- Email: tgcore.webstudio@gmail.com
- Phone: +1 (480) 667-0415

## Files

| Path | What it is |
|---|---|
| `index.html` | All page content and sections |
| `styles.css` | Colors, fonts, layout and animations |
| `main.js` | Globe, interactions, forms and settings |
| `tgcore-logo.png` | Full logo with "Media Company", transparent background |
| `tgcore-crest.png` | Crest only, used in the header, footer and browser tab |
| `tgcore-logo-original.png`, `tgcore-logo-navy-original.png` | Original logo files |
| `google-apps-script.gs` | Google backend for messages and submissions (runs in Google, not on the site) |

## Settings (top of `main.js`)

| Setting | Purpose |
|---|---|
| `APPS_SCRIPT_URL` | Sends "Text us" messages and "Submit your company" forms to Gmail, the TG Core Leads sheet and Google Calendar |
| `BOOKING_URL` | Google Calendar booking page used by every "Book a call" button |
| `WEB3FORMS_KEY` | Optional email-only fallback, unused while `APPS_SCRIPT_URL` is set |

## Publish on GitHub Pages

1. Create a **public** repository named `tgcore-website` on github.com.
2. Click **uploading an existing file** and drag in every file in this folder (all files sit together, no subfolders).
3. **Settings → Pages → Deploy from a branch → main → / (root) → Save**.
4. The site goes live at `https://<your-username>.github.io/tgcore-website/` in 1–2 minutes.

### Custom domain

In **Settings → Pages → Custom domain**, enter the domain, then add these DNS records at the domain seller:

| Type | Name | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | `<your-username>.github.io` |

Once connected, check **Enforce HTTPS**.

## Preview locally

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173.

## Before launch

Replace placeholder content with real details: the stats in "By the numbers", the growth chart numbers (`GROWTH` in `main.js`), the journey years, and the four "Concept" project cards.

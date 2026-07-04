# rwdenmark.github.io

Personal portfolio site for Ryan Denmark. Live at <https://rwdenmark.github.io/>.

## Stack

Jekyll (built-in to GitHub Pages, no extra config required). Plain HTML, CSS, and vanilla JS. No Node, no local build step.

Layout and shared chrome (header, footer, animated circuit background, copy-to-clipboard toast) live in `_layouts/default.html`. Styles in `assets/style.css`. Client-side JS in `assets/script.js`. Each page (`index.html`, `projects.html`, `about.html`, `references.html`, `resume.html`) is just front matter plus page-specific content.

## Layout

```
_config.yml                 Jekyll config
_layouts/default.html       Shared page chrome
assets/style.css            All CSS
assets/script.js            Most client JS (email-copy, last-updated, hit-counter ping, photo-gallery tabs, recent-commits feed, circuit-background pulses). The Live Demo failover and status-dot script is inline in projects.html
index.html                  Home: intro, testimonials, certifications
projects.html               Projects, utilities, recent-activity feed
about.html                  About + photo galleries (Boundary Waters, Jax, Cats)
references.html             Full LinkedIn recommendations
resume.html                 Resume page (mirrors Resume_Ryan_Denmark.pdf)
404.html                    Not-found page
.github/workflows/          Visit-alert email poller + hourly recent-commits cache
.github/last-seen-total.txt Last GoatCounter total seen by the visit-alert poller
favicon.svg, favicon.ico    Favicons
og-image.png                Open Graph preview image
robots.txt                  Allow-all crawl policy plus sitemap pointer
projects/                   Project card thumbnails
jax/, boundary-waters/, cats/   Photos for the About galleries
commits.json                Cached recent-commits feed (generated hourly by the workflow)
last-updated.txt            Footer date of the last real content commit (also generated hourly)
```

## Deploy

Push to `main`. GitHub Pages runs Jekyll, builds `_site/`, and serves it. Takes 30 seconds to a couple of minutes from push to live.

## Local preview

If you have Ruby and Bundler installed:

```
bundle init
bundle add jekyll
bundle exec jekyll serve
```

Otherwise just push to a feature branch and let GitHub Pages render it.

## Hit counter and visit-alert email

The home page sends a pageview to [GoatCounter](https://www.goatcounter.com) (`rwdenmark.goatcounter.com`), which filters bots and detects unique visitors server-side. A GitHub Actions workflow (`.github/workflows/visit-alert.yml`) polls the GoatCounter API every 15 minutes and emails via Gmail SMTP only when new views appeared, so there are no zero-count emails. GitHub delays scheduled runs, so alerts land within roughly half an hour of a visit. The last seen total is committed to `.github/last-seen-total.txt` before each email so a failed push can never double-send, and day-rollover views are caught against the prior day's final total. Requires repo secrets `MAIL_USERNAME`, `MAIL_PASSWORD` (a Gmail app password), and `GOATCOUNTER_TOKEN` (a GoatCounter API key with "Read statistics").

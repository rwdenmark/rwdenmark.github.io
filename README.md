# rwdenmark.github.io

Personal portfolio site for Ryan Denmark. Live at <https://rwdenmark.github.io/>.

## Stack

Jekyll (built-in to GitHub Pages, no extra config required). Plain HTML, CSS, and vanilla JS. No Node, no local build step.

Layout and shared chrome (header, footer, animated circuit background, copy-to-clipboard toast) live in `_layouts/default.html`. Styles in `assets/style.css`. Client-side JS in `assets/script.js`. Each page (`index.html`, `projects.html`, `about.html`, `references.html`, `resume.html`) is just front matter plus page-specific content.

## Layout

```
_config.yml                 Jekyll config
_layouts/default.html       Shared page chrome
_includes/cert-card.html    Certification card (featured and list variants)
_data/                      Page data (nav, projects, certs, galleries, references, testimonials, utilities)
_data/commits.json          Recent-commits feed, generated hourly by the workflow, rendered at build
_data/last_updated.yml      Footer date of the last real content commit, same workflow, rendered at build
assets/style.css            All CSS
assets/script.js            All client JS (email-copy, last-updated formatting, hit-counter ping, photo-gallery tabs, lightbox, commit relative times, Live Demo failover + status dots, circuit-background pulses)
index.html                  Home: intro, testimonials, certifications
projects.html               Projects, utilities, recent-activity feed
about.html                  About + photo galleries (Boundary Waters, Jax, Cats)
references.html             Full LinkedIn recommendations (from _data/references.yml)
resume.html                 Resume page (mirrors Resume_Ryan_Denmark.pdf)
404.html                    Not-found page
.github/workflows/          Visit-alert email poller + hourly recent-commits cache
.github/actions/commit-push Shared commit-and-push-with-rebase-retry step for both workflows
.github/last-seen-visits.txt Last visitor count seen by the visit-alert poller
favicon.svg, favicon.ico    Favicons
apple-touch-icon.png        iOS home-screen icon
googlec0603268e666aeeb.html Google Search Console ownership verification
og-image.png                Open Graph preview image
robots.txt                  Allow-all crawl policy plus sitemap pointer
projects/                   Project card thumbnails
jax/, boundary-waters/, cats/   Photos for the About galleries. Photos wider than 640px have generated 320w/640w grid sizes in a thumbs/ subdir (jax photos are 600px, so no thumbs there)
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

Every page sends a pageview to [GoatCounter](https://www.goatcounter.com) (`rwdenmark.goatcounter.com`), which filters bots and detects unique visitors server-side. A GitHub Actions workflow (`.github/workflows/visit-alert.yml`) polls the GoatCounter API every 15 minutes and emails via Gmail SMTP only when new visitors appeared (deduplicated GoatCounter visits, so one person refreshing does not send mail, and there are no zero-count emails). GitHub delays scheduled runs, so alerts land within roughly half an hour of a visit. The last seen visitor count is committed to `.github/last-seen-visits.txt` before each email so a failed push can never double-send, and day-rollover views are caught against the prior day's final total. Requires repo secrets `MAIL_USERNAME`, `MAIL_PASSWORD` (a Gmail app password), and `GOATCOUNTER_TOKEN` (a GoatCounter API key with "Read statistics"). To exclude your own visits, load any page once with `?nocount=1` (persists in that browser via localStorage), and undo it with `?nocount=0`.

## License

The source code is MIT licensed (see `LICENSE`). Photos, images, the resume PDF, and the quoted recommendation text are not covered by the MIT grant and are all rights reserved.

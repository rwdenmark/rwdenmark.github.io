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
assets/script.js            All client JS (email-copy, last-updated, hit-counter ping, photo-gallery tabs, recent-commits feed)
index.html                  Home: intro, testimonials, certifications
projects.html               Projects, utilities, recent-activity feed
about.html                  About + photo galleries (Boundary Waters, Jax, Cats)
references.html             Full LinkedIn recommendations
resume.html                 Resume page (mirrors Resume_Ryan_Denmark.pdf)
404.html                    Not-found page
.github/workflows/          Daily hit-count email + hourly recent-commits cache
favicon.svg, favicon.ico    Favicons
og-image.png                Open Graph preview image
projects/                   Project card thumbnails
jax/, boundary-waters/, cats/   Photos for the About galleries
commits.json                Cached recent-commits feed (generated hourly by the workflow)
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

## Hit counter and daily email

The home page sends a pageview to [GoatCounter](https://www.goatcounter.com) (`rwdenmark.goatcounter.com`), which filters bots and detects unique visitors server-side. A daily GitHub Actions workflow (`.github/workflows/daily-total.yml`) fires at midnight Central, reads yesterday's views and top countries from the GoatCounter API, and emails the result via Gmail SMTP. Requires repo secrets `MAIL_USERNAME`, `MAIL_PASSWORD` (a Gmail app password), and `GOATCOUNTER_TOKEN` (a GoatCounter API key with "Read statistics").

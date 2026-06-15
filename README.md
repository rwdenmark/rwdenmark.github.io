# rwdenmark.github.io

Personal portfolio site for Ryan Denmark. Live at <https://rwdenmark.github.io/>.

## Stack

Jekyll (built-in to GitHub Pages, no extra config required). Plain HTML, CSS, and vanilla JS — no Node, no local build step.

Layout and shared chrome (header, footer, animated circuit background, copy-to-clipboard toast) live in `_layouts/default.html`. Styles in `assets/style.css`. Client-side JS in `assets/script.js`. Each page (`index.html`, `resume.html`, `about.html`) is just front matter plus page-specific content.

## Layout

```
_config.yml                 Jekyll config
_layouts/default.html       Shared page chrome
assets/style.css            All CSS
assets/script.js            All client JS (email-copy, last-updated, hit-counter ping, photo-gallery tabs, recent-commits feed)
index.html                  Home: about + project cards
resume.html                 Resume page (mirrors Resume_Ryan_Denmark.pdf)
about.html                  About + photo galleries (Jax, Boundary Waters)
.github/workflows/          Daily hit-count email + hourly recent-commits cache
favicon.svg, favicon.ico    Favicons
og-image.png                Open Graph preview image
projects/                   Project card thumbnails
jax/                        Photos for the gallery
boundary-waters/            Photos for the gallery
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

The home page pings `api.counterapi.dev` on every page load. A daily GitHub Actions workflow (`.github/workflows/daily-total.yml`) fires at midnight Central, computes the delta against yesterday's count, and emails the result via Gmail SMTP. Requires repo secrets `MAIL_USERNAME` and `MAIL_PASSWORD` (a Gmail app password).

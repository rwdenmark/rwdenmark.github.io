(function () {
  'use strict';

  // ---------- footer "Last updated": show the most recent CONTENT change, not the deploy time.
  // A workflow writes /last-updated.txt (YYYY-MM-DD) from git history, excluding the
  // housekeeping commits (.github/*, commits.json) so the date tracks real edits (any
  // page, the resume, new About photos) and not the hourly cache or daily counter pushes.
  // Falls back to the Jekyll-rendered site.time already in the span if the file is missing.
  (function () {
    var els = document.querySelectorAll('.last-updated');
    if (!els.length) return;
    function fmt(y, m, d) {
      return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    }
    // Reformat the Jekyll fallback (YYYY-MM-DD) so it reads nicely even offline.
    els.forEach(function (el) {
      var f = /^(\d{4})-(\d{2})-(\d{2})/.exec(el.textContent.trim());
      if (f) el.textContent = fmt(+f[1], +f[2], +f[3]);
    });
    fetch('/last-updated.txt')
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (txt) {
        var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(txt.trim());
        if (!m) return;
        var pretty = fmt(+m[1], +m[2], +m[3]);
        els.forEach(function (el) { el.textContent = pretty; });
      })
      .catch(function () { /* keep the fallback */ });
  })();

  // ---------- email link: copy address to clipboard with a toast
  (function () {
    var link = document.getElementById('email-link');
    var toast = document.getElementById('copy-toast');
    if (!link || !toast) return;
    var timer;

    function showToast(ok, addr) {
      toast.textContent = ok ? 'Copied ' + addr : addr;
      toast.classList.add('visible');
      clearTimeout(timer);
      timer = setTimeout(function () { toast.classList.remove('visible'); }, 2500);
    }

    function legacyCopy(addr) {
      try {
        var ta = document.createElement('textarea');
        ta.value = addr;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch (err) {
        return false;
      }
    }

    link.addEventListener('click', function (e) {
      e.preventDefault();
      var addr = link.dataset.email;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).then(
          function () { showToast(true, addr); },
          function () { showToast(legacyCopy(addr), addr); }
        );
      } else {
        showToast(legacyCopy(addr), addr);
      }
    });
  })();

  // ---------- about page: photo gallery tabs (Jax / Boundary Waters)
  // Swaps which gallery is visible. Only the images change; nothing else on the page moves.
  (function () {
    var tabs = document.querySelectorAll('.gallery-tab');
    if (!tabs.length) return;
    var panels = document.querySelectorAll('[data-gallery-panel]');

    function activate(name) {
      tabs.forEach(function (t) {
        var on = t.dataset.gallery === name;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panels.forEach(function (p) {
        p.hidden = p.dataset.galleryPanel !== name;
      });
    }

    tabs.forEach(function (t) {
      t.addEventListener('click', function () { activate(t.dataset.gallery); });
    });
  })();

  // ---------- home page only: ping the daily hit counter
  // Fire and forget. The workflow at .github/workflows/daily-total.yml reads from this counter.
  //
  // Owner opt-out so my own visits don't inflate the count. Visiting the site with
  // ?nocount=1 once stores a flag in THIS browser's localStorage and suppresses the
  // counter from then on; ?nocount=0 clears it. Invisible to every other visitor:
  // no UI, no prompt, their visits always count.
  var path = window.location.pathname;
  var isHome = path === '/' || path.endsWith('/index.html');

  var ownerExcluded = false;
  try {
    var params = new URLSearchParams(window.location.search);
    if (params.has('nocount')) {
      if (params.get('nocount') === '0') {
        localStorage.removeItem('rwd_nocount');
      } else {
        localStorage.setItem('rwd_nocount', '1');
      }
    }
    ownerExcluded = localStorage.getItem('rwd_nocount') === '1';
  } catch (e) { /* storage blocked (e.g. private mode): just count normally */ }

  if (isHome && !ownerExcluded) {
    fetch('https://api.counterapi.dev/v1/rwdenmark/portfolio-2026/up').catch(function () {});
  }

  // ---------- recent commits feed (renders wherever #recent-commits exists; the Projects page)
  // Reads a static commits.json generated ~hourly by .github/workflows/recent-commits.yml.
  // Server-side generation avoids the unauthenticated GitHub API rate limit (60/hour per IP)
  // that used to silently blank this section. No-ops if the file is missing or empty.
  (function () {
    var mount = document.getElementById('recent-commits');
    if (!mount) return;

    function escapeHtml(s) {
      return String(s).replace(/[<>&"]/g, function (c) {
        return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c];
      });
    }
    function relativeTime(iso) {
      var d = new Date(iso);
      var diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60) return 'now';
      if (diff < 3600) return Math.round(diff / 60) + 'm ago';
      if (diff < 86400) return Math.round(diff / 3600) + 'h ago';
      if (diff < 86400 * 7) return Math.round(diff / 86400) + 'd ago';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    var url = mount.dataset.commitsUrl || 'commits.json';
    fetch(url)
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (commits) {
        if (!Array.isArray(commits) || commits.length === 0) return;

        var html = '<h2 class="section-title">Recent Activity</h2><ul class="commits-list">';
        commits.forEach(function (c) {
          html += '<li class="commit-item">' +
            '<a class="commit-repo" href="' + c.url + '" rel="noopener noreferrer" target="_blank">' + escapeHtml(c.repo) + '</a>' +
            '<span class="commit-msg">' + escapeHtml(c.message) + '</span>' +
            '<time class="commit-time" datetime="' + c.date + '">' + relativeTime(c.date) + '</time>' +
            '</li>';
        });
        html += '</ul>';
        mount.innerHTML = html;
      })
      .catch(function () { /* silently skip if the cache file is missing or unreadable */ });
  })();

  // ---------- pulse background: fill the visible height with animated wire tiles.
  // The de-patterned pulse uses fixed 280px tiles; a tall (zoomed-out) viewport would run
  // out of rows and leave the lower area empty. This builds just enough tiles to cover the
  // height and adds more on resize/zoom. Each tile holds 3 lines with spaced random starts
  // and a 2-16s reveal; the first tile pins the 2.0s and 16.0s endpoints. Left/right stay
  // mirror-symmetric (same delays; the right strip is flipped in CSS).
  (function () {
    var svgs = document.querySelectorAll('.bg-pulse');
    if (!svgs.length) return;
    var NS = 'http://www.w3.org/2000/svg';
    var TILE = 280, MAXT = 30, L = 1226.28, START_S = 889.71, DASH = 18, STEP = 1 / 30;
    var S_MIN = 521.45, S_MAX = 1085.652;
    var DUR = { pa: 20, pb: 857 / 30, pc: 706 / 30 };
    var V = [[0,40],[70,40],[90,60],[150,60],[170,40],[350,40],[370,60],[430,60],[450,40],
             [630,40],[650,60],[710,60],[730,40],[910,40],[930,60],[990,60],[1010,40],[1120,40]];
    var seg = [], acc = 0, i;
    for (i = 1; i < V.length; i++) {
      var d = Math.hypot(V[i][0] - V[i-1][0], V[i][1] - V[i-1][1]);
      seg.push([acc, acc + d, V[i-1][0], V[i][0]]); acc += d;
    }
    function sx(v) {
      for (var j = 0; j < seg.length; j++) {
        var g = seg[j];
        if (v >= g[0] && v <= g[1]) return g[2] + (g[3] - g[2]) * ((v - g[0]) / (g[1] - g[0]));
      }
      return 1120;
    }
    function rnd() { return S_MIN + Math.random() * (S_MAX - S_MIN); }
    function delay(c, s) {
      var frac = (((s - START_S) / L) % 1 + 1) % 1, m = Math.round((frac * DUR[c]) / STEP);
      var ph = m === 0 ? '0s' : '-' + (+(m * STEP).toFixed(5)) + 's';
      return ph + ', ' + (+(DUR[c] * (L - DASH - s) / L).toFixed(2)) + 's';
    }
    function band(first) {
      var a, b, c, xs;
      for (var k = 0; k < 3000; k++) {
        a = first ? S_MAX : rnd(); b = first ? S_MIN : rnd(); c = rnd();
        xs = [sx(a), sx(b), sx(c)];
        if (Math.min(Math.abs(xs[0]-xs[1]), Math.abs(xs[0]-xs[2]), Math.abs(xs[1]-xs[2])) >= 100) break;
      }
      return { pa: delay('pa', a), pb: delay('pb', b), pc: delay('pc', c) };
    }
    var bands = [], rows = ['pa', 'pb', 'pc'];
    function fill() {
      var need = Math.min(MAXT, Math.ceil(window.innerHeight / TILE) + 1);
      while (bands.length < need) bands.push(band(bands.length === 0));
      for (var n = 0; n < svgs.length; n++) {
        var grp = svgs[n].querySelector('g');
        if (!grp) continue;
        var cur = grp.children.length;
        while (cur < need) {
          var tg = document.createElementNS(NS, 'g');
          tg.setAttribute('transform', 'translate(0,' + (cur * TILE) + ')');
          for (var r = 0; r < 3; r++) {
            var u = document.createElementNS(NS, 'use');
            u.setAttribute('class', rows[r]);
            u.setAttribute('style', 'animation-delay:' + bands[cur][rows[r]]);
            u.setAttribute('href', '#wire-' + rows[r][1]);
            tg.appendChild(u);
          }
          grp.appendChild(tg); cur++;
        }
        while (cur > need) { grp.removeChild(grp.lastChild); cur--; }
      }
    }
    for (var z = 0; z < svgs.length; z++) {
      var sg = svgs[z].querySelector('g');
      if (sg) sg.textContent = '';
    }
    fill();
    var tm;
    window.addEventListener('resize', function () { clearTimeout(tm); tm = setTimeout(fill, 200); });
  })();
})();

(function () {
  'use strict';

  // ---------- footer: replace "Last updated" with the page's actual modified date
  document.querySelectorAll('.last-updated').forEach(function (el) {
    var d = new Date(document.lastModified);
    if (!isNaN(d)) {
      el.textContent = d.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    }
  });

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
  var path = window.location.pathname;
  var isHome = path === '/' || path.endsWith('/index.html');
  if (isHome) {
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
})();

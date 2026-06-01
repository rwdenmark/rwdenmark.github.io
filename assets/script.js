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

  // ---------- home page only: ping the daily hit counter
  // Fire and forget. The workflow at .github/workflows/daily-total.yml reads from this counter.
  var path = window.location.pathname;
  var isHome = path === '/' || path.endsWith('/index.html');
  if (isHome) {
    fetch('https://api.counterapi.dev/v1/rwdenmark/portfolio-2026/up').catch(function () {});
  }

  // ---------- recent commits feed (homepage only)
  // Auto-discovers your most-recently-pushed public repos (excluding forks and archived),
  // then fetches recent commits from each. Shows the 5 most recent across all.
  // No auth, no maintenance. Silently no-ops on failure or rate limit.
  (function () {
    if (!isHome) return;
    var mount = document.getElementById('recent-commits');
    if (!mount) return;

    var OWNER = 'rwdenmark';
    var MAX_REPOS = 5;
    var PER_REPO = 3;
    var TOTAL = 5;
    // Skip the portfolio repo itself so the feed surfaces engineering work, not site tweaks.
    var EXCLUDE = { 'rwdenmark.github.io': true };

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

    var reposUrl = 'https://api.github.com/users/' + OWNER + '/repos?sort=pushed&per_page=30';
    fetch(reposUrl)
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (repos) {
        if (!Array.isArray(repos)) return [];
        return repos
          .filter(function (r) { return !r.fork && !r.archived && !EXCLUDE[r.name]; })
          .slice(0, MAX_REPOS)
          .map(function (r) { return r.name; });
      })
      .then(function (repoNames) {
        if (repoNames.length === 0) return [];
        var fetches = repoNames.map(function (repo) {
          var url = 'https://api.github.com/repos/' + OWNER + '/' + repo + '/commits?per_page=' + PER_REPO;
          return fetch(url)
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (arr) {
              return (Array.isArray(arr) ? arr : []).map(function (c) {
                return {
                  repo: repo,
                  message: (c.commit && c.commit.message ? c.commit.message.split('\n')[0] : ''),
                  date: (c.commit && c.commit.author && c.commit.author.date) ||
                        (c.commit && c.commit.committer && c.commit.committer.date),
                  url: c.html_url
                };
              });
            })
            .catch(function () { return []; });
        });
        return Promise.all(fetches);
      })
      .then(function (results) {
        if (!results || results.length === 0) return;
        var all = [];
        results.forEach(function (arr) { all = all.concat(arr); });
        all.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
        var commits = all.slice(0, TOTAL);

        if (commits.length === 0) return;

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
      .catch(function () { /* silently skip on network error or rate limit */ });
  })();
})();

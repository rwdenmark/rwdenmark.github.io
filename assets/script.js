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
  // Public GitHub events API, no auth. Silently no-ops on failure or rate limit.
  (function () {
    if (!isHome) return;
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

    console.log('[commits] fetch starting');
    fetch('https://api.github.com/users/rwdenmark/events/public')
      .then(function (r) {
        console.log('[commits] response status:', r.status, 'ok:', r.ok);
        return r.ok ? r.json() : [];
      })
      .then(function (events) {
        console.log('[commits] events received, count:', Array.isArray(events) ? events.length : 'NOT AN ARRAY');
        var typeCounts = {};
        events.forEach(function (e) { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1; });
        console.log('[commits] event types:', typeCounts);
        console.log('[commits] first event:', events[0]);
        var firstPush = events.find(function (e) { return e.type === 'PushEvent'; });
        console.log('[commits] first PushEvent payload keys:', firstPush ? Object.keys(firstPush.payload || {}) : 'none');
        console.log('[commits] first PushEvent payload:', firstPush ? firstPush.payload : 'none');
        var commits = [];
        var seen = {};
        events.forEach(function (e) {
          if (e.type !== 'PushEvent' || !e.payload || !e.payload.commits) return;
          var repoFull = e.repo && e.repo.name;
          if (!repoFull) return;
          var repoShort = repoFull.split('/').pop();
          e.payload.commits.forEach(function (c) {
            if (commits.length >= 5) return;
            if (seen[c.sha]) return;
            seen[c.sha] = true;
            commits.push({
              repo: repoShort,
              message: c.message.split('\n')[0],
              date: e.created_at,
              url: 'https://github.com/' + repoFull + '/commit/' + c.sha
            });
          });
        });

        console.log('[commits] parsed commits, count:', commits.length, commits);

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
      .catch(function (err) { console.error('[commits] fetch/parse error:', err); });
  })();
})();

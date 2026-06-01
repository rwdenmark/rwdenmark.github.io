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

  // ---------- fade-in on scroll
  // Applies .fade-in to selected blocks then reveals them as they enter the viewport.
  // CSS handles the actual transition. Reduced-motion users skip the hidden state via CSS.
  (function () {
    if (!('IntersectionObserver' in window)) return;
    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    var selectors = [
      'main .section-title',
      'main > .container > p',
      'main .testimonial-card',
      'main .reference-card',
      'main .project-card',
      'main .skill-row',
      'main .job',
      'main #recent-commits'
    ].join(',');

    var els = document.querySelectorAll(selectors);
    els.forEach(function (el) { el.classList.add('fade-in'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    els.forEach(function (el) { io.observe(el); });
  })();

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

    fetch('https://api.github.com/users/rwdenmark/events/public')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (events) {
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
      .catch(function () { /* silently skip on network error */ });
  })();
})();

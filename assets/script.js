(function () {
  'use strict';

  document.addEventListener('dragstart', function (e) {
    if (e.target && e.target.tagName === 'IMG') e.preventDefault();
  });

  (function () {
    var els = document.querySelectorAll('.last-updated');
    if (!els.length) return;
    function fmt(y, m, d) {
      return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    }
    // The date itself is rendered at build from _data/last_updated.yml,
    // this pass only reformats YYYY-MM-DD into the long form.
    els.forEach(function (el) {
      var f = /^(\d{4})-(\d{2})-(\d{2})/.exec(el.textContent.trim());
      if (f) el.textContent = fmt(+f[1], +f[2], +f[3]);
    });
  })();

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

    // Copy the address AND let the mailto proceed. A page cannot detect whether
    // a mail app is configured, so this covers both cases: a mail app opens with
    // the address ready, and without one the visitor still has it on the clipboard.
    link.addEventListener('click', function () {
      var addr = link.getAttribute('href').replace('mailto:', '');
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

  (function () {
    var tabs = document.querySelectorAll('.gallery-tab');
    if (!tabs.length) return;
    var panels = document.querySelectorAll('[data-gallery-panel]');

    function activate(name) {
      tabs.forEach(function (t) {
        var on = t.dataset.gallery === name;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.setAttribute('tabindex', on ? '0' : '-1');
      });
      panels.forEach(function (p) {
        p.hidden = p.dataset.galleryPanel !== name;
      });
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { activate(t.dataset.gallery); });
      t.addEventListener('keydown', function (e) {
        var next;
        if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        else return;
        e.preventDefault();
        tabs[next].focus();
        activate(tabs[next].dataset.gallery);
      });
    });
  })();

  (function () {
    var thumbs = document.querySelectorAll('.gallery .card img');
    if (!thumbs.length) return;

    var GAP = 24;

    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Photo viewer');
    box.innerHTML =
      '<button type="button" class="lightbox-btn lightbox-nav lightbox-prev" aria-label="Previous photo"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg></button>' +
      '<button type="button" class="lightbox-btn lightbox-nav lightbox-next" aria-label="Next photo"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg></button>' +
      '<button type="button" class="lightbox-btn lightbox-close" aria-label="Close viewer"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg></button>' +
      '<div class="lightbox-viewport"><div class="lightbox-track">' +
        '<div class="lightbox-slide"><img class="lightbox-img" alt="" /></div>' +
        '<div class="lightbox-slide"><img class="lightbox-img" alt="" /></div>' +
        '<div class="lightbox-slide"><img class="lightbox-img" alt="" /></div>' +
      '</div></div>';
    document.body.appendChild(box);

    var viewport = box.querySelector('.lightbox-viewport');
    var track = box.querySelector('.lightbox-track');
    var slides = [].slice.call(track.children);
    var slideImgs = slides.map(function (s) { return s.querySelector('img'); });
    var btnPrev = box.querySelector('.lightbox-prev');
    var btnNext = box.querySelector('.lightbox-next');
    var btnClose = box.querySelector('.lightbox-close');

    var group = [];
    var index = 0;
    var lastFocus = null;
    var W = 0;
    var animating = false;
    var finishNav = null;
    // Touch-primary devices only (phones, tablets). A touchscreen laptop driven
    // by a mouse keeps the arrow buttons. Matches the CSS hide rule.
    var touchDevice = window.matchMedia &&
      window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    var bgRegions = [].slice.call(document.querySelectorAll('header, main, footer'));

    function wrap(i) { return (i + group.length) % group.length; }

    function fillSlide(imgEl, srcImg) {
      // data-full points at the original photo when the thumb is a srcset variant.
      imgEl.src = srcImg.dataset.full || srcImg.currentSrc || srcImg.src;
      imgEl.alt = srcImg.alt || '';
    }

    function renderStrip() {
      fillSlide(slideImgs[1], group[index]);
      fillSlide(slideImgs[0], group[wrap(index - 1)]);
      fillSlide(slideImgs[2], group[wrap(index + 1)]);
    }

    function baseX() { return -(W + GAP); }

    function setTransform(x, y, animate) {
      track.style.transition = animate ? '' : 'none';
      track.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    }

    function centerTrack(animate) {
      W = viewport.clientWidth;
      slides.forEach(function (s) { s.style.width = W + 'px'; });
      setTransform(baseX(), 0, animate);
    }

    function goTo(dir) {
      if (animating || group.length < 2) return;
      animating = true;
      setTransform(baseX() - dir * (W + GAP), 0, true);
      var done = false, timer;
      function finish() {
        if (done) return;
        done = true;
        clearTimeout(timer);
        track.removeEventListener('transitionend', onEnd);
        finishNav = null;
        index = wrap(index + dir);
        renderStrip();
        centerTrack(false);
        animating = false;
      }
      function onEnd(e) { if (e.propertyName === 'transform') finish(); }
      track.addEventListener('transitionend', onEnd);
      finishNav = finish;
      timer = setTimeout(finish, 700);
    }

    function updateNavButtons() {
      var shown = group.length > 1 && !touchDevice;
      btnPrev.style.display = shown ? '' : 'none';
      btnNext.style.display = shown ? '' : 'none';
    }

    function open(img) {
      var panel = img.closest('.gallery');
      group = [].slice.call(panel.querySelectorAll('.card img'));
      index = group.indexOf(img);
      lastFocus = img;
      updateNavButtons();
      renderStrip();
      box.classList.add('open');
      bgRegions.forEach(function (el) { el.setAttribute('aria-hidden', 'true'); });
      document.body.style.overflow = 'hidden';
      centerTrack(false);
      btnClose.focus();
      document.addEventListener('keydown', onKey);
    }

    function close() {
      box.classList.remove('open');
      bgRegions.forEach(function (el) { el.removeAttribute('aria-hidden'); });
      document.body.style.overflow = '';
      box.style.background = '';
      document.removeEventListener('keydown', onKey);
      if (lastFocus) lastFocus.focus();
    }

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goTo(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(-1); }
      else if (e.key === 'Tab') {
        var f = [].slice.call(box.querySelectorAll('button')).filter(function (b) {
          return b.style.display !== 'none';
        });
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    thumbs.forEach(function (img) {
      img.setAttribute('role', 'button');
      img.setAttribute('tabindex', '0');
      img.setAttribute('aria-label', 'View larger: ' + (img.alt || 'photo'));
      img.addEventListener('click', function () { open(img); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
      });
    });

    btnPrev.addEventListener('click', function () { goTo(-1); });
    btnNext.addEventListener('click', function () { goTo(1); });
    btnClose.addEventListener('click', close);

    var didDrag = false;
    box.addEventListener('click', function (e) {
      if (didDrag) { didDrag = false; return; }
      if (e.target.closest('.lightbox-img') || e.target.closest('button')) return;
      close();
    });

    var touchX = 0, touchY = 0, dragging = false, axis = null;
    box.addEventListener('touchstart', function (e) {
      if (e.touches.length > 1) { dragging = false; return; }
      if (animating && finishNav) finishNav();
      var t = e.changedTouches[0];
      touchX = t.clientX; touchY = t.clientY;
      dragging = true; axis = null; didDrag = false;
      W = viewport.clientWidth;
    }, { passive: true });
    box.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      var t = e.changedTouches[0];
      var dx = t.clientX - touchX, dy = t.clientY - touchY;
      if (axis === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        didDrag = true;
      }
      if (axis === 'x') {
        var damp = group.length > 1 ? dx : dx * 0.3;
        setTransform(baseX() + damp, 0, false);
      } else {
        setTransform(baseX(), dy, false);
        var prog = Math.min(Math.abs(dy) / 320, 1);
        box.style.background = 'rgba(1, 4, 9, ' + (0.92 - prog * 0.72) + ')';
      }
    }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (!dragging) return;
      dragging = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - touchX, dy = t.clientY - touchY;
      if (axis === 'x' && group.length > 1 && Math.abs(dx) > 40) {
        goTo(dx < 0 ? 1 : -1);
      } else if (axis === 'y' && Math.abs(dy) > 90) {
        close();
      } else if (axis === 'y') {
        box.style.background = '';
        setTransform(baseX(), 0, true);
      } else {
        setTransform(baseX(), 0, true);
      }
    }, { passive: true });

    window.addEventListener('resize', function () {
      if (!box.classList.contains('open')) return;
      if (animating && finishNav) { finishNav(); return; }
      centerTrack(false);
    });
  })();

  var path = window.location.pathname.replace(/index\.html$/, '');

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
  } catch (e) {}

  // Count this pageview in GoatCounter (bot-filtered, no cookies, visitors
  // deduplicated server-side). Owner excluded via rwd_nocount above.
  if (!ownerExcluded) {
    var gcImg = new Image();
    gcImg.src = 'https://rwdenmark.goatcounter.com/count' +
      '?p=' + encodeURIComponent(path || '/') +
      '&t=' + encodeURIComponent(document.title) +
      '&r=' + encodeURIComponent(document.referrer) +
      '&rnd=' + Math.random().toString(36).slice(2);
  }

  (function () {
    // The Recent Activity list is rendered at build from _data/commits.json.
    // This pass only upgrades the build-time short dates to live relative times.
    var times = document.querySelectorAll('time.commit-time[datetime]');
    if (!times.length) return;

    function relativeTime(iso) {
      var d = new Date(iso);
      var diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60) return 'now';
      if (diff < 3600) return Math.round(diff / 60) + 'm ago';
      if (diff < 86400) return Math.round(diff / 3600) + 'h ago';
      if (diff < 86400 * 7) return Math.round(diff / 86400) + 'd ago';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    times.forEach(function (t) {
      t.textContent = relativeTime(t.getAttribute('datetime'));
    });
  })();

  (function () {
    // Live Demo failover. Probe the self-hosted app, open it if up, else use the Render copy. Also wakes the Neon DB.
    var demoLinks = document.querySelectorAll('a.demo-link[data-home]');
    if (!demoLinks.length) return;

    var HEALTH = 'api/health';
    var TIMEOUT_MS = 1500;
    function withSlash(u) { return u.charAt(u.length - 1) === '/' ? u : u + '/'; }

    // One readable probe of EDI's health endpoint (the one app that sends CORS
    // headers) answers for the whole box, since all apps share it. res.ok proves
    // the app tier is actually serving, an opaque no-cors probe cannot tell a
    // Funnel 502 from healthy.
    var ediLink = null;
    for (var i = 0; i < demoLinks.length; i++) {
      if (demoLinks[i].dataset.home.indexOf('/edi') !== -1) { ediLink = demoLinks[i]; break; }
    }
    var pingUrl = ediLink ? withSlash(ediLink.dataset.home) + HEALTH : null;

    function boxOnline(ms) {
      if (!pingUrl) return Promise.resolve(false);
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, ms);
      return fetch(pingUrl, { signal: ctrl.signal, cache: 'no-store' })
        .then(function (res) { clearTimeout(timer); return res.ok; })
        .catch(function () { clearTimeout(timer); return false; });
    }

    document.addEventListener('click', function (e) {
      var link = e.target.closest('a.demo-link[data-home]');
      if (!link) return;
      e.preventDefault();

      // Open the tab synchronously so it isn't blocked as a popup (an async open would be).
      var tab = window.open('', '_blank');
      if (tab) {
        tab.opener = null; // same protection the plain links get from rel=noopener
        // Style the interstitial about:blank via DOM (document.write is deprecated).
        try {
          tab.document.title = 'Connecting…';
          var meta = tab.document.createElement('meta');
          meta.name = 'color-scheme';
          meta.content = 'dark';
          tab.document.head.appendChild(meta);
          tab.document.body.style.margin = '0';
          tab.document.body.style.background = '#0d1117';
        } catch (err) {}
      }
      var home = link.dataset.home;
      var cloud = link.getAttribute('href'); // Render fallback from the template
      var label = link.textContent;
      link.textContent = 'Connecting…';

      boxOnline(TIMEOUT_MS).then(function (online) {
        var target = cloud;
        if (online) {
          target = home;
        } else {
          // box or app tier is down, warm the Render copy's Neon before we land there
          fetch(withSlash(cloud) + HEALTH, { cache: 'no-store', mode: 'no-cors' }).catch(function () {});
        }
        link.textContent = label;
        if (tab) { tab.location = target; }
        else { window.location.href = target; } // popup blocked, fall back to same tab
      });
    });

    // Status dots. The shared boxOnline probe drives every dot since all apps share one box.
    var projDots = document.querySelectorAll('.project-dot');
    var notes = document.querySelectorAll('.project-note');
    if (projDots.length && ediLink) {
      var STATUS_KEY = 'rwd_selfHostOnline';

      var applyStatus = function (online) {
        projDots.forEach(function (d) { d.style.display = online ? 'inline-block' : 'none'; });
        // Box is up, the demo loads instantly, so drop the cold-start note.
        notes.forEach(function (n) { n.style.display = online ? 'none' : ''; });
      };

      // Paint last-known status first so the cold-start note doesn't flash for returning visitors.
      var cached = null;
      try { cached = localStorage.getItem(STATUS_KEY); } catch (err) {}
      if (cached === 'true' || cached === 'false') {
        applyStatus(cached === 'true');
      } else {
        projDots.forEach(function (d) { d.style.display = 'none'; });
        notes.forEach(function (n) { n.style.display = 'none'; });
      }

      var refreshStatus = function () {
        boxOnline(2000).then(function (online) {
          applyStatus(online);
          try { localStorage.setItem(STATUS_KEY, String(online)); } catch (err) {}
        });
      };
      // Poll only while the tab is visible. Hidden tabs stop pinging, and a
      // returning visitor gets one immediate refresh so the dot is never stale.
      var pollTimer = null;
      var startPolling = function () {
        if (pollTimer) return;
        refreshStatus();
        pollTimer = setInterval(refreshStatus, 30000);
      };
      var stopPolling = function () {
        clearInterval(pollTimer);
        pollTimer = null;
      };
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) stopPolling();
        else startPolling();
      });
      if (!document.hidden) startPolling();
    }
  })();

  (function () {
    var svgs = document.querySelectorAll('.bg-pulse');
    if (!svgs.length) return;
    var NS = 'http://www.w3.org/2000/svg';
    // Coupled to the dash arrays in default.html and the durations in style.css. Change one, change all three.
    var TILE = 280, MAXT = 30, L = 1226.28, START_S = 889.71, DASH = 18, STEP = 1 / 30;
    var S_MIN = 521.45, S_MAX = 1085.652;
    var DUR = { pa: 20, pb: 857 / 30, pc: 706 / 30 };
    var V = [[0,40],[70,40],[90,60],[150,60],[170,40],[350,40],[370,60],[430,60],[450,40],
             [630,40],[650,60],[710,60],[730,40],[910,40],[930,60],[990,60],[1010,40],[1160,40]];
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
      return 1160;
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

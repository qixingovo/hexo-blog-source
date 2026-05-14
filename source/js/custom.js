/**
 * Blog Custom JS — Reference Blog Style
 * - BlurredBubbles canvas background
 * - Profile hero card (HiCard style)
 * - Glassmorphism article card grid
 * - Local search
 */
(function () {
  var isHome = location.pathname === '/' || location.pathname === '/index.html';

  // ============================================================
  // 0. UTILS
  // ============================================================
  function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // Simplex-like noise for organic bubble movement
  var perm = [];
  (function () {
    for (var i = 0; i < 256; i++) perm[i] = i;
    for (var j = 0; j < 256; j++) {
      var k = (Math.random() * 256) | 0;
      var t = perm[j]; perm[j] = perm[k]; perm[k] = t;
    }
    for (var l = 0; l < 256; l++) perm[l + 256] = perm[l];
  })();

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }
  function grad(h, x, y) {
    var g = h & 3;
    return (g < 2 ? x : -x) + (g === 0 || g === 3 ? y : -y);
  }
  function noise2D(x, y) {
    var X = (x | 0) & 255, Y = (y | 0) & 255;
    var xf = x - (x | 0), yf = y - (y | 0);
    var u = fade(xf), v = fade(yf);
    var a = perm[perm[X] + Y], b = perm[perm[X + 1] + Y];
    var c = perm[perm[X] + Y + 1], d = perm[perm[X + 1] + Y + 1];
    return lerp(lerp(grad(a, xf, yf), grad(b, xf - 1, yf), u),
                lerp(grad(c, xf, yf - 1), grad(d, xf - 1, yf - 1), u), v);
  }

  // ============================================================
  // 1. BLURRED BUBBLES BACKGROUND
  // ============================================================
  function initBubbles() {
    var bg = document.getElementById('web_bg');
    if (!bg) return;

    var canvas = document.createElement('canvas');
    canvas.id = 'bubbles-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
    bg.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var bubbles = [], animId, lastTime = 0;
    var FPS = 8;
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    function getColors() {
      return isDark
        ? ['rgba(42,72,243,0.25)', 'rgba(81,208,185,0.18)', 'rgba(100,100,255,0.15)',
           'rgba(42,72,243,0.15)', 'rgba(81,208,185,0.22)', 'rgba(80,60,180,0.18)']
        : ['rgba(247,218,57,0.35)', 'rgba(143,219,233,0.4)', 'rgba(255,254,248,0.45)',
           'rgba(247,218,57,0.28)', 'rgba(143,219,233,0.48)', 'rgba(255,254,248,0.35)'];
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn() {
      var W = window.innerWidth, H = window.innerHeight;
      var colors = getColors();
      bubbles.length = 0;
      for (var i = 0; i < 6; i++) {
        bubbles.push({
          x: W * 0.1 + Math.random() * W * 0.8,
          y: H * 0.7 + Math.random() * H * 0.4,
          r: 200 + Math.random() * 200,
          vx: 0, vy: 0,
          color: colors[i],
          seed: Math.random() * 1000,
          targetX: 0, targetY: 0
        });
      }
    }

    function update(ts) {
      var W = window.innerWidth, H = window.innerHeight;
      var t = ts * 0.00015;

      for (var i = 0; i < bubbles.length; i++) {
        var b = bubbles[i];
        var nx = noise2D(b.x * 0.0008, b.y * 0.0008 + b.seed) * 1.5;
        var ny = noise2D(b.x * 0.0008 + b.seed, b.y * 0.0008 + t) * 1.5;

        // Drift toward bottom third
        var homeY = H * 0.78;
        var pullY = (homeY - b.y) * 0.00015;

        b.vx += nx * 0.1;
        b.vy += ny * 0.1 + pullY;
        b.vx *= 0.95;
        b.vy *= 0.95;
        b.vx = Math.max(-1.2, Math.min(1.2, b.vx));
        b.vy = Math.max(-1.2, Math.min(1.2, b.vy));
        b.x += b.vx;
        b.y += b.vy;

        // Push apart overlapping bubbles
        for (var j = i + 1; j < bubbles.length; j++) {
          var b2 = bubbles[j];
          var dx = b.x - b2.x, dy = b.y - b2.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var minD = (b.r + b2.r) * 0.35;
          if (dist < minD && dist > 0) {
            var f = (minD - dist) / minD * 0.4;
            b.x += (dx / dist) * f;
            b.y += (dy / dist) * f;
            b2.x -= (dx / dist) * f;
            b2.y -= (dy / dist) * f;
          }
        }

        // Wrap horizontal, clamp vertical
        if (b.x < -b.r) b.x = W + b.r;
        if (b.x > W + b.r) b.x = -b.r;
        b.y = Math.max(-b.r * 0.3, Math.min(H + b.r * 0.3, b.y));
      }
    }

    function draw() {
      var W = window.innerWidth, H = window.innerHeight;
      ctx.clearRect(0, 0, W, H);

      for (var i = 0; i < bubbles.length; i++) {
        var b = bubbles[i];
        // Soft radial gradient: solid center fading smoothly to transparent edge
        var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, b.color);
        g.addColorStop(0.4, b.color);
        g.addColorStop(0.7, b.color.replace(/[\d.]+\)$/, '0)'));
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function tick(ts) {
      if (!lastTime) lastTime = ts;
      if (ts - lastTime > 1000 / FPS) {
        update(ts);
        draw();
        lastTime = ts;
      }
      animId = requestAnimationFrame(tick);
    }

    // Theme change
    var obs = new MutationObserver(function () {
      var newDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (newDark !== isDark) {
        isDark = newDark;
        var colors = getColors();
        for (var i = 0; i < bubbles.length; i++) bubbles[i].color = colors[i];
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Pause when hidden
    function onVis() {
      if (document.hidden) { cancelAnimationFrame(animId); animId = null; }
      else if (!animId) { lastTime = 0; animId = requestAnimationFrame(tick); }
    }

    resize();
    spawn();
    animId = requestAnimationFrame(tick);
    window.addEventListener('resize', function () { resize(); spawn(); });
    document.addEventListener('visibilitychange', onVis);
  }

  // ============================================================
  // 2. PROFILE CARD
  // ============================================================
  function initProfile() {
    if (!isHome) return;
    var container = document.getElementById('recent-posts');
    if (!container) return;

    var hour = new Date().getHours();
    var greeting = hour < 6 ? '夜深了' : hour < 9 ? '早上好' : hour < 12 ? '上午好'
      : hour < 14 ? '中午好' : hour < 18 ? '下午好' : hour < 22 ? '晚上好' : '夜深了';

    container.insertAdjacentHTML('beforebegin',
      '<div id="profile-card">' +
        '<div class="profile-avatar"><img src="/img/ymb3.png" alt="avatar" onerror="this.style.display=\'none\'"></div>' +
        '<p class="profile-greeting">' + greeting + '</p>' +
        '<h1 class="profile-name">qixingovo</h1>' +
        '<p class="profile-bio">记录技术成长，分享开发心得</p>' +
        '<div class="profile-links">' +
          '<a href="https://github.com/qixingovo" target="_blank" rel="noopener" class="profile-link-item"><i class="fab fa-github"></i><span>GitHub</span></a>' +
          '<a href="mailto:qixingovo@gmail.com" class="profile-link-item"><i class="fas fa-envelope"></i><span>Email</span></a>' +
        '</div>' +
      '</div>');
  }

  // ============================================================
  // 3. ARTICLE CARDS
  // ============================================================
  function initCards() {
    if (!isHome) return;
    var container = document.getElementById('recent-posts');
    if (!container) return;

    var items = container.querySelectorAll('.recent-post-item');
    if (items.length === 0) return;

    var pagination = container.querySelector('#pagination');
    var pagHTML = pagination ? pagination.outerHTML : '';

    var html = '<div class="cards-grid">';
    items.forEach(function (item, i) {
      var coverEl = item.querySelector('.post_cover img');
      var coverUrl = coverEl ? (coverEl.getAttribute('data-lazy-src') || coverEl.src) : '';
      if (coverUrl && coverUrl.indexOf('data:image') === 0) coverUrl = '';

      var titleEl = item.querySelector('.article-title');
      var title = titleEl ? titleEl.textContent.trim() : '';
      var url = titleEl ? titleEl.getAttribute('href') : '';

      var dateEl = item.querySelector('.post-meta-date');
      var dateText = dateEl ? dateEl.textContent.replace(/\s+/g, ' ').replace(/发表于\s*/, '').trim() : '';

      var catEl = item.querySelector('.article-meta__categories, .article-meta-categories');
      var category = catEl ? catEl.textContent.trim() : '';

      var contentEl = item.querySelector('.content');
      var excerpt = '';
      if (contentEl) {
        var t = contentEl.textContent.trim();
        excerpt = t.length > 140 ? t.substring(0, 140) + '...' : t;
      }

      html +=
        '<article class="post-card" style="--i:' + i + '">' +
          '<a class="post-card-cover" href="' + url + '">' +
            (coverUrl
              ? '<img src="' + coverUrl + '" alt="' + title + '" loading="lazy">'
              : '<div class="post-card-cover-fb"></div>') +
          '</a>' +
          '<div class="post-card-body">' +
            '<div class="post-card-meta">' +
              '<span>' + dateText + '</span>' +
              (category ? '<span class="post-card-cat">' + category + '</span>' : '') +
            '</div>' +
            '<a class="post-card-title" href="' + url + '">' + title + '</a>' +
            '<p class="post-card-excerpt">' + excerpt + '</p>' +
          '</div>' +
        '</article>';
    });

    html += '</div>';
    container.innerHTML = html + pagHTML;
  }

  // ============================================================
  // 4. SEARCH
  // ============================================================
  function initSearch() {
    var navMenus = document.querySelector('#nav #menus .menus_items');
    if (!navMenus) return;
    var searchBtn = document.createElement('div');
    searchBtn.className = 'menus_item';
    searchBtn.innerHTML = '<a id="search-button" class="site-page" title="搜索 (Ctrl+K)"><i class="fas fa-search"></i></a>';
    navMenus.appendChild(searchBtn);

    document.body.insertAdjacentHTML('beforeend',
      '<div id="search-mask"></div>' +
      '<div id="search-dialog">' +
        '<div class="search-header">' +
          '<i class="fas fa-search" style="color:var(--text-secondary)"></i>' +
          '<input id="search-input" type="text" placeholder="输入关键词搜索..." autocomplete="off">' +
          '<button class="search-close" id="search-close">&times;</button>' +
        '</div>' +
        '<div id="search-results" class="search-results">' +
          '<div class="search-empty">输入关键词开始搜索</div>' +
        '</div>' +
      '</div>');

    var searchData = null, searchLoaded = false;

    function loadData(cb) {
      if (searchLoaded) { cb(); return; }
      fetch('/search.xml').then(function (r) { return r.text(); }).then(function (xml) {
        var doc = new DOMParser().parseFromString(xml, 'text/xml');
        searchData = [];
        doc.querySelectorAll('entry').forEach(function (e) {
          var t = e.querySelector('title'), u = e.querySelector('url'), c = e.querySelector('content');
          if (t && t.textContent.trim()) {
            searchData.push({
              title: t.textContent.trim(),
              url: u ? u.textContent.trim() : '',
              content: c ? c.textContent.trim().replace(/<[^>]+>/g, '') : ''
            });
          }
        });
        searchLoaded = true;
        cb();
      });
    }

    function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    function doSearch(q) {
      var el = document.getElementById('search-results');
      if (!el) return;
      if (!q) { el.innerHTML = '<div class="search-empty">输入关键词开始搜索</div>'; return; }
      var ql = q.toLowerCase(), results = [];
      searchData.forEach(function (it) {
        var tm = it.title.toLowerCase().indexOf(ql) !== -1;
        var cm = it.content.toLowerCase().indexOf(ql) !== -1;
        if (tm || cm) {
          var ht = it.title.replace(new RegExp('(' + esc(q) + ')', 'gi'), '<mark class="search-keyword">$1</mark>');
          var idx = it.content.toLowerCase().indexOf(ql), ex;
          if (idx > -1) {
            var s = Math.max(0, idx - 30), e = Math.min(it.content.length, idx + q.length + 80);
            ex = (s > 0 ? '...' : '') + it.content.substring(s, e) + (e < it.content.length ? '...' : '');
          } else {
            ex = it.content.substring(0, 100) + (it.content.length > 100 ? '...' : '');
          }
          var he = ex.replace(new RegExp('(' + esc(q) + ')', 'gi'), '<mark class="search-keyword">$1</mark>');
          results.push({ title: ht, excerpt: he, url: it.url, score: tm ? 2 : 1 });
        }
      });
      results.sort(function (a, b) { return b.score - a.score; });
      if (!results.length) {
        el.innerHTML = '<div class="search-empty">未找到与 &quot;' + q + '&quot; 相关的结果</div>';
        return;
      }
      var h = '';
      results.forEach(function (r) {
        h += '<div class="search-result-item"><a class="search-result-title" href="' + r.url + '">' + r.title + '</a><div class="search-result-excerpt">' + r.excerpt + '</div></div>';
      });
      el.innerHTML = h;
    }

    var mask = document.getElementById('search-mask');
    var dialog = document.getElementById('search-dialog');
    var input = document.getElementById('search-input');
    var close = document.getElementById('search-close');
    var btn = document.getElementById('search-button');

    function open() {
      loadData(function () {
        mask.style.display = 'block'; dialog.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        setTimeout(function () { input.focus(); }, 200);
      });
    }
    function shut() {
      mask.style.display = 'none'; dialog.style.display = 'none';
      document.body.style.overflow = ''; input.value = '';
      var r = document.getElementById('search-results');
      if (r) r.innerHTML = '<div class="search-empty">输入关键词开始搜索</div>';
    }

    btn.addEventListener('click', open);
    close.addEventListener('click', shut);
    mask.addEventListener('click', shut);
    input.addEventListener('input', function () {
      loadData(function () { doSearch(input.value.trim()); });
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); open(); }
      if (e.key === 'Escape' && dialog.style.display === 'flex') shut();
    });
  }

  // ============================================================
  // BOOT
  // ============================================================
  function boot() {
    initBubbles();
    initSearch();
    if (isHome) {
      initProfile();
      initCards();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

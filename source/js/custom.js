/**
 * Blog Visual Overhaul v3 — 晴空主题
 * - Blurred bubbles canvas background
 * - Centered profile hero card
 * - Soft glassmorphism article cards
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

  // Perlin-like noise (simplified for bubbles)
  var noisePerm = [];
  (function initNoise() {
    for (var i = 0; i < 256; i++) noisePerm[i] = i;
    for (var j = 0; j < 256; j++) {
      var k = (Math.random() * 256) | 0;
      var tmp = noisePerm[j]; noisePerm[j] = noisePerm[k]; noisePerm[k] = tmp;
    }
    for (var l = 0; l < 256; l++) noisePerm[l + 256] = noisePerm[l];
  })();

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }
  function grad(hash, x, y) {
    var h = hash & 3;
    return (h < 2 ? x : -x) + (h === 0 || h === 3 ? y : -y);
  }
  function noise2D(x, y) {
    var X = (x | 0) & 255, Y = (y | 0) & 255;
    var xf = x - (x | 0), yf = y - (y | 0);
    var u = fade(xf), v = fade(yf);
    var a = noisePerm[noisePerm[X] + Y], b = noisePerm[noisePerm[X + 1] + Y];
    var c = noisePerm[noisePerm[X] + Y + 1], d = noisePerm[noisePerm[X + 1] + Y + 1];
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

    var bubbles = [];
    var BUBBLE_COUNT = 6;
    var animId;
    var lastTime = 0;
    var targetFPS = 8;

    function readBubbleColors() {
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      return isDark
        ? ['rgba(42,72,243,0.35)', 'rgba(81,208,185,0.25)', 'rgba(100,100,255,0.2)', 'rgba(42,72,243,0.2)', 'rgba(81,208,185,0.3)', 'rgba(80,60,180,0.25)']
        : ['rgba(247,218,57,0.45)', 'rgba(143,219,233,0.45)', 'rgba(255,254,248,0.55)', 'rgba(247,218,57,0.35)', 'rgba(143,219,233,0.55)', 'rgba(255,254,248,0.4)'];
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }

    function createBubbles() {
      var W = window.innerWidth;
      var H = window.innerHeight;
      var colors = readBubbleColors();
      bubbles.length = 0;
      for (var i = 0; i < BUBBLE_COUNT; i++) {
        bubbles.push({
          x: Math.random() * W,
          y: H * 0.8 + Math.random() * H * 0.4, // bias toward bottom 80%
          r: 200 + Math.random() * 200,           // radius 200-400
          vx: 0, vy: 0,
          color: colors[i],
          seed: Math.random() * 1000
        });
      }
    }

    function update(timestamp) {
      var W = window.innerWidth, H = window.innerHeight;
      var t = timestamp * 0.00015; // time factor for noise

      for (var i = 0; i < bubbles.length; i++) {
        var b = bubbles[i];
        // Noise-driven gentle drift
        var nx = noise2D(b.x * 0.0008, b.y * 0.0008 + b.seed) * 2;
        var ny = noise2D(b.x * 0.0008 + b.seed, b.y * 0.0008 + t) * 2;

        // Keep bubbles roughly in the bottom area
        var targetY = H * 0.75;
        var yBias = (targetY - b.y) * 0.0002;

        b.vx += nx * 0.12;
        b.vy += ny * 0.12 + yBias;
        b.vx *= 0.95; // damping
        b.vy *= 0.95;
        b.vx = Math.max(-1.5, Math.min(1.5, b.vx));
        b.vy = Math.max(-1.5, Math.min(1.5, b.vy));
        b.x += b.vx;
        b.y += b.vy;

        // Separation between bubbles
        for (var j = i + 1; j < bubbles.length; j++) {
          var b2 = bubbles[j];
          var dx = b.x - b2.x, dy = b.y - b2.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var minD = (b.r + b2.r) * 0.4;
          if (dist < minD && dist > 0) {
            var force = (minD - dist) / minD * 0.5;
            b.x += (dx / dist) * force;
            b.y += (dy / dist) * force;
            b2.x -= (dx / dist) * force;
            b2.y -= (dy / dist) * force;
          }
        }

        // Wrap horizontally, clamp vertically
        if (b.x < -b.r) b.x = W + b.r;
        if (b.x > W + b.r) b.x = -b.r;
        b.y = Math.max(-b.r * 0.5, Math.min(H + b.r * 0.5, b.y));
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 0.85;
      for (var i = 0; i < bubbles.length; i++) {
        var b = bubbles[i];
        // Radial gradient to simulate a soft blurred bubble
        var grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0, b.color);
        grad.addColorStop(0.5, b.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function animate(timestamp) {
      if (!lastTime) lastTime = timestamp;
      var elapsed = timestamp - lastTime;
      // Draw at low FPS for soft feel
      if (elapsed > 1000 / targetFPS) {
        update(timestamp);
        draw();
        lastTime = timestamp;
      }
      animId = requestAnimationFrame(animate);
    }

    // Theme observer
    var themeObserver = new MutationObserver(function () {
      var colors = readBubbleColors();
      for (var i = 0; i < bubbles.length; i++) {
        bubbles[i].color = colors[i];
      }
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Visibility
    function onVis() {
      if (document.hidden) { cancelAnimationFrame(animId); animId = null; }
      else if (!animId) { lastTime = 0; animId = requestAnimationFrame(animate); }
    }

    resize();
    createBubbles();
    animId = requestAnimationFrame(animate);

    window.addEventListener('resize', function () { resize(); createBubbles(); });
    document.addEventListener('visibilitychange', onVis);
  }

  // ============================================================
  // 2. PROFILE HERO CARD
  // ============================================================
  function initHero() {
    if (!isHome) return;
    var container = document.getElementById('recent-posts');
    if (!container) return;

    var greeting = '';
    var hour = new Date().getHours();
    if (hour < 6) greeting = '夜深了';
    else if (hour < 9) greeting = '早上好';
    else if (hour < 12) greeting = '上午好';
    else if (hour < 14) greeting = '中午好';
    else if (hour < 18) greeting = '下午好';
    else if (hour < 22) greeting = '晚上好';
    else greeting = '夜深了';

    var heroHTML =
      '<div id="profile-card">' +
        '<div class="profile-avatar">' +
          '<img src="/img/ymb3.png" alt="avatar" onerror="this.style.display=\'none\'">' +
        '</div>' +
        '<p class="profile-greeting">' + greeting + '</p>' +
        '<h1 class="profile-name">qixingovo</h1>' +
        '<p class="profile-bio">记录技术成长，分享开发心得</p>' +
        '<div class="profile-links">' +
          '<a href="https://github.com/qixingovo" target="_blank" rel="noopener" class="profile-link-item">' +
            '<i class="fab fa-github"></i><span>GitHub</span>' +
          '</a>' +
          '<a href="mailto:qixingovo@gmail.com" class="profile-link-item">' +
            '<i class="fas fa-envelope"></i><span>Email</span>' +
          '</a>' +
        '</div>' +
      '</div>';

    container.insertAdjacentHTML('beforebegin', heroHTML);
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

    var cardsHTML = '<div class="cards-grid">';
    items.forEach(function (item, i) {
      var coverEl = item.querySelector('.post_cover img');
      var coverUrl = coverEl ? (coverEl.getAttribute('data-lazy-src') || coverEl.src) : '';
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

      cardsHTML +=
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

    cardsHTML += '</div>';
    container.innerHTML = cardsHTML + pagHTML;
  }

  // ============================================================
  // 4. LOCAL SEARCH
  // ============================================================
  function initSearch() {
    var navMenus = document.querySelector('#nav #menus .menus_items');
    if (!navMenus) return;
    var searchBtn = document.createElement('div');
    searchBtn.className = 'menus_item';
    searchBtn.innerHTML = '<a id="search-button" class="site-page" title="搜索 (Ctrl+K)"><i class="fas fa-search"></i></a>';
    navMenus.appendChild(searchBtn);

    var searchHTML =
      '<div id="search-mask"></div>' +
      '<div id="search-dialog">' +
        '<div class="search-header">' +
          '<i class="fas fa-search" style="color:#999"></i>' +
          '<input id="search-input" type="text" placeholder="输入关键词搜索..." autocomplete="off">' +
          '<button class="search-close" id="search-close">&times;</button>' +
        '</div>' +
        '<div id="search-results" class="search-results">' +
          '<div class="search-empty">输入关键词开始搜索</div>' +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML('beforeend', searchHTML);

    var searchData = null;
    var searchLoaded = false;

    function loadSearchData(cb) {
      if (searchLoaded) { cb(); return; }
      fetch('/search.xml')
        .then(function (r) { return r.text(); })
        .then(function (xml) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(xml, 'text/xml');
          var entries = doc.querySelectorAll('entry');
          searchData = [];
          entries.forEach(function (entry) {
            var title = entry.querySelector('title');
            var url = entry.querySelector('url');
            var content = entry.querySelector('content');
            if (title && title.textContent.trim()) {
              searchData.push({
                title: title.textContent.trim(),
                url: url ? url.textContent.trim() : '',
                content: content ? content.textContent.trim().replace(/<[^>]+>/g, '') : ''
              });
            }
          });
          searchLoaded = true;
          cb();
        });
    }

    function escapeRegex(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function doSearch(query) {
      var container = document.getElementById('search-results');
      if (!container) return;
      if (!query) { container.innerHTML = '<div class="search-empty">输入关键词开始搜索</div>'; return; }
      var q = query.toLowerCase();
      var results = [];
      searchData.forEach(function (item) {
        var titleMatch = item.title.toLowerCase().indexOf(q) !== -1;
        var contentMatch = item.content.toLowerCase().indexOf(q) !== -1;
        if (titleMatch || contentMatch) {
          var hlTitle = item.title.replace(new RegExp('(' + escapeRegex(q) + ')', 'gi'), '<mark class="search-keyword">$1</mark>');
          var idx = item.content.toLowerCase().indexOf(q);
          var excerpt;
          if (idx > -1) {
            var start = Math.max(0, idx - 30);
            var end = Math.min(item.content.length, idx + q.length + 80);
            excerpt = (start > 0 ? '...' : '') + item.content.substring(start, end) + (end < item.content.length ? '...' : '');
          } else {
            excerpt = item.content.substring(0, 100) + (item.content.length > 100 ? '...' : '');
          }
          var hlExcerpt = excerpt.replace(new RegExp('(' + escapeRegex(q) + ')', 'gi'), '<mark class="search-keyword">$1</mark>');
          results.push({ title: hlTitle, excerpt: hlExcerpt, url: item.url, score: titleMatch ? 2 : 1 });
        }
      });
      results.sort(function (a, b) { return b.score - a.score; });
      if (results.length === 0) {
        container.innerHTML = '<div class="search-empty">未找到与 &quot;' + query + '&quot; 相关的结果</div>';
        return;
      }
      var html = '';
      results.forEach(function (r) {
        html += '<div class="search-result-item"><a class="search-result-title" href="' + r.url + '">' + r.title + '</a><div class="search-result-excerpt">' + r.excerpt + '</div></div>';
      });
      container.innerHTML = html;
    }

    var searchMask = document.getElementById('search-mask');
    var searchDialog = document.getElementById('search-dialog');
    var searchInput = document.getElementById('search-input');
    var searchClose = document.getElementById('search-close');
    var searchButton = document.getElementById('search-button');

    function openSearch() {
      loadSearchData(function () {
        searchMask.style.display = 'block';
        searchDialog.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        setTimeout(function () { searchInput.focus(); }, 200);
      });
    }
    function closeSearch() {
      searchMask.style.display = 'none';
      searchDialog.style.display = 'none';
      document.body.style.overflow = '';
      searchInput.value = '';
      var results = document.getElementById('search-results');
      if (results) results.innerHTML = '<div class="search-empty">输入关键词开始搜索</div>';
    }

    searchButton.addEventListener('click', openSearch);
    searchClose.addEventListener('click', closeSearch);
    searchMask.addEventListener('click', closeSearch);
    searchInput.addEventListener('input', function () {
      loadSearchData(function () { doSearch(searchInput.value.trim()); });
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
      if (e.key === 'Escape' && searchDialog.style.display === 'flex') { closeSearch(); }
    });
  }

  // ============================================================
  // BOOT
  // ============================================================
  function boot() {
    initBubbles();
    initSearch();
    if (isHome) {
      initHero();
      initCards();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

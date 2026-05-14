/**
 * Blog Custom JS
 * - Dual layout: Aurora (default) / Reference (YYsuni style)
 * - Local search (both modes)
 * - Layout toggle with localStorage persistence
 */
(function () {
  var isHome = location.pathname === '/' || location.pathname === '/index.html';
  var layout = localStorage.getItem('blog-layout') || 'aurora';

  // ============================================================
  // 0. NOISE UTILS (for bubbles)
  // ============================================================
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
  function grad(h, x, y) { var g = h & 3; return (g < 2 ? x : -x) + (g === 0 || g === 3 ? y : -y); }
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
  // 1. REFERENCE MODE — Blurred Bubbles Background
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
        ? ['rgba(42,72,243,0.25)','rgba(81,208,185,0.18)','rgba(100,100,255,0.15)',
           'rgba(42,72,243,0.15)','rgba(81,208,185,0.22)','rgba(80,60,180,0.18)']
        : ['rgba(247,218,57,0.35)','rgba(143,219,233,0.4)','rgba(255,254,248,0.45)',
           'rgba(247,218,57,0.28)','rgba(143,219,233,0.48)','rgba(255,254,248,0.35)'];
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
          seed: Math.random() * 1000
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
        var pullY = (H * 0.78 - b.y) * 0.00015;
        b.vx += nx * 0.1;
        b.vy += ny * 0.1 + pullY;
        b.vx *= 0.95; b.vy *= 0.95;
        b.vx = Math.max(-1.2, Math.min(1.2, b.vx));
        b.vy = Math.max(-1.2, Math.min(1.2, b.vy));
        b.x += b.vx; b.y += b.vy;

        for (var j = i + 1; j < bubbles.length; j++) {
          var b2 = bubbles[j];
          var dx = b.x - b2.x, dy = b.y - b2.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var minD = (b.r + b2.r) * 0.35;
          if (dist < minD && dist > 0) {
            var f = (minD - dist) / minD * 0.4;
            b.x += (dx / dist) * f; b.y += (dy / dist) * f;
            b2.x -= (dx / dist) * f; b2.y -= (dy / dist) * f;
          }
        }
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
      if (ts - lastTime > 1000 / FPS) { update(ts); draw(); lastTime = ts; }
      animId = requestAnimationFrame(tick);
    }

    var obs = new MutationObserver(function () {
      var nd = document.documentElement.getAttribute('data-theme') === 'dark';
      if (nd !== isDark) { isDark = nd; var c = getColors(); for (var i = 0; i < bubbles.length; i++) bubbles[i].color = c[i]; }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    function onVis() {
      if (document.hidden) { cancelAnimationFrame(animId); animId = null; }
      else if (!animId) { lastTime = 0; animId = requestAnimationFrame(tick); }
    }

    resize(); spawn();
    animId = requestAnimationFrame(tick);
    window.addEventListener('resize', function () { resize(); spawn(); });
    document.addEventListener('visibilitychange', onVis);
  }

  // ============================================================
  // 2. REFERENCE MODE — Profile Card
  // ============================================================
  function initReferenceProfile() {
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
      '</div>');
  }

  // ============================================================
  // 3. REFERENCE MODE — Article Cards
  // ============================================================
  function initReferenceCards() {
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
  // 4. AURORA MODE — Featured Posts Hero
  // ============================================================
  function initFeaturedPosts() {
    if (!isHome) return;
    var container = document.getElementById('recent-posts');
    if (!container) return;

    var featured = [{
      title: '博客说明 / 新手索引',
      url: '/2026/04/17/blog-guide/',
      date: '2026-04-17',
      cover: '/img/default_cover/p2.jpg',
      excerpt: '快速了解博客结构、阅读入口和更新节奏。'
    }];
    if (featured.length === 0) return;

    var heroHTML = '<div id="featured-posts">';
    if (featured.length === 1) {
      var p = featured[0];
      heroHTML +=
        '<div class="featured-single">' +
          '<div class="featured-badge">⭐ 置顶</div>' +
          '<img class="featured-cover" src="' + p.cover + '" alt="" onerror="this.style.display=\'none\'">' +
          '<div class="featured-info">' +
            '<a class="featured-title" href="' + p.url + '">' + p.title + '</a>' +
            '<div class="featured-meta">' + p.date + '</div>' +
            '<div class="featured-excerpt">' + p.excerpt + '</div>' +
          '</div>' +
        '</div>';
    } else {
      heroHTML += '<div class="featured-multi">';
      featured.forEach(function (p) {
        heroHTML +=
          '<div class="featured-mini">' +
            '<a class="featured-title" href="' + p.url + '">⭐ ' + p.title + '</a>' +
            '<div class="featured-meta">' + p.date + '</div>' +
          '</div>';
      });
      heroHTML += '</div>';
    }
    heroHTML += '</div>';
    container.insertAdjacentHTML('afterbegin', heroHTML);
  }

  // ============================================================
  // 5. AURORA MODE — Reading Time
  // ============================================================
  function initReadingTime() {
    if (!isHome) return;
    var cards = document.querySelectorAll('#recent-posts .recent-post-item');
    cards.forEach(function (card) {
      var contentEl = card.querySelector('.content');
      if (!contentEl) return;
      var text = contentEl.textContent.trim();
      var charCount = text.length;
      var chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
      var nonChineseWords = text.replace(/[\u4e00-\u9fff]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
      var readingMinutes = Math.max(1, Math.ceil((chineseChars + nonChineseWords * 2) / 400));
      var metaWrap = card.querySelector('.article-meta-wrap');
      if (!metaWrap) return;
      if (metaWrap.querySelector('.reading-time')) return;
      var rtHTML = '<span class="article-meta reading-time">' +
        '<span class="article-meta-separator">|</span>' +
        '<i class="fas fa-clock"></i>约 ' + readingMinutes + ' 分钟' +
        '<span class="article-meta-separator">|</span>' +
        '<i class="fas fa-file-word"></i>' + charCount + ' 字' +
      '</span>';
      metaWrap.insertAdjacentHTML('beforeend', rtHTML);
    });
  }

  // ============================================================
  // 6. LOCAL SEARCH (both modes)
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

    var searchData = null, searchLoaded = false;

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

    function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

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
          var excerpt = item.content;
          var idx = item.content.toLowerCase().indexOf(q);
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
  // 7. LAYOUT TOGGLE BUTTON
  // ============================================================
  function initLayoutToggle() {
    var rightside = document.getElementById('rightside');
    if (!rightside) return;

    var isRef = layout === 'reference';
    var btn = document.createElement('div');
    btn.id = 'layout-toggle';
    btn.title = isRef ? '切换到 Aurora 模式' : '切换到卡片模式';
    btn.textContent = isRef ? '✦' : '▣';
    btn.addEventListener('click', function () {
      var next = isRef ? 'aurora' : 'reference';
      localStorage.setItem('blog-layout', next);
      location.reload();
    });
    rightside.insertBefore(btn, rightside.firstChild);
  }

  // ============================================================
  // BOOT
  // ============================================================
  function boot() {
    initSearch();

    if (layout === 'reference') {
      document.body.setAttribute('data-layout', 'reference');
      if (isHome) {
        initBubbles();
        initReferenceProfile();
        var rp = document.getElementById("recent-posts");
        if (rp) rp.style.display = "none";
      }
    } else {
      if (isHome) {
        initFeaturedPosts();
        initReadingTime();
      }
    }

    initLayoutToggle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

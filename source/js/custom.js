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
  // 2. REFERENCE MODE — Homepage Builder
  // ============================================================
  function initReferenceHomepage() {
    if (!isHome) return;
    var container = document.getElementById('recent-posts');
    if (!container) return;

    // --- Get post data from Butterfly elements ---
    var items = container.querySelectorAll('.recent-post-item');
    var posts = [];
    items.forEach(function (item) {
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
      posts.push({ coverUrl: coverUrl, title: title, url: url, dateText: dateText, category: category, excerpt: excerpt });
    });

    // --- Time-based greeting ---
    var hour = new Date().getHours();
    var greeting = hour < 6 ? 'Good Night' : hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : hour < 22 ? 'Good Evening' : 'Good Night';

    // --- Clock ---
    var now = new Date();
    var hh = ('0' + now.getHours()).slice(-2);
    var mm = ('0' + now.getMinutes()).slice(-2);

    // --- Calendar ---
    var year = now.getFullYear();
    var month = now.getMonth();
    var today = now.getDate();
    var currentDayOfWeek = (now.getDay() + 6) % 7; // Monday=0
    var firstDayOfMonth = new Date(year, month, 1);
    var firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7;
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var dayNames = ['\u4e00', '\u4e8c', '\u4e09', '\u56db', '\u4e94', '\u516d', '\u65e5'];
    var calHeaderHTML = dayNames.map(function (name, i) {
      return '<div class="calendar-day-name' + (i === currentDayOfWeek ? ' today' : '') + '">' + name + '</div>';
    }).join('');
    var calCellsHTML = '';
    for (var ei = 0; ei < firstDayWeekday; ei++) calCellsHTML += '<div class="calendar-day empty"></div>';
    for (var d2 = 1; d2 <= daysInMonth; d2++) {
      calCellsHTML += '<div class="calendar-day' + (d2 === today ? ' today' : '') + '">' + d2 + '</div>';
    }
    var dowNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var calDateStr = year + '/' + (month + 1) + '/' + today + ' ' + dowNames[now.getDay()];

    // --- Latest article (first post) ---
    var latest = posts.length > 0 ? posts[0] : null;
    var articleCardHTML = '';
    if (latest) {
      articleCardHTML =
        '<div id="article-card" class="ref-card" style="animation-delay:0.34s">' +
          '<p class="article-card-label">\u6700\u65b0\u6587\u7ae0</p>' +
          '<a class="article-card-link" href="' + latest.url + '">' +
            (latest.coverUrl
              ? '<img class="article-card-cover" src="' + latest.coverUrl + '" alt="" loading="lazy">'
              : '<div class="article-card-cover-fb">+</div>') +
            '<div class="article-card-info">' +
              '<h3 class="article-card-title">' + latest.title + '</h3>' +
              (latest.excerpt ? '<p class="article-card-summary">' + latest.excerpt + '</p>' : '') +
              '<p class="article-card-date">' + latest.dateText + '</p>' +
            '</div>' +
          '</a>' +
        '</div>';
    }

    var html =
      '<div id="reference-home">' +
        // HiCard
        '<div id="hi-card" class="ref-card" style="animation-delay:0.1s">' +
          '<img class="hi-avatar" src="/img/ymb3.png" alt="avatar" onerror="this.style.display=\'none\'">' +
          '<p class="hi-greeting">' + greeting + '<br>I\'m <span class="hi-name">qixingovo</span>, Nice to<br>meet you!</p>' +
        '</div>' +
        // Social Buttons
        '<div id="social-buttons">' +
          '<a href="https://github.com/qixingovo" target="_blank" rel="noopener" class="social-btn social-btn-github" style="animation-delay:0.15s">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>' +
            '<span>GitHub</span>' +
          '</a>' +
          '<a href="mailto:qixingovo@gmail.com" class="social-btn" style="animation-delay:0.18s">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>' +
            '<span>Email</span>' +
          '</a>' +
        '</div>' +
        // Clock + Calendar row
        '<div style="display:flex;gap:36px;flex-wrap:wrap;justify-content:center;max-width:500px;width:100%">' +
          '<div id="clock-card" class="ref-card" style="animation-delay:0.22s;flex:1;min-width:140px">' +
            '<div class="clock-display">' +
              '<span class="clock-digit">' + hh[0] + '</span>' +
              '<span class="clock-digit">' + hh[1] + '</span>' +
              '<span class="clock-colon">:</span>' +
              '<span class="clock-digit">' + mm[0] + '</span>' +
              '<span class="clock-digit">' + mm[1] + '</span>' +
            '</div>' +
          '</div>' +
          '<div id="calendar-card" class="ref-card" style="animation-delay:0.28s;flex:2;min-width:200px;padding:20px 24px">' +
            '<p class="calendar-header">' + calDateStr + '</p>' +
            '<div class="calendar-grid">' +
              calHeaderHTML +
              calCellsHTML +
            '</div>' +
          '</div>' +
        '</div>' +
        // Article card (latest)
        articleCardHTML +
      '</div>';

    container.outerHTML = html;

    // Update clock every 30 seconds
    setInterval(function () {
      var n2 = new Date();
      var h2 = ('0' + n2.getHours()).slice(-2);
      var m2 = ('0' + n2.getMinutes()).slice(-2);
      var digits = document.querySelectorAll('#clock-card .clock-digit');
      if (digits.length >= 4) {
        digits[0].textContent = h2[0];
        digits[1].textContent = h2[1];
        digits[2].textContent = m2[0];
        digits[3].textContent = m2[1];
      }
    }, 30000);
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
        initReferenceHomepage();
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

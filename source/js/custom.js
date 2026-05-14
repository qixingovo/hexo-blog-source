/**
 * Blog Visual Overhaul v2
 * - LiquidGrass Canvas background animation
 * - Aurora Hero with typewriter
 * - Card-grid homepage rendering
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

  // ============================================================
  // 1. LIQUIDGRASS CANVAS
  // ============================================================
  function initLiquidGrass() {
    var bg = document.getElementById('web_bg');
    if (!bg) return;

    var canvas = document.createElement('canvas');
    canvas.id = 'liquid-grass-canvas';
    bg.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var particles = [];
    var mouse = { x: -1000, y: -1000, active: false };
    var animId;
    var PARTICLE_COUNT = window.innerWidth < 768 ? 60 : 100;
    var CONNECT_DIST = 140;
    var MOUSE_RADIUS = 130;

    function readColors() {
      return [
        getCSSVar('--aurora-c1') || '#4facfe',
        getCSSVar('--aurora-c2') || '#7367f0',
        getCSSVar('--aurora-c3') || '#f093fb'
      ];
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createParticles() {
      particles.length = 0;
      var colors = readColors();
      for (var i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          baseX: Math.random() * canvas.width,
          baseY: Math.random() * canvas.height,
          x: 0, y: 0,
          size: 1.2 + Math.random() * 2.4,
          speed: 0.3 + Math.random() * 0.6,
          phaseX: Math.random() * Math.PI * 2,
          phaseY: Math.random() * Math.PI * 2,
          ampX: 25 + Math.random() * 50,
          ampY: 15 + Math.random() * 35,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    }

    function update(timestamp) {
      var t = timestamp * 0.001;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x = p.baseX + Math.sin(t * p.speed + p.phaseX) * p.ampX;
        p.y = p.baseY + Math.cos(t * p.speed * 0.7 + p.phaseY) * p.ampY;

        // Mouse interaction — gentle push away
        if (mouse.active) {
          var dx = p.x - mouse.x;
          var dy = p.y - mouse.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MOUSE_RADIUS && dist > 0) {
            var force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
            p.x += (dx / dist) * force * 4;
            p.y += (dy / dist) * force * 4;
          }
        }

        // Wrap around edges
        if (p.x < -50) p.x = canvas.width + 50;
        if (p.x > canvas.width + 50) p.x = -50;
        if (p.y < -50) p.y = canvas.height + 50;
        if (p.y > canvas.height + 50) p.y = -50;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var dx = particles[i].x - particles[j].x;
          var dy = particles[i].y - particles[j].y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            var opacity = (1 - dist / CONNECT_DIST) * 0.12;
            ctx.strokeStyle = particles[i].color.replace(')', ', ' + opacity + ')').replace('rgb', 'rgba');
            if (particles[i].color.startsWith('#')) {
              ctx.strokeStyle = particles[i].color + Math.round(opacity * 255).toString(16).padStart(2, '0');
            }
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (var k = 0; k < particles.length; k++) {
        var p = particles[k];
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function animate(timestamp) {
      update(timestamp);
      draw();
      animId = requestAnimationFrame(animate);
    }

    // Handlers
    function onMouseMove(e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }
    function onMouseLeave() { mouse.active = false; }
    function onTouchMove(e) {
      if (e.touches.length) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        mouse.active = true;
      }
    }
    function onTouchEnd() { mouse.active = false; }

    // Theme change observer
    var themeObserver = new MutationObserver(function () {
      var colors = readColors();
      for (var i = 0; i < particles.length; i++) {
        particles[i].color = colors[Math.floor(Math.random() * colors.length)];
      }
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Visibility handler — pause when tab hidden
    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(animId);
        animId = null;
      } else if (!animId) {
        animId = requestAnimationFrame(animate);
      }
    }

    resize();
    createParticles();
    animId = requestAnimationFrame(animate);

    window.addEventListener('resize', function () { resize(); createParticles(); });
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('visibilitychange', onVisibility);
  }

  // ============================================================
  // 2. AURORA HERO
  // ============================================================
  function initHero() {
    if (!isHome) return;
    var container = document.getElementById('recent-posts');
    if (!container) return;

    var slogans = [
      '记录技术成长，分享开发心得',
      '探索代码之美',
      'Stay Hungry, Stay Foolish'
    ];

    var heroHTML =
      '<div id="aurora-hero">' +
        '<h1 class="hero-title">qixingovo-blog</h1>' +
        '<div class="hero-subtitle">' +
          '<span id="typewriter-text"></span>' +
          '<span class="typewriter-cursor">|</span>' +
        '</div>' +
        '<div class="hero-scroll-hint">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>' +
        '</div>' +
      '</div>';

    container.insertAdjacentHTML('beforebegin', heroHTML);

    // Typewriter
    var twEl = document.getElementById('typewriter-text');
    var cursorEl = document.querySelector('.typewriter-cursor');
    if (!twEl) return;

    var sloganIdx = 0;
    var charIdx = 0;
    var isDeleting = false;
    var twTimer;

    function type() {
      var text = slogans[sloganIdx];
      if (!isDeleting) {
        charIdx++;
        twEl.textContent = text.substring(0, charIdx);
        if (charIdx >= text.length) {
          twTimer = setTimeout(type, 2000);
          isDeleting = true;
          return;
        }
        twTimer = setTimeout(type, 80 + Math.random() * 40);
      } else {
        charIdx--;
        twEl.textContent = text.substring(0, charIdx);
        if (charIdx <= 0) {
          isDeleting = false;
          sloganIdx = (sloganIdx + 1) % slogans.length;
          twTimer = setTimeout(type, 400);
          return;
        }
        twTimer = setTimeout(type, 40 + Math.random() * 20);
      }
    }
    twTimer = setTimeout(type, 600);

    // Blink cursor
    setInterval(function () {
      if (cursorEl) {
        cursorEl.style.opacity = cursorEl.style.opacity === '0' ? '1' : '0';
      }
    }, 530);

    // Scroll parallax + fade
    var hero = document.getElementById('aurora-hero');
    function onScroll() {
      var scrollY = window.scrollY || window.pageYOffset;
      var heroH = hero.offsetHeight;
      var progress = Math.min(scrollY / heroH, 1);
      hero.style.opacity = (1 - progress * 1.1).toFixed(2);
      hero.style.transform = 'translateY(' + (scrollY * 0.25) + 'px)';
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ============================================================
  // 3. CARD GRID RENDERING
  // ============================================================
  function initCards() {
    if (!isHome) return;
    var container = document.getElementById('recent-posts');
    if (!container) return;

    var items = container.querySelectorAll('.recent-post-item');
    if (items.length === 0) return;

    var cardsHTML = '<div class="aurora-cards-grid">';
    items.forEach(function (item, i) {
      var coverEl = item.querySelector('.post_cover img');
      var coverUrl = coverEl ? (coverEl.getAttribute('data-lazy-src') || coverEl.src) : '';
      var titleEl = item.querySelector('.article-title');
      var title = titleEl ? titleEl.textContent.trim() : '';
      var url = titleEl ? titleEl.getAttribute('href') : '';

      var dateEl = item.querySelector('.post-meta-date');
      var dateText = dateEl ? dateEl.textContent.replace(/\s+/g, ' ').trim() : '';

      var catEl = item.querySelector('.article-meta__categories, .article-meta-categories');
      var category = catEl ? catEl.textContent.trim() : '';

      var contentEl = item.querySelector('.content');
      var excerpt = '';
      if (contentEl) {
        var t = contentEl.textContent.trim();
        excerpt = t.length > 160 ? t.substring(0, 160) + '...' : t;
      }

      // Estimate reading time
      var charCount = excerpt.replace(/[\s\r\n]/g, '').length;
      var chineseChars = (excerpt.match(/[\u4e00-\u9fff]/g) || []).length;
      var nonChinese = excerpt.replace(/[\u4e00-\u9fff]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
      var readingMin = Math.max(1, Math.ceil((chineseChars + nonChinese * 2) / 400));

      cardsHTML +=
        '<article class="aurora-card" style="animation-delay:' + (i * 0.07) + 's">' +
          '<a class="aurora-card-cover" href="' + url + '" aria-label="' + title + '">' +
            (coverUrl
              ? '<img src="' + coverUrl + '" alt="' + title + '" loading="lazy">'
              : '<div class="aurora-card-cover-fallback"></div>') +
            '<div class="aurora-card-cover-shine"></div>' +
          '</a>' +
          '<div class="aurora-card-body">' +
            '<div class="aurora-card-meta">' +
              '<span class="aurora-card-date"><i class="far fa-calendar-alt"></i> ' + dateText + '</span>' +
              (category ? '<span class="aurora-card-category"><i class="fas fa-folder"></i> ' + category + '</span>' : '') +
              '<span class="aurora-card-reading"><i class="fas fa-clock"></i> ' + readingMin + ' min</span>' +
            '</div>' +
            '<a class="aurora-card-title" href="' + url + '">' + title + '</a>' +
            '<p class="aurora-card-excerpt">' + excerpt + '</p>' +
            '<a class="aurora-card-readmore" href="' + url + '">' +
              '阅读更多' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>' +
            '</a>' +
          '</div>' +
        '</article>';
    });

    cardsHTML += '</div>';

    // Preserve pagination
    var pagination = container.querySelector('#pagination');
    var pagHTML = pagination ? pagination.outerHTML : '';

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
      if (!query) {
        container.innerHTML = '<div class="search-empty">输入关键词开始搜索</div>';
        return;
      }
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
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
      if (e.key === 'Escape' && searchDialog.style.display === 'flex') {
        closeSearch();
      }
    });
  }

  // ============================================================
  // BOOT
  // ============================================================
  function boot() {
    initLiquidGrass();
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

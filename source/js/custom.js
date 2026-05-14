/**
 * Blog Visual Overhaul — Custom JS
 * Features: local search, featured posts hero, reading time display
 */
(function () {
  var isHome = location.pathname === '/' || location.pathname === '/index.html';

  // ============================================================
  // 1. LOCAL SEARCH
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
  // 2. FEATURED POSTS HERO
  // ============================================================
  function initFeaturedPosts() {
    if (!isHome) return;

    var featured = [
      {
        title: '博客说明 / 新手索引',
        url: '/2026/04/17/blog-guide/',
        date: '2026-04-17',
        cover: '/img/default_cover/p2.jpg',
        excerpt: '快速了解博客结构、阅读入口和更新节奏。'
      }
    ];

    if (featured.length === 0) return;

    var container = document.getElementById('recent-posts');
    if (!container) return;

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
  // 3. READING TIME DISPLAY
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
  // BOOT
  // ============================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initSearch();
      initFeaturedPosts();
      initReadingTime();
    });
  } else {
    initSearch();
    initFeaturedPosts();
    initReadingTime();
  }
})();

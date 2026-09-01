/* -------------------------------------------------------------------------- *
 * Balmoral Running - theme behaviour
 *
 * The live storefront drives these interactions through Locomotive Scroll,
 * Swiper, Windmill and a set of custom elements. Only the behaviour the markup
 * actually depends on is reimplemented here, in plain JS with no dependencies:
 *
 *   - header scroll state (--js-scroll-min / --js-scroll-up / --js-scroll-down)
 *   - aria-controls panel toggles (mobile nav, cart drawer, search bar)
 *   - lazy <video> promotion from data-src, played muted and inline
 *   - product card colour-swatch rollover
 *   - localization selects submitting their form on change
 *   - horizontal drag scrolling for the text-columns row below 768px
 * -------------------------------------------------------------------------- */

(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;

  /* -- scrollbar width, read once and exposed the way theme.css expects ---- */
  function setScrollbarWidth() {
    var width = window.innerWidth - root.clientWidth;
    root.style.setProperty('--scrollbar-width', width + 'px');
  }

  /* -- header state ------------------------------------------------------- */
  var header = document.getElementById('site-header');
  var headerBg = header && header.querySelector('.site-header__bg');
  var lastScroll = window.scrollY;

  function onScroll() {
    var y = window.scrollY;
    var threshold = header ? header.offsetHeight : 60;

    body.classList.toggle('--js-scroll-min', y > threshold);

    // Direction is only meaningful once past the very top of the document.
    if (y > threshold) {
      body.classList.toggle('--js-scroll-up', y < lastScroll);
      body.classList.toggle('--js-scroll-down', y > lastScroll);
    } else {
      body.classList.add('--js-scroll-up');
      body.classList.remove('--js-scroll-down');
    }

    // The white plate behind the header is opacity-animated inline; theme.css
    // only ships its transition and resting state.
    if (headerBg) headerBg.style.opacity = y > threshold ? '1' : '0';

    lastScroll = y;
  }

  /* -- panels (mobile nav, cart drawer, search bar) ------------------------ */
  var PANEL_ROOT_CLASS = {
    'site-nav': '--js-site-nav-opened',
    'site-header__searchbar': '--js-site-search-opened'
  };

  function setPanel(panel, open) {
    if (!panel) return;

    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      panel.removeAttribute('inert');
    } else {
      panel.setAttribute('inert', '');
    }

    var rootClass = PANEL_ROOT_CLASS[panel.id];
    if (rootClass) root.classList.toggle(rootClass, open);

    // Keep every control that points at this panel in sync, including the one
    // inside the panel itself (the cart drawer's close button and backdrop).
    var controls = document.querySelectorAll('[aria-controls="' + panel.id + '"]');
    Array.prototype.forEach.call(controls, function (control) {
      if (control.hasAttribute('aria-expanded')) {
        control.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
    });

    if (open) {
      var focusable = panel.querySelector('input, button, a[href], select');
      if (focusable) focusable.focus();
    }
  }

  function closeAllPanels(except) {
    ['site-nav', 'site-cart', 'site-header__searchbar'].forEach(function (id) {
      if (id === except) return;
      var panel = document.getElementById(id);
      if (panel && panel.getAttribute('aria-hidden') === 'false') setPanel(panel, false);
    });
  }

  function onPanelControlClick(event) {
    var control = event.target.closest('[aria-controls]');
    if (!control) return;

    var panel = document.getElementById(control.getAttribute('aria-controls'));
    if (!panel) return;

    // Only intercept the three panels this theme owns.
    if (!/^(site-nav|site-cart|site-header__searchbar)$/.test(panel.id)) return;

    event.preventDefault();

    var open = panel.getAttribute('aria-hidden') !== 'false';
    closeAllPanels(open ? panel.id : null);
    setPanel(panel, open);
  }

  function onKeydown(event) {
    if (event.key === 'Escape') closeAllPanels(null);
  }

  /* -- lazy videos -------------------------------------------------------- */
  function initVideos() {
    var videos = document.querySelectorAll('video[data-src]');
    if (!videos.length) return;

    function play(video) {
      if (!video.src) video.src = video.getAttribute('data-src');
      var attempt = video.play();
      // Autoplay can still be refused; the poster stays visible if so.
      if (attempt && attempt.catch) attempt.catch(function () {});
    }

    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(videos, play);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            play(entry.target);
          } else if (entry.target.src) {
            entry.target.pause();
          }
        });
      },
      { rootMargin: '200px 0px' }
    );

    Array.prototype.forEach.call(videos, function (video) {
      observer.observe(video);
    });
  }

  /* -- colour swatch rollover --------------------------------------------- */
  function initSwatches() {
    document.addEventListener('pointerover', function (event) {
      var swatch = event.target.closest('.product-preview__color');
      if (!swatch) return;

      var card = swatch.closest('.product-preview');
      if (!card) return;

      var image = card.querySelector('.product-preview__img');
      var price = card.querySelector('.product-preview__price span');
      var link = card.querySelector('.product-preview__link');

      if (image && swatch.dataset.imgSrc) {
        image.src = swatch.dataset.imgSrc;
        if (swatch.dataset.imgSrcset) image.srcset = swatch.dataset.imgSrcset;
      }
      if (price && swatch.dataset.price) price.textContent = swatch.dataset.price;
      if (link && swatch.dataset.url) link.href = swatch.dataset.url;
    });
  }

  /* -- localization switchers --------------------------------------------- */
  function initLocalization() {
    var selects = document.querySelectorAll('.localization-switcher__select');
    Array.prototype.forEach.call(selects, function (select) {
      select.addEventListener('change', function () {
        var form = select.closest('form');
        if (form) form.submit();
      });
    });
  }

  /* -- text-columns track -------------------------------------------------- */
  /* theme.css keeps `.swiper` at overflow:hidden for Swiper's benefit. Without
     Swiper the mobile track would simply clip, so make it scrollable below the
     breakpoint where the wrapper becomes a grid. */
  function initTextColumns() {
    var rows = document.querySelectorAll('.pb-row-text-columns');
    if (!rows.length) return;

    var query = window.matchMedia('(max-width: 767.98px)');

    function apply() {
      Array.prototype.forEach.call(rows, function (row) {
        if (query.matches) {
          row.style.overflowX = 'auto';
          row.style.scrollSnapType = 'x proximity';
        } else {
          row.style.overflowX = '';
          row.style.scrollSnapType = '';
        }
      });
    }

    apply();
    if (query.addEventListener) {
      query.addEventListener('change', apply);
    } else if (query.addListener) {
      query.addListener(apply);
    }
  }

  /* -- boot ---------------------------------------------------------------- */
  setScrollbarWidth();
  onScroll();
  initVideos();
  initSwatches();
  initLocalization();
  initTextColumns();

  window.addEventListener('resize', setScrollbarWidth);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('click', onPanelControlClick);
  document.addEventListener('keydown', onKeydown);
})();

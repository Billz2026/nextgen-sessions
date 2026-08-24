(() => {
  'use strict';

  const header = document.querySelector('.site-header');
  const headerInner = header?.querySelector('.header-inner');
  const nav = header?.querySelector('.nav');
  if (!header || !headerInner || !nav || header.dataset.mobileNavReady === 'true') return;

  header.dataset.mobileNavReady = 'true';
  header.classList.add('ngs-nav-ready');

  const currentPath = location.pathname.replace(/\/+$/, '') || '/';
  const links = [
    { label: 'Home', href: '/', key: 'home' },
    { label: 'Artists', href: '/artists/', key: 'artists' },
    { label: 'Releases', href: '/releases/', key: 'releases' },
    { label: 'Genres', href: '/genres/', key: 'genres' },
    { label: 'Mixes', href: '/mixes/', key: 'mixes' },
    { label: 'About', href: '/#about', key: 'about' },
    { label: 'Submit', href: '/submit', key: 'submit' },
    {
      label: 'YouTube',
      href: 'https://www.youtube.com/@NextGenSessions',
      key: 'youtube',
      className: 'nav-cta',
      external: true
    }
  ];

  function isCurrent(item) {
    if (item.key === 'home') return currentPath === '/';
    if (item.key === 'artists') return currentPath === '/artists' || currentPath.startsWith('/artists/');
    if (item.key === 'releases') return currentPath === '/releases' || currentPath.startsWith('/releases/');
    if (item.key === 'genres') return currentPath === '/genres' || currentPath.startsWith('/genres/');
    if (item.key === 'mixes') return currentPath === '/mixes' || currentPath.startsWith('/mixes/');
    if (item.key === 'submit') return currentPath === '/submit' || currentPath === '/submit.html';
    return false;
  }

  nav.replaceChildren(...links.map(item => {
    const anchor = document.createElement('a');
    anchor.textContent = item.label;
    anchor.href = item.href;
    anchor.dataset.navKey = item.key;
    if (item.className) anchor.className = item.className;
    if (item.external) {
      anchor.target = '_blank';
      anchor.rel = 'noopener';
    }
    if (isCurrent(item)) anchor.setAttribute('aria-current', 'page');
    return anchor;
  }));

  if (!nav.id) nav.id = 'primary-navigation';

  const toggle = document.createElement('button');
  toggle.className = 'nav-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', nav.id);
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open navigation menu');
  toggle.innerHTML = '<span class="nav-toggle-lines" aria-hidden="true"><span></span><span></span><span></span></span><span class="nav-toggle-label">Menu</span>';
  headerInner.insertBefore(toggle, nav);

  const backdrop = document.createElement('button');
  backdrop.className = 'nav-backdrop';
  backdrop.type = 'button';
  backdrop.tabIndex = -1;
  backdrop.setAttribute('aria-label', 'Close navigation menu');
  document.body.append(backdrop);

  const mobileQuery = window.matchMedia('(max-width: 980px)');
  let previousFocus = null;

  function focusableItems() {
    return [toggle, ...nav.querySelectorAll('a[href]')].filter(element => !element.hasAttribute('disabled'));
  }

  function setOpen(open, returnFocus = true) {
    const shouldOpen = Boolean(open && mobileQuery.matches);
    header.classList.toggle('is-menu-open', shouldOpen);
    document.body.classList.toggle('ngs-menu-open', shouldOpen);
    toggle.setAttribute('aria-expanded', String(shouldOpen));
    toggle.setAttribute('aria-label', shouldOpen ? 'Close navigation menu' : 'Open navigation menu');
    const label = toggle.querySelector('.nav-toggle-label');
    if (label) label.textContent = shouldOpen ? 'Close' : 'Menu';

    if (shouldOpen) {
      previousFocus = document.activeElement;
      requestAnimationFrame(() => nav.querySelector('a[aria-current="page"], a')?.focus({ preventScroll: true }));
    } else if (returnFocus && previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus({ preventScroll: true });
      previousFocus = null;
    }
  }

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  backdrop.addEventListener('click', () => setOpen(false));

  nav.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false, false);
  });

  document.addEventListener('keydown', event => {
    if (!header.classList.contains('is-menu-open')) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key !== 'Tab') return;
    const items = focusableItems();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  mobileQuery.addEventListener?.('change', event => {
    if (!event.matches) setOpen(false, false);
  });
})();

(() => {
  const image = document.getElementById('brandLockup');
  if (!image) return;

  const showFallback = () => {
    image.onload = () => image.classList.add('brand-lockup--fallback');
    image.onerror = null;
    image.src = '/NextGen%20Sessions%20Logo%202026.png';
  };

  fetch('/assets/brand-lockup-data.txt?v=c50c699', { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error('Brand data unavailable');
      return response.text();
    })
    .then((base64) => {
      const data = base64.trim();
      if (!data.startsWith('UklGR')) throw new Error('Invalid WebP brand data');

      image.onload = () => image.classList.add('brand-lockup--loaded');
      image.onerror = showFallback;
      image.src = `data:image/webp;base64,${data}`;
    })
    .catch(showFallback);
})();
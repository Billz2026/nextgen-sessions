(() => {
  const image = document.getElementById('brandLockup');
  if (!image) return;

  const showFallback = () => {
    image.onload = () => image.classList.add('brand-lockup--fallback');
    image.onerror = null;
    image.src = '/NextGen%20Sessions%20Logo%202026.png';
  };

  const parts = Array.from({ length: 9 }, (_, index) =>
    `/assets/brand-lockup-hq/part-${String(index).padStart(2, '0')}.txt?v=b57f437`
  );

  Promise.all(
    parts.map((url) =>
      fetch(url, { cache: 'force-cache' }).then((response) => {
        if (!response.ok) throw new Error(`Brand asset part unavailable: ${url}`);
        return response.text();
      })
    )
  )
    .then((segments) => segments.map((segment) => segment.trim()).join(''))
    .then((base64) => {
      if (base64.length !== 87632 || !base64.startsWith('AAAAIGZ0eXBhdmlm')) {
        throw new Error('Invalid AVIF brand artwork');
      }

      image.decoding = 'async';
      image.fetchPriority = 'high';
      image.onload = () => image.classList.add('brand-lockup--loaded');
      image.onerror = showFallback;
      image.src = `data:image/avif;base64,${base64}`;
    })
    .catch(showFallback);
})();

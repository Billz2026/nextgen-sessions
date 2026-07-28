(() => {
  const image = document.getElementById('brandLockup');
  if (!image) return;

  fetch('/nextgen-brand-lockup.svg?v=ca2f179', { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error('Brand asset unavailable');
      return response.text();
    })
    .then((svg) => {
      const match = svg.match(/data:image\/webp;base64,([^"'\s<]+)/);
      if (!match) throw new Error('Embedded brand artwork not found');

      const binary = atob(match[1]);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }

      const objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));
      image.addEventListener('load', () => URL.revokeObjectURL(objectUrl), { once: true });
      image.src = objectUrl;
      image.classList.add('brand-lockup--loaded');
    })
    .catch(() => {
      image.src = '/NextGen%20Sessions%20Logo%202026.png';
      image.classList.add('brand-lockup--fallback');
    });
})();

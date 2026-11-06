// Native dialogs retain modal focus trapping, Escape handling and focus restoration.
(() => {
  const initialized = new WeakSet();
  let headingId = 0;
  const prepare = (dialog) => {
    dialog.classList.add('side-overlay');
    if (!dialog.querySelector('.overlay-close')) {
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'overlay-close';
      close.textContent = 'Close ×';
      close.setAttribute('aria-label', 'Close overlay');
      close.addEventListener('click', () => dialog.close());
      dialog.append(close);
    }
    const heading = dialog.querySelector('h2, h3');
    if (heading) {
      if (!heading.id) heading.id = `overlay-heading-${++headingId}`;
      dialog.setAttribute('aria-labelledby', heading.id);
    }
    if (initialized.has(dialog)) return;
    initialized.add(dialog);
    let startedOutside = false;
    const outside = (event) => {
      const rect = dialog.getBoundingClientRect();
      return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    };
    dialog.addEventListener('pointerdown', event => { startedOutside = outside(event); });
    dialog.addEventListener('click', event => {
      if (startedOutside && outside(event)) dialog.close();
      startedOutside = false;
    });
  };
  const refresh = () => document.querySelectorAll('dialog').forEach(prepare);
  refresh();
  // Existing forms may replace their contents after submission or on reopening.
  new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true });
})();

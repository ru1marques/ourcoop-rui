(() => {
  const footer = document.querySelector('.site-footer');
  const header = document.querySelector('.hero__topbar');
  if (!footer || !header) return;
  const sectionNav = header.classList.contains('subpage-header') ? null : header.querySelector('.hero__nav');
  // Hide homepage anchors as the footer enters the viewport; restore on scrolling up.
  new IntersectionObserver(([entry]) => {
    header.classList.toggle('at-footer', entry.isIntersecting);
    if (sectionNav) {
      sectionNav.inert = entry.isIntersecting;
      if (entry.isIntersecting) sectionNav.setAttribute('aria-hidden', 'true');
      else sectionNav.removeAttribute('aria-hidden');
    }
  }).observe(footer);
  footer.querySelector('.site-footer__newsletter')?.addEventListener('submit', event => {
    event.preventDefault();
    let status = footer.querySelector('.newsletter-status');
    if (!status) {
      status = document.createElement('p'); status.className = 'newsletter-status';
      status.setAttribute('role', 'status');event.currentTarget.append(status);
    }
    status.textContent = 'Newsletter signup will be available soon.';
  });
})();

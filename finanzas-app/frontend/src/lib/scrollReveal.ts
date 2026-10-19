/**
 * Reveal-on-scroll for the blocks of a page: blocks that start below the fold wait (invisible) and
 * ease in the first time they enter the viewport, instead of animating while off-screen on load.
 * Blocks already in view keep the regular staggered entrance. Reveal happens once, never fades out.
 */
export function revealOnScroll(container: HTMLElement | null): () => void {
  if (
    !container ||
    typeof IntersectionObserver === 'undefined' ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    return () => {};
  }

  const seen = new WeakSet<Element>();

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.reveal = 'in';
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0 },
  );

  const consider = (el: HTMLElement) => {
    if (seen.has(el)) return;
    seen.add(el);
    if (getComputedStyle(el).position === 'fixed') return; // modals and overlays animate on their own
    if (el.getBoundingClientRect().top > window.innerHeight * 0.92) {
      el.dataset.reveal = 'pending';
      observer.observe(el);
    }
  };

  const scan = () => Array.from(container.children).forEach(child => consider(child as HTMLElement));
  scan();

  // Blocks that mount later (after their data loads) are considered too.
  const mutations = new MutationObserver(scan);
  mutations.observe(container, { childList: true });

  return () => {
    observer.disconnect();
    mutations.disconnect();
  };
}

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[300] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--zd-primary)] focus:text-white focus:font-semibold focus:shadow-lg"
    >
      Skip to main content
    </a>
  );
}

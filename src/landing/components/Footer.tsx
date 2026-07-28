import { Heart } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--zd-border)] bg-[var(--zd-bg)]">
      {/* Gradient accent line at top */}
      <div className="zd-section-divider" />

      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-8 md:px-12 2xl:px-16 py-10 2xl:py-14">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          {/* Left — brand */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <div className="zd-icon-ring w-7 h-7 flex items-center justify-center">
                <img
                  src="/favicon.svg"
                  alt="ZeroDock"
                  width="16"
                  height="16"
                  className="object-contain"
                />
              </div>
              <span className="text-sm font-bold text-[var(--zd-text-primary)] tracking-tight">
                Zero
                <span className="bg-gradient-to-r from-[var(--zd-primary)] to-[var(--zd-accent)] bg-clip-text text-transparent">
                  Dock
                </span>
              </span>
            </div>
            <p className="text-xs text-[var(--zd-text-muted)] flex items-center gap-1.5 font-normal m-0">
              © {year} · Made with
              <Heart size={11} className="text-[#E17055] fill-[#E17055] zd-heartbeat" />
              for privacy
            </p>
          </div>

          {/* Right — links */}
          <div className="flex items-center gap-6 flex-wrap">
            <FooterLink href="https://github.com/jaykradadiya/zerodock" label="GitHub" />
            <FooterLink
              href="https://github.com/jaykradadiya/zerodock/issues"
              label="Report a Bug"
            />
            <FooterLink
              href="https://github.com/jaykradadiya/zerodock#contributing"
              label="Contribute"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs sm:text-sm font-medium text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] no-underline transition-colors duration-200"
    >
      {label}
    </a>
  );
}

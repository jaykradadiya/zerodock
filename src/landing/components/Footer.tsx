import { Heart } from 'lucide-react';
import { SectionLabel } from '../../shared/components/ui';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="py-12 2xl:py-16 px-4 sm:px-8 md:px-12 2xl:px-16 border-t border-[var(--zd-border)] flex flex-col items-center gap-6 bg-[var(--zd-bg)]">
      <div className="w-10 h-[2px] rounded-full bg-gradient-to-r from-[var(--zd-primary)] to-[var(--zd-accent)] opacity-40" />

      <div className="flex flex-col items-center gap-3">
        <SectionLabel className="text-[var(--zd-primary)]">Community</SectionLabel>
        <div className="flex items-center gap-6 flex-wrap justify-center">
          <FooterLink href="https://github.com/jayradadiya/ZeroDock" label="GitHub" />
          <FooterLink href="https://github.com/jayradadiya/ZeroDock/issues" label="Report a Bug" />
          <FooterLink href="https://github.com/jayradadiya/ZeroDock#contributing" label="Contribute" />
        </div>
      </div>

      <p className="text-xs sm:text-sm text-[var(--zd-text-muted)] m-0 flex items-center gap-1.5 font-normal">
        © {year} ZeroDock · Made with
        <Heart size={12} className="text-[#E17055] fill-[#E17055]" />
        for privacy
      </p>
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

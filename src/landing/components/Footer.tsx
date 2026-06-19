import { Heart } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        padding: '40px clamp(16px, 5vw, 48px)',
        borderTop: '1px solid var(--zd-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      {/* Divider line — subtle accent */}
      <div
        style={{
          width: '40px',
          height: '2px',
          borderRadius: '1px',
          background: 'linear-gradient(90deg, var(--zd-primary), var(--zd-accent))',
          opacity: 0.4,
          marginBottom: '8px',
        }}
      />

      {/* Links row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <FooterLink href="https://github.com/jayradadiya/ZeroDock" label="GitHub" />
        <FooterLink href="https://github.com/jayradadiya/ZeroDock/issues" label="Report a Bug" />
        <FooterLink href="https://github.com/jayradadiya/ZeroDock#contributing" label="Contribute" />
      </div>

      {/* Copyright */}
      <p
        style={{
          fontSize: '13px',
          color: 'var(--zd-text-muted)',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        © {year} ZeroDock · Made with
        <Heart
          size={12}
          style={{ color: '#E17055', fill: '#E17055' }}
        />
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
      style={{
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--zd-text-muted)',
        textDecoration: 'none',
        transition: 'color 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--zd-text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--zd-text-muted)';
      }}
    >
      {label}
    </a>
  );
}

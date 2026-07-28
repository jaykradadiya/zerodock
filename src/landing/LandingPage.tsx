import { HeroSection } from './components/HeroSection';
import { ToolsGrid } from './components/ToolsGrid';
import { FeaturesSection } from './components/FeaturesSection';
import { CTABanner } from './components/CTABanner';
import { Footer } from './components/Footer';
import { BackgroundShell } from '../shared/components/ui';

export function LandingPage() {
  return (
    <BackgroundShell showOrbs={false}>
      <HeroSection />
      <ToolsGrid />
      <FeaturesSection />
      <CTABanner />
      <Footer />
    </BackgroundShell>
  );
}

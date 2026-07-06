import { HeroSection } from './components/HeroSection';
import { ToolsGrid } from './components/ToolsGrid';
import { FeaturesSection } from './components/FeaturesSection';
import { Footer } from './components/Footer';
import { BackgroundShell } from '../shared/components/ui';

export function LandingPage() {
  return (
    <BackgroundShell>
      <HeroSection />
      <ToolsGrid />
      <FeaturesSection />
      <Footer />
    </BackgroundShell>
  );
}

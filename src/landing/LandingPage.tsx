import { HeroSection } from './components/HeroSection';
import { ToolsGrid } from './components/ToolsGrid';
import { FeaturesSection } from './components/FeaturesSection';
import { Footer } from './components/Footer';

export function LandingPage() {
  return (
    <>
      <HeroSection />
      <ToolsGrid />
      <FeaturesSection />
      <Footer />
    </>
  );
}

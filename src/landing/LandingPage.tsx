import { HeroSection } from './components/HeroSection';
import { ToolsGrid } from './components/ToolsGrid';
import { FeaturesSection } from './components/FeaturesSection';
import { CTABanner } from './components/CTABanner';
import { Footer } from './components/Footer';
import { HomeCollections } from './components/HomeCollections';
import { BackgroundShell } from '../shared/components/ui';

export function LandingPage() {
  return (
    <BackgroundShell showOrbs={false}>
      <HeroSection />
      <div className="px-4 sm:px-8 md:px-12 max-w-7xl 2xl:max-w-[1600px] mx-auto w-full">
        <HomeCollections />
      </div>
      <ToolsGrid />
      <FeaturesSection />
      <CTABanner />
      <Footer />
    </BackgroundShell>
  );
}

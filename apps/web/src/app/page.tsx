'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePWA } from '@/hooks/usePWA';
import { trackEvent } from '@/lib/track';

import NavbarPremium from '@/components/landing/NavbarPremium';
import HeroPremium from '@/components/landing/HeroPremium';
import SocialProof from '@/components/landing/SocialProof';
import ManifiestoSection from '@/components/landing/ManifiestoSection';
import FeaturesGrid from '@/components/landing/FeaturesGrid';
import CurvedSection from '@/components/landing/CurvedSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import BenefitsSection from '@/components/landing/BenefitsSection';
import IntegrationsSection from '@/components/landing/IntegrationsSection';
import UseCasesSection from '@/components/landing/UseCasesSection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import FAQSection from '@/components/landing/FAQSection';
import CTAFinalSection from '@/components/landing/CTAFinalSection';
import FooterPremium from '@/components/landing/FooterPremium';
import AuthChoiceModal from '@/components/auth/AuthChoiceModal';

export default function LandingPageClient() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const isPWA = usePWA();

  useEffect(() => {
    trackEvent('LANDING_VIEW', 'landing');
  }, []);

  useEffect(() => {
    if (isPWA && !isLoading) {
      if (user) {
        if (user.role === 'SECRETARY' || user.role === 'PRESIDENT') {
          router.replace('/admin/meetings');
        } else {
          router.replace('/meetings');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [isPWA, user, isLoading, router]);

  const openAuthModal = () => {
    trackEvent('LANDING_CTA_CLICK', 'landing');
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-surface-0 text-ink-900 selection:bg-primary selection:text-white">
      <NavbarPremium onCTA={openAuthModal} />
      <main>
        <HeroPremium onCTA={openAuthModal} />
        <SocialProof />
        <ManifiestoSection />
        <FeaturesGrid />
        <CurvedSection onCTA={openAuthModal} />
        <HowItWorksSection />
        <BenefitsSection />
        <IntegrationsSection />
        <UseCasesSection />
        <TestimonialsSection />
        <FAQSection />
        <CTAFinalSection onCTA={openAuthModal} />
        <FooterPremium />
      </main>
      <AuthChoiceModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

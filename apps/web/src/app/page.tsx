'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { usePWA } from '@/hooks/usePWA';
import { trackEvent } from '@/lib/track';

import NavbarPremium from '@/components/landing/NavbarPremium';
import HeroPremium from '@/components/landing/HeroPremium';
import SocialProof from '@/components/landing/SocialProof';
import ManifiestoSection from '@/components/landing/ManifiestoSection';
const FeaturesGrid = dynamic(() => import('@/components/landing/FeaturesGrid'));
const CurvedSection = dynamic(() => import('@/components/landing/CurvedSection'));
const HowItWorksSection = dynamic(() => import('@/components/landing/HowItWorksSection'));
const BenefitsSection = dynamic(() => import('@/components/landing/BenefitsSection'));
const IntegrationsSection = dynamic(() => import('@/components/landing/IntegrationsSection'));
const UseCasesSection = dynamic(() => import('@/components/landing/UseCasesSection'));
const TestimonialsSection = dynamic(() => import('@/components/landing/TestimonialsSection'));
const FAQSection = dynamic(() => import('@/components/landing/FAQSection'));
const CTAFinalSection = dynamic(() => import('@/components/landing/CTAFinalSection'));
const FooterPremium = dynamic(() => import('@/components/landing/FooterPremium'));
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
        router.replace('/dashboard');
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
        <UseCasesSection />
        <FeaturesGrid />
        <CurvedSection onCTA={openAuthModal} />
        <HowItWorksSection />
        <BenefitsSection />
        <IntegrationsSection />
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

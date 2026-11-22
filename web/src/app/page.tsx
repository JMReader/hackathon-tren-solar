import type { Metadata } from "next";
import { BRAND } from "@/components/landing/content";
import { lpInter, lpMono } from "@/components/landing/fonts";
import { Audience } from "@/components/landing/sections/audience";
import { Consent, Employers } from "@/components/landing/sections/employers";
import { Faq } from "@/components/landing/sections/faq";
import { Features } from "@/components/landing/sections/features";
import { FinalCta, Footer } from "@/components/landing/sections/footer";
import { Hero } from "@/components/landing/sections/hero";
import { Nav } from "@/components/landing/sections/nav";
import { Origin } from "@/components/landing/sections/origin";
import { Proof } from "@/components/landing/sections/proof";
import { Scattered } from "@/components/landing/sections/scattered";
import { Steps } from "@/components/landing/sections/steps";

export const metadata: Metadata = {
  title: `${BRAND.name} — Que tu talento se mueva`,
  description: BRAND.tagline,
};

export default function LandingPage() {
  return (
    <div className={`lp-root ${lpInter.variable} ${lpMono.variable} flex-1 overflow-x-clip`}>
      <Nav />
      <main>
        <Hero />
        <Scattered />
        <Steps />
        <Features />
        <Proof />
        <Origin />
        <Employers />
        <Consent />
        <Audience />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

import type { Metadata } from "next"
import { Onboarding } from "@/components/onboarding/onboarding"

export const metadata: Metadata = { title: "Tu perfil" }

export default function OnboardingPage() {
  return <Onboarding />
}

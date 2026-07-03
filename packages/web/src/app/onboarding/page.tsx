import { redirect } from 'next/navigation';

// Onboarding was renamed to /signup in W2; keep the old path working.
export default function OnboardingPage() {
  redirect('/signup?service=sitevitals');
}

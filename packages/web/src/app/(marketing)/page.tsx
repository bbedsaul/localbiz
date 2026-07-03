import { Hero } from '@/components/marketing/Hero';
import { ServicesWall } from '@/components/marketing/ServicesWall';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { Testimonial } from '@/components/marketing/Testimonial';
import { PricingTeaser } from '@/components/marketing/PricingTeaser';

export default function HomePage() {
  return (
    <>
      <Hero />
      <ServicesWall />
      <HowItWorks />
      <Testimonial />
      <PricingTeaser />
    </>
  );
}

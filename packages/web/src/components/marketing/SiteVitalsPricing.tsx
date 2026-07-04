'use client';

import { useState } from 'react';
import { Card, Badge, Button } from '@/components/ui';
import { cn } from '@/lib/cn';

export function SiteVitalsPricing() {
  const [annual, setAnnual] = useState(false);
  const per = annual ? '/yr' : '/mo';
  const price = (monthly: number) => (annual ? monthly * 10 : monthly); // annual = 2 months free

  return (
    <div>
      <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1 text-sm">
        {(['monthly', 'annual'] as const).map((mode) => {
          const active = (mode === 'annual') === annual;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setAnnual(mode === 'annual')}
              className={cn(
                'rounded-full px-4 py-1.5 font-medium capitalize transition',
                active ? 'bg-green-900 text-paper-50' : 'text-charcoal-700',
              )}
            >
              {mode}
              {mode === 'annual' && <span className="ml-1 text-xs">· 2 months free</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:max-w-3xl">
        <Card className="p-6">
          <h3 className="text-xl font-bold text-green-900">Solo</h3>
          <p className="mt-2">
            <span className="font-display text-4xl font-bold text-green-900">${price(29)}</span>
            <span className="text-charcoal-500">{per}</span>
          </p>
          <p className="mt-2 text-sm text-charcoal-700">One website, full monitoring, monthly report card, email alerts.</p>
          <Button href="/signup?service=sitevitals&plan=solo" variant="outline" className="mt-5 w-full">
            Start free trial
          </Button>
        </Card>
        <Card className="relative border-green-900 p-6">
          <span className="absolute right-5 top-5">
            <Badge tone="green">Most popular</Badge>
          </span>
          <h3 className="text-xl font-bold text-green-900">Pro</h3>
          <p className="mt-2">
            <span className="font-display text-4xl font-bold text-green-900">${price(49)}</span>
            <span className="text-charcoal-500">{per}</span>
          </p>
          <p className="mt-2 text-sm text-charcoal-700">Everything in Solo, plus faster checks and priority text alerts.</p>
          <Button href="/signup?service=sitevitals&plan=pro" className="mt-5 w-full">
            Start free trial
          </Button>
        </Card>
      </div>
    </div>
  );
}

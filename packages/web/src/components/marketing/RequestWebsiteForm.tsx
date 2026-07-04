'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createWebsiteRequest, type WebsiteRequestState } from '@/actions/website-request';
import { Input, Textarea, Field, Card, buttonClass } from '@/components/ui';

const initial: WebsiteRequestState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass({ size: 'lg' })}>
      {pending ? 'Sending…' : 'Request my website'}
    </button>
  );
}

export function RequestWebsiteForm() {
  const [state, action] = useFormState(createWebsiteRequest, initial);

  if (state.ok) {
    return (
      <Card className="p-6 text-center">
        <p className="font-display text-xl font-bold text-green-900">Thanks — we&rsquo;ll be in touch.</p>
        <p className="mt-1 text-sm text-charcoal-700">
          We&rsquo;ll review what you sent and reach out to get your site started.
        </p>
      </Card>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Business name" htmlFor="business_name">
        <Input id="business_name" name="business_name" required placeholder="Joe’s HVAC" />
      </Field>
      <Field label="What you do" htmlFor="what_you_do">
        <Input id="what_you_do" name="what_you_do" placeholder="Heating & cooling repair" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" htmlFor="city">
          <Input id="city" name="city" placeholder="Austin, TX" />
        </Field>
        <Field label="Email or phone" htmlFor="contact">
          <Input id="contact" name="contact" required placeholder="joe@… or (512) …" />
        </Field>
      </div>
      <Field label="Current website (if any)" htmlFor="current_site">
        <Input id="current_site" name="current_site" placeholder="joeshvac.com" />
      </Field>
      <Field label="Anything else?" htmlFor="body">
        <Textarea id="body" name="body" placeholder="Tell us what you have in mind (optional)" />
      </Field>
      <SubmitButton />
      {state.error && <p className="text-sm text-brick-700">{state.error}</p>}
    </form>
  );
}

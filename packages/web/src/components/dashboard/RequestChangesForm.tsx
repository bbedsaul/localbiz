'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createChangeRequest, type ChangeRequestState } from '@/actions/change-requests';
import { Textarea, buttonClass } from '@/components/ui';

const initial: ChangeRequestState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass({ size: 'md' })}>
      {pending ? 'Sending…' : 'Send request'}
    </button>
  );
}

export function RequestChangesForm() {
  const [state, action] = useFormState(createChangeRequest, initial);
  return (
    <form action={action} className="space-y-3">
      <Textarea
        name="body"
        required
        placeholder="What would you like changed? (e.g. update my hours, add a photo of the new van)"
      />
      <label className="block text-sm text-ink-soft">
        Attach a file (optional)
        <input type="file" name="file" className="mt-1 block w-full text-sm text-ink-soft" />
      </label>
      <div className="flex items-center gap-3">
        <SubmitButton />
        {state.ok && <span className="text-sm font-medium text-green-700">Got it — we’ll take care of it.</span>}
        {state.error && <span className="text-sm text-brick-700">{state.error}</span>}
      </div>
    </form>
  );
}

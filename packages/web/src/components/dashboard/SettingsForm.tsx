'use client';

import { useState, useTransition } from 'react';
import { replaceKeywords, updateContacts } from '@/actions/business';

export function SettingsForm({
  businessId,
  plan,
  initialKeywords,
  initialEmail,
  initialPhone,
}: {
  businessId: string;
  plan: string;
  initialKeywords: string[];
  initialEmail: string;
  initialPhone: string;
}) {
  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const [draft, setDraft] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const addKeyword = () => {
    const v = draft.trim().toLowerCase();
    if (v && keywords.length < 5 && !keywords.includes(v)) {
      setKeywords([...keywords, v]);
      setDraft('');
    }
  };

  const save = () => {
    setSaved(null);
    startTransition(async () => {
      await replaceKeywords(businessId, keywords);
      await updateContacts(businessId, { owner_email: email, phone: phone || null });
      setSaved('Saved');
    });
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <p className="text-sm font-semibold text-ink">Tracked keywords</p>
        <p className="mt-1 text-sm text-ink-soft">Where you want to rank on Google. Up to 5.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {keywords.map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
              {k}
              <button onClick={() => setKeywords(keywords.filter((x) => x !== k))} aria-label={`Remove ${k}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ))}
        </div>
        {keywords.length < 5 && (
          <div className="mt-3 flex gap-2">
            <input
              className="field flex-1"
              placeholder="e.g. emergency plumber austin"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addKeyword();
                }
              }}
            />
            <button onClick={addKeyword} className="btn-secondary" type="button">
              Add
            </button>
          </div>
        )}
      </div>

      <div className="card p-6">
        <p className="text-sm font-semibold text-ink">Alert contacts</p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="label">Email for reports &amp; alerts</label>
            <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">
              Mobile for text alerts{' '}
              {plan !== 'pro' && <span className="text-ink-faint">(Pro plan)</span>}
            </label>
            <input
              className="field"
              type="tel"
              placeholder="+1 512 555 1234"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={plan !== 'pro'}
            />
            {plan !== 'pro' && (
              <p className="mt-1 text-xs text-ink-faint">
                Upgrade to Pro for instant text alerts when your site goes down.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} className="btn-primary" disabled={pending}>
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        {saved && <span className="text-sm font-medium text-brand-600">{saved}</span>}
      </div>
    </div>
  );
}

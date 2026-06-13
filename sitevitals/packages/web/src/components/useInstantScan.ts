'use client';

import { useCallback, useRef, useState } from 'react';
import type { CategoryScore, CheckType, LetterGrade } from '@sitevitals/engine';
import { normalizeUrl } from '@/lib/format';

export interface CheckLine {
  name: CheckType;
  label: string;
  status: 'running' | 'ok' | 'error' | 'skipped';
  summary: string;
}

export interface ScanResultSummary {
  grade: LetterGrade;
  composite: number;
  categories: CategoryScore[];
  measuredCount: number;
}

export type ScanStatus = 'idle' | 'scanning' | 'done' | 'error';

const PENDING: { name: CheckType; label: string }[] = [
  { name: 'uptime', label: 'Loading speed & uptime' },
  { name: 'ssl', label: 'Security certificate' },
  { name: 'httpsEnforced', label: 'Secure connection' },
  { name: 'domain', label: 'Domain registration' },
  { name: 'crawl', label: 'Pages, links & content' },
];

export function useInstantScan() {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [checks, setChecks] = useState<CheckLine[]>([]);
  const [result, setResult] = useState<ScanResultSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const start = useCallback((rawUrl: string) => {
    const url = normalizeUrl(rawUrl);
    if (!url) return;
    sourceRef.current?.close();
    setStatus('scanning');
    setResult(null);
    setError(null);
    setChecks(PENDING.map((c) => ({ ...c, status: 'running', summary: 'Checking…' })));

    const es = new EventSource(`/api/scan?url=${encodeURIComponent(url)}`);
    sourceRef.current = es;

    es.addEventListener('check', (ev) => {
      const data = JSON.parse((ev as MessageEvent).data) as CheckLine & { type: string };
      setChecks((prev) =>
        prev.map((c) => (c.name === data.name ? { ...c, status: data.status, summary: data.summary } : c)),
      );
    });
    es.addEventListener('done', (ev) => {
      setResult(JSON.parse((ev as MessageEvent).data) as ScanResultSummary);
      setStatus('done');
      es.close();
    });
    es.addEventListener('error', (ev) => {
      const msg = (ev as MessageEvent).data
        ? (JSON.parse((ev as MessageEvent).data) as { message: string }).message
        : 'We couldn’t reach that site. Double-check the address and try again.';
      setError(msg);
      setStatus('error');
      es.close();
    });
  }, []);

  const reset = useCallback(() => {
    sourceRef.current?.close();
    setStatus('idle');
    setChecks([]);
    setResult(null);
    setError(null);
  }, []);

  return { status, checks, result, error, start, reset };
}

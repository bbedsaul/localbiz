'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { periodLabel } from '@/lib/format';

export function TrendChart({ data }: { data: { period: string; composite: number }[] }) {
  if (data.length < 2) {
    return (
      <div className="grid h-48 place-items-center rounded-xl bg-canvas text-sm text-ink-faint">
        Your score trend appears here after your second monthly report.
      </div>
    );
  }
  const points = data.map((d) => ({ ...d, label: periodLabel(d.period).split(' ')[0] }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="score" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0E7C66" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#0E7C66" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E7E4DC" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#6B7A81', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: '#6B7A81', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid #E7E4DC', fontSize: 13 }}
            formatter={(v: number) => [`${v}`, 'Score']}
          />
          <Area type="monotone" dataKey="composite" stroke="#0E7C66" strokeWidth={2.5} fill="url(#score)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

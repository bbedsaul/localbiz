export interface FaqItem {
  q: string;
  a: string;
}

export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {items.map((it) => (
        <details key={it.q} className="group px-6 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-green-900">
            {it.q}
            <span className="text-xl text-brick-600 transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-charcoal-700">{it.a}</p>
        </details>
      ))}
    </div>
  );
}

const STEPS = ['Your site', 'Listings', 'Keywords', 'Instant scan', 'Start trial'];

export function Progress({ current }: { current: number }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= current ? 'bg-brand-500' : 'bg-line'
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-sm font-medium text-ink-faint">
        Step {current + 1} of {STEPS.length} · {STEPS[current]}
      </p>
    </div>
  );
}

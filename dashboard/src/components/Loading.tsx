import { T } from '../tokens';
import { Btn } from './shared';

export function SkeletonRow() {
  return (
    <div
      style={{
        height: 56,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  );
}

export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: T.redDim,
        border: `1px solid ${T.red}`,
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      <span style={{ color: T.red, fontSize: 14 }}>{message}</span>
      {onRetry && (
        <Btn variant="ghost" size="sm" onClick={onRetry}>
          Retry
        </Btn>
      )}
    </div>
  );
}

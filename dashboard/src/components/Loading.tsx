import { useEffect } from 'react';
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

export type ToastType = 'success' | 'info' | 'error';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

export function Toast({
  message,
  type,
  onDismiss,
}: {
  message: string;
  type: ToastType;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const colors = {
    success: { bg: T.greenDim, border: T.green, text: T.green },
    info: { bg: T.blueDim, border: T.blue, text: T.blue },
    error: { bg: T.redDim, border: T.red, text: T.red },
  };

  const c = colors[type];

  return (
    <div
      style={{
        padding: '12px 16px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        color: c.text,
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: c.text,
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        &times;
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 1000,
        maxWidth: 400,
      }}
    >
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

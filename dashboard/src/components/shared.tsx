import { CSSProperties, ReactNode } from 'react';
import { T } from '../tokens';

// Status metadata
type Status = 'active' | 'paused' | 'new' | 'queued' | 'building' | 'contacted' | 'live' | 'approved' | 'pending' | 'rejected';

const statusMeta: Record<Status, { color: string; bg: string; label: string }> = {
  active: { color: T.accentHi, bg: T.accentDim, label: 'Active' },
  paused: { color: T.muted, bg: T.dim, label: 'Paused' },
  new: { color: T.blue, bg: T.blueDim, label: 'New' },
  queued: { color: T.amber, bg: T.amberDim, label: 'Queued' },
  building: { color: T.purple, bg: T.purpleDim, label: 'Building' },
  contacted: { color: T.accent, bg: T.accentDim, label: 'Contacted' },
  live: { color: T.accentHi, bg: T.accentDim, label: 'Live' },
  approved: { color: T.accentHi, bg: T.accentDim, label: 'Approved' },
  pending: { color: T.amber, bg: T.amberDim, label: 'Pending' },
  rejected: { color: T.red, bg: T.redDim, label: 'Rejected' },
};

export function Badge({ status }: { status: Status }) {
  const meta = statusMeta[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 9999,
        background: meta.bg,
        color: meta.color,
        fontSize: 12,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: meta.color,
        }}
      />
      {meta.label}
    </span>
  );
}

export function Score({ value }: { value: number }) {
  const color = value >= 85 ? T.accentHi : value >= 70 ? T.amber : T.muted;
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 600,
        fontSize: 14,
        color,
      }}
    >
      {value}
    </span>
  );
}

type BtnVariant = 'primary' | 'ghost' | 'danger' | 'amber' | 'blue' | 'purple' | 'green';
type BtnSize = 'sm' | 'md';

const btnColors: Record<BtnVariant, { bg: string; color: string; border?: string }> = {
  primary: { bg: T.accent, color: T.bg },
  ghost: { bg: 'transparent', color: T.text, border: T.border },
  danger: { bg: T.redDim, color: T.red },
  amber: { bg: T.amberDim, color: T.amber },
  blue: { bg: T.blueDim, color: T.blue },
  purple: { bg: T.purpleDim, color: T.purple },
  green: { bg: T.accentDim, color: T.accentHi },
};

export function Btn({
  children,
  onClick,
  variant = 'ghost',
  size = 'md',
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  size?: BtnSize;
  disabled?: boolean;
}) {
  const colors = btnColors[variant];
  const padding = size === 'sm' ? '6px 12px' : '8px 16px';
  const fontSize = size === 'sm' ? 12 : 13;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding,
        borderRadius: 6,
        background: colors.bg,
        color: colors.color,
        border: colors.border ? `1px solid ${colors.border}` : 'none',
        fontSize,
        fontWeight: 500,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'opacity 0.15s',
      }}
    >
      {children}
    </button>
  );
}

export function FInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoFocus,
  hint,
}: {
  label?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  hint?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <Label>{label}</Label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          padding: '10px 12px',
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          color: T.text,
          fontSize: 14,
        }}
        onFocus={(e) => (e.target.style.borderColor = T.accent)}
        onBlur={(e) => (e.target.style.borderColor = T.border)}
      />
      {hint && (
        <span style={{ fontSize: 12, color: T.muted }}>{hint}</span>
      )}
    </div>
  );
}

export function FSelect({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <Label>{label}</Label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '10px 12px',
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          color: T.text,
          fontSize: 14,
          cursor: 'pointer',
        }}
        onFocus={(e) => (e.target.style.borderColor = T.accent)}
        onBlur={(e) => (e.target.style.borderColor = T.border)}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: T.muted,
      }}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function StatPill({
  label,
  value,
  color = T.text,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '12px 16px',
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        minWidth: 100,
      }}
    >
      <span style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 20,
          fontWeight: 600,
          color,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function Head({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
      }}
    >
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text }}>{title}</h2>
        {sub && <p style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: T.surfaceHigh,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: 24,
          minWidth: 400,
          maxWidth: 500,
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: T.surface,
              color: T.muted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <span style={{ fontSize: 13, color: T.muted }}>{label}</span>
      <span style={{ fontSize: 13, color: T.text }}>{value}</span>
    </div>
  );
}

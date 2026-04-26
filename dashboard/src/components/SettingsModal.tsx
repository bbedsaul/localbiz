import { useTheme } from '../context/ThemeContext';
import { Theme } from '../tokens';
import { Modal } from './shared';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { theme, setTheme, T } = useTheme();

  const themeOptions: { value: Theme; label: string; icon: string }[] = [
    { value: 'dark', label: 'Dark', icon: '◐' },
    { value: 'light', label: 'Light', icon: '○' },
  ];

  return (
    <Modal title="Settings" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Theme setting */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: T.muted,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Theme
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  borderRadius: 8,
                  border:
                    theme === option.value
                      ? `2px solid ${T.accent}`
                      : `1px solid ${T.border}`,
                  background: theme === option.value ? T.accentDim : T.surface,
                  color: theme === option.value ? T.accent : T.text,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: 18 }}>{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* More settings can be added here */}
        <div
          style={{
            padding: '12px 16px',
            background: T.surfaceHigh,
            borderRadius: 8,
            fontSize: 12,
            color: T.muted,
          }}
        >
          More settings coming soon...
        </div>
      </div>
    </Modal>
  );
}

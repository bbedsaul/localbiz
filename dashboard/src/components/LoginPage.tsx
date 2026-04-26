import { useState } from 'react';
import { T } from '../tokens';
import { useAuth } from '../hooks/useAuth';

type Mode = 'sign-in' | 'forgot-password';

export function LoginPage() {
  const { signIn, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await resetPassword(email);

    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
    setLoading(false);
  };

  const switchToForgotPassword = () => {
    setMode('forgot-password');
    setError(null);
    setResetSent(false);
  };

  const switchToSignIn = () => {
    setMode('sign-in');
    setError(null);
    setResetSent(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: T.bg,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Grid background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(${T.border} 1px, transparent 1px),
            linear-gradient(90deg, ${T.border} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.3,
        }}
      />

      {/* Radial glow behind card */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${T.accentDim} 0%, transparent 70%)`,
          opacity: 0.5,
        }}
      />

      {/* Login card */}
      <div
        style={{
          position: 'relative',
          width: 380,
          padding: 32,
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentHi} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontWeight: 700,
            fontSize: 24,
            color: T.bg,
          }}
        >
          P
        </div>

        {/* Heading */}
        <h1
          style={{
            textAlign: 'center',
            fontSize: 24,
            fontWeight: 700,
            color: T.text,
            marginBottom: 4,
          }}
        >
          Prospector
        </h1>
        <p
          style={{
            textAlign: 'center',
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: 2,
            color: T.muted,
            marginBottom: 32,
          }}
        >
          OPERATIONS CONSOLE
        </p>

        {/* Error message */}
        {error && (
          <div
            style={{
              padding: '10px 12px',
              background: T.redDim,
              border: `1px solid ${T.red}`,
              borderRadius: 6,
              color: T.red,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {mode === 'sign-in' ? (
          <form onSubmit={handleSignIn}>
            {/* Email field */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: T.muted,
                  marginBottom: 6,
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: T.bg,
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  color: T.text,
                  fontSize: 14,
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = T.accent)}
                onBlur={(e) => (e.target.style.borderColor = T.border)}
              />
            </div>

            {/* Password field */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: T.muted,
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    paddingRight: 44,
                    background: T.bg,
                    border: `1px solid ${T.border}`,
                    borderRadius: 6,
                    color: T.text,
                    fontSize: 14,
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = T.accent)}
                  onBlur={(e) => (e.target.style.borderColor = T.border)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: T.muted,
                    fontSize: 12,
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: T.accent,
                color: T.bg,
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading && (
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: `2px solid ${T.bg}`,
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              )}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Forgot password link */}
            <button
              type="button"
              onClick={switchToForgotPassword}
              style={{
                display: 'block',
                width: '100%',
                marginTop: 16,
                background: 'none',
                border: 'none',
                color: T.muted,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Forgot password?
            </button>
          </form>
        ) : (
          <div>
            {resetSent ? (
              <div>
                <div
                  style={{
                    padding: '16px',
                    background: T.accentDim,
                    border: `1px solid ${T.accent}`,
                    borderRadius: 6,
                    color: T.accentHi,
                    fontSize: 13,
                    textAlign: 'center',
                    marginBottom: 24,
                  }}
                >
                  Password reset link sent! Check your email.
                </div>
                <button
                  type="button"
                  onClick={switchToSignIn}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: T.surfaceHigh,
                    color: T.text,
                    border: `1px solid ${T.border}`,
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword}>
                <p
                  style={{
                    fontSize: 13,
                    color: T.muted,
                    marginBottom: 20,
                    textAlign: 'center',
                  }}
                >
                  Enter your email to receive a password reset link.
                </p>

                {/* Email field */}
                <div style={{ marginBottom: 24 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontFamily: "'JetBrains Mono', monospace",
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      color: T.muted,
                      marginBottom: 6,
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      borderRadius: 6,
                      color: T.text,
                      fontSize: 14,
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = T.accent)}
                    onBlur={(e) => (e.target.style.borderColor = T.border)}
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: T.accent,
                    color: T.bg,
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {loading && (
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        border: `2px solid ${T.bg}`,
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                  )}
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>

                {/* Back to sign in link */}
                <button
                  type="button"
                  onClick={switchToSignIn}
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: 16,
                    background: 'none',
                    border: 'none',
                    color: T.muted,
                    fontSize: 13,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  Back to Sign In
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

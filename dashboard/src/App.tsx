import { useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './components/LoginPage';
import OnboardingForm from './components/OnboardingForm';
import { SettingsModal } from './components/SettingsModal';
import { TabMaps } from './tabs/TabMaps';
import { TabProspects } from './tabs/TabProspects';
import { TabForms } from './tabs/TabForms';
import { TabBuilds } from './tabs/TabBuilds';

type Tab = 'maps' | 'prospects' | 'forms' | 'builds';

interface PendingBuild {
  name: string;
}

const tabMeta: Record<Tab, { icon: string; label: string; sub: string }> = {
  maps: { icon: '◎', label: 'Maps Search', sub: 'Configure and monitor Google Maps searches' },
  prospects: { icon: '◈', label: 'Prospects', sub: 'View and manage discovered leads' },
  forms: { icon: '◻', label: 'Onboarding', sub: 'Process business onboarding submissions' },
  builds: { icon: '◆', label: 'Site Builds', sub: 'Generate and deploy websites' },
};

// Sample pending forms count for badge
const pendingFormsCount = 3;

function Dashboard() {
  const { T } = useTheme();
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('maps');
  const [pendingBuild, setPendingBuild] = useState<PendingBuild | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleBuild = (prospect: { name: string }) => {
    setPendingBuild(prospect);
    setActiveTab('builds');
  };

  const clearPendingBuild = () => {
    setPendingBuild(null);
  };

  // Loading state - centered spinner
  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: T.bg,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: `3px solid ${T.border}`,
            borderTopColor: T.accent,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // No user - show login page
  if (!user) {
    return <LoginPage />;
  }

  // Authenticated - render dashboard
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top Nav */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 24px',
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontWeight: 700,
            fontSize: 20,
            color: T.accent,
            marginRight: 32,
            fontFamily: "'Syne', sans-serif",
          }}
        >
          P
        </div>

        {/* Tab buttons */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(Object.keys(tabMeta) as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 6,
                background: activeTab === tab ? T.surfaceHigh : 'transparent',
                color: activeTab === tab ? T.text : T.muted,
                border: activeTab === tab ? `1px solid ${T.border}` : '1px solid transparent',
                fontSize: 13,
                fontWeight: 500,
                position: 'relative',
              }}
            >
              <span style={{ fontSize: 14 }}>{tabMeta[tab].icon}</span>
              {tabMeta[tab].label}
              {/* Amber badge for pending forms */}
              {tab === 'forms' && pendingFormsCount > 0 && (
                <span
                  style={{
                    marginLeft: 4,
                    padding: '2px 6px',
                    borderRadius: 9999,
                    background: T.amberDim,
                    color: T.amber,
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  {pendingFormsCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right side: pipeline status + user info + sign out */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Pipeline status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: T.accentHi,
                boxShadow: `0 0 8px ${T.accent}`,
              }}
            />
            <span style={{ fontSize: 12, color: T.muted }}>Pipeline active</span>
          </div>

          {/* Separator */}
          <div style={{ width: 1, height: 20, background: T.border }} />

          {/* User email */}
          <span
            style={{
              fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              color: T.dim,
            }}
          >
            {user.email}
          </span>

          {/* Settings button */}
          <button
            onClick={() => setShowSettings(true)}
            style={{
              padding: '6px 10px',
              background: T.surfaceHigh,
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              color: T.muted,
              fontSize: 14,
              cursor: 'pointer',
            }}
            title="Settings"
          >
            ⚙
          </button>

          {/* Sign out button */}
          <button
            onClick={signOut}
            style={{
              padding: '6px 12px',
              background: T.surfaceHigh,
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              color: T.muted,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Page header */}
      <div
        style={{
          padding: '16px 24px',
          background: T.bg,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600, color: T.text }}>
          {tabMeta[activeTab].label}
        </h1>
        <p style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>
          {tabMeta[activeTab].sub}
        </p>
      </div>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          padding: 24,
          overflow: 'auto',
          background: T.bg,
        }}
      >
        {activeTab === 'maps' && <TabMaps />}
        {activeTab === 'prospects' && <TabProspects onBuild={handleBuild} />}
        {activeTab === 'forms' && <TabForms onBuild={handleBuild} />}
        {activeTab === 'builds' && (
          <TabBuilds pendingBuild={pendingBuild} clearPendingBuild={clearPendingBuild} />
        )}
      </main>

      {/* Settings modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function App() {
  // Public onboarding route — bypasses auth so prospects can submit the form.
  if (typeof window !== 'undefined' && window.location.pathname === '/onboard') {
    return <OnboardingForm />;
  }

  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  );
}

export default App;

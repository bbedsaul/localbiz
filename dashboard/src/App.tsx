import { useState } from 'react';
import { T } from './tokens';
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

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('maps');
  const [pendingBuild, setPendingBuild] = useState<PendingBuild | null>(null);

  const handleBuild = (prospect: { name: string }) => {
    setPendingBuild(prospect);
    setActiveTab('builds');
  };

  const clearPendingBuild = () => {
    setPendingBuild(null);
  };

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

        {/* Pipeline status indicator */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
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
    </div>
  );
}

export default App;

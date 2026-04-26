import { useState, useEffect } from 'react';
import { T } from '../tokens';
import { Badge, Btn, StatPill, Head, Modal, FInput, FSelect, Card, Label } from '../components/shared';

type BuildStatus = 'queued' | 'building' | 'live';

interface Build {
  id: string;
  businessName: string;
  template: string;
  status: BuildStatus;
  startedAt: string;
  completedAt?: string;
  url?: string;
  domain?: string;
  priority: 'low' | 'normal' | 'high';
}

const TEMPLATES = [
  'Local Business',
  'Trades & Contractor',
  'Restaurant & Cafe',
  'Professional Services',
  'Retail Shop',
  'Health & Wellness',
  'Auto Service',
];

const sampleBuilds: Build[] = [
  { id: '1', businessName: 'Johnson Plumbing', template: 'Trades & Contractor', status: 'live', startedAt: '3d ago', completedAt: '3d ago', url: 'johnsonplumbing.site', priority: 'normal' },
  { id: '2', businessName: 'Quick Fix HVAC', template: 'Trades & Contractor', status: 'building', startedAt: '2h ago', priority: 'high' },
  { id: '3', businessName: 'Maria\'s Kitchen', template: 'Restaurant & Cafe', status: 'live', startedAt: '1w ago', completedAt: '1w ago', url: 'mariaskitchen.site', priority: 'normal' },
  { id: '4', businessName: 'Dayton Dental Group', template: 'Health & Wellness', status: 'queued', startedAt: 'Pending', priority: 'normal' },
  { id: '5', businessName: 'Auto Masters', template: 'Auto Service', status: 'queued', startedAt: 'Pending', priority: 'low' },
];

interface PendingBuild {
  name: string;
}

export function TabBuilds({
  pendingBuild,
  clearPendingBuild,
}: {
  pendingBuild: PendingBuild | null;
  clearPendingBuild: () => void;
}) {
  const [builds, setBuilds] = useState(sampleBuilds);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTemplate, setNewTemplate] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'normal' | 'high'>('normal');

  // Open modal with pre-filled name when pendingBuild arrives
  useEffect(() => {
    if (pendingBuild) {
      setNewName(pendingBuild.name);
      setShowModal(true);
    }
  }, [pendingBuild]);

  const counts = {
    total: builds.length,
    queued: builds.filter(b => b.status === 'queued').length,
    building: builds.filter(b => b.status === 'building').length,
    live: builds.filter(b => b.status === 'live').length,
  };

  const closeModal = () => {
    setShowModal(false);
    setNewName('');
    setNewTemplate('');
    setNewDomain('');
    setNewPriority('normal');
    clearPendingBuild();
  };

  const startBuild = () => {
    if (!newName || !newTemplate) return;
    const newBuild: Build = {
      id: Date.now().toString(),
      businessName: newName,
      template: newTemplate,
      status: 'queued',
      startedAt: 'Pending',
      domain: newDomain || undefined,
      priority: newPriority,
    };
    setBuilds([newBuild, ...builds]);
    closeModal();
  };

  const startBuildNow = (id: string) => {
    setBuilds(builds.map(b =>
      b.id === id ? { ...b, status: 'building' as BuildStatus, startedAt: 'Just now' } : b
    ));
  };

  return (
    <div>
      <Head
        title="Site Builds"
        sub="Generate and deploy websites for prospects"
        action={<Btn variant="primary" onClick={() => setShowModal(true)}>+ New Build</Btn>}
      />

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatPill label="Total" value={counts.total} />
        <StatPill label="Queued" value={counts.queued} color={T.amber} />
        <StatPill label="Building" value={counts.building} color={T.purple} />
        <StatPill label="Live" value={counts.live} color={T.accentHi} />
      </div>

      {/* Builds list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {builds.map(build => (
          <Card key={build.id} style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Badge status={build.status} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{build.businessName}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                  {build.template} &middot; Started: {build.startedAt}
                  {build.completedAt && ` · Completed: ${build.completedAt}`}
                </div>
                {build.url && (
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    <a
                      href={`https://${build.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: T.accentHi }}
                    >
                      {build.url}
                    </a>
                  </div>
                )}
              </div>
              <div>
                {build.status === 'queued' && (
                  <Btn size="sm" variant="primary" onClick={() => startBuildNow(build.id)}>
                    Start Build
                  </Btn>
                )}
                {build.status === 'building' && (
                  <Btn size="sm" variant="purple" disabled>
                    Building...
                  </Btn>
                )}
                {build.status === 'live' && build.url && (
                  <a
                    href={`https://${build.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Btn size="sm" variant="green">
                      View Site &#8599;
                    </Btn>
                  </a>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Config Modal */}
      {showModal && (
        <Modal title="New Site Build" onClose={closeModal}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FInput
              label="Business Name"
              value={newName}
              onChange={setNewName}
              placeholder="e.g., Johnson Plumbing"
              autoFocus={!pendingBuild}
            />
            <FSelect
              label="Website Template"
              value={newTemplate}
              onChange={setNewTemplate}
              options={TEMPLATES}
            />
            <FInput
              label="Custom Domain (optional)"
              value={newDomain}
              onChange={setNewDomain}
              placeholder="e.g., johnsonplumbing.com"
              hint="Leave blank to use default .site domain"
            />

            {/* Priority toggle */}
            <div>
              <Label>Build Priority</Label>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {(['low', 'normal', 'high'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setNewPriority(p)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: newPriority === p ? T.accent : T.surface,
                      color: newPriority === p ? T.bg : T.text,
                      border: `1px solid ${newPriority === p ? T.accent : T.border}`,
                      fontSize: 12,
                      fontWeight: 500,
                      textTransform: 'capitalize',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Info box */}
            <div
              style={{
                padding: 12,
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                fontSize: 12,
                color: T.muted,
              }}
            >
              <div style={{ fontWeight: 500, color: T.text, marginBottom: 8 }}>What gets built:</div>
              <ul style={{ paddingLeft: 16, margin: 0, lineHeight: 1.8 }}>
                <li>Homepage with hero, services, contact</li>
                <li>Google Maps embed + hours</li>
                <li>Click-to-call mobile button</li>
                <li>SEO meta tags from business data</li>
                <li>Deployed to your hosting with SSL</li>
              </ul>
            </div>

            <div style={{ marginTop: 8 }}>
              <Btn variant="primary" onClick={startBuild}>Start Build</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

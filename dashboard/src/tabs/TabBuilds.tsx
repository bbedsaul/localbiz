import { useState, useEffect } from 'react';
import { T } from '../tokens';
import { Badge, Btn, StatPill, Head, Modal, FInput, FSelect, Card, Label } from '../components/shared';
import { SkeletonRows, ErrorBanner } from '../components/Loading';
import { api, ApiError } from '../lib/api';

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

interface ApiBuild {
  id: string;
  business_name: string;
  template: string;
  status: BuildStatus;
  started_at: string | null;
  completed_at: string | null;
  url?: string;
  domain?: string;
  priority: 'low' | 'normal' | 'high';
  prospect_id?: string;
}

interface BuildStats {
  total: number;
  queued: number;
  building: number;
  live: number;
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

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Pending';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

function mapApiBuild(b: ApiBuild): Build {
  return {
    id: b.id,
    businessName: b.business_name,
    template: b.template,
    status: b.status,
    startedAt: formatRelativeTime(b.started_at),
    completedAt: b.completed_at ? formatRelativeTime(b.completed_at) : undefined,
    url: b.url,
    domain: b.domain,
    priority: b.priority,
  };
}

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
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<BuildStats>({ total: 0, queued: 0, building: 0, live: 0 });
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTemplate, setNewTemplate] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'normal' | 'high'>('normal');

  const fetchBuilds = async () => {
    setLoading(true);
    setError(null);
    try {
      const [buildsData, statsData] = await Promise.all([
        api.get<ApiBuild[]>('/api/builds'),
        api.get<BuildStats>('/api/builds/stats'),
      ]);
      setBuilds(buildsData.map(mapApiBuild));
      setStats(statsData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load builds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuilds();
  }, []);

  // Open modal with pre-filled name when pendingBuild arrives
  useEffect(() => {
    if (pendingBuild) {
      setNewName(pendingBuild.name);
      setShowModal(true);
    }
  }, [pendingBuild]);

  const closeModal = () => {
    setShowModal(false);
    setNewName('');
    setNewTemplate('');
    setNewDomain('');
    setNewPriority('normal');
    clearPendingBuild();
  };

  const startBuild = async () => {
    if (!newName || !newTemplate) return;
    try {
      const newBuildData = await api.post<ApiBuild>('/api/builds', {
        business_name: newName,
        template: newTemplate,
        domain: newDomain || undefined,
        priority: newPriority,
      });
      setBuilds([mapApiBuild(newBuildData), ...builds]);
      setStats(s => ({ ...s, total: s.total + 1, queued: s.queued + 1 }));
      closeModal();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create build');
    }
  };

  const startBuildNow = async (id: string) => {
    try {
      await api.patch(`/api/builds/${id}`, { status: 'building' });
      setBuilds(builds.map(b =>
        b.id === id ? { ...b, status: 'building' as BuildStatus, startedAt: 'Just now' } : b
      ));
      setStats(s => ({ ...s, queued: s.queued - 1, building: s.building + 1 }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to start build');
    }
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
        <StatPill label="Total" value={stats.total} />
        <StatPill label="Queued" value={stats.queued} color={T.amber} />
        <StatPill label="Building" value={stats.building} color={T.purple} />
        <StatPill label="Live" value={stats.live} color={T.accentHi} />
      </div>

      {/* Error banner */}
      {error && <ErrorBanner message={error} onRetry={fetchBuilds} />}

      {/* Builds list */}
      {loading && <SkeletonRows count={5} />}
      {!loading && !error && (
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
      )}

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

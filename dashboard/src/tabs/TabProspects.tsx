import { useState, useEffect } from 'react';
import { T } from '../tokens';
import { Badge, Btn, Score, StatPill, Head, Modal, FInput, Card, DetailRow } from '../components/shared';
import { SkeletonRows, ErrorBanner } from '../components/Loading';
import { api, ApiError } from '../lib/api';

interface ProspectPhoto {
  id: number;
  prospect_place_id: string;
  storage_key: string;
  public_url: string;
  file_name?: string;
  caption?: string;
  sort_order: number;
}

type ProspectStatus = 'new' | 'queued' | 'contacted' | 'building' | 'live';
type Source = 'form' | 'maps';

interface Prospect {
  id: string;
  name: string;
  category: string;
  city: string;
  phone: string;
  rating: number;
  reviews: number;
  score: number;
  status: ProspectStatus;
  source: Source;
}

interface ApiProspect {
  place_id: string;
  name: string;
  category: string;
  city: string;
  phone: string;
  rating: number;
  review_count: number;
  score: number;
  status: ProspectStatus;
  source: Source;
}

interface ProspectStats {
  total: number;
  new: number;
  queued: number;
  building: number;
  live: number;
}

function mapApiProspect(p: ApiProspect): Prospect {
  return {
    id: p.place_id,
    name: p.name,
    category: p.category,
    city: p.city,
    phone: p.phone,
    rating: p.rating,
    reviews: p.review_count,
    score: p.score,
    status: p.status,
    source: p.source,
  };
}

const statusFilters: (ProspectStatus | 'all')[] = ['all', 'new', 'queued', 'contacted', 'building', 'live'];

function ProspectPhotos({ prospectId }: { prospectId: string }) {
  const [photos, setPhotos] = useState<ProspectPhoto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get<ProspectPhoto[]>(`/api/prospects/${prospectId}/photos`)
      .then((data) => {
        if (!cancelled) {
          setPhotos(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load photos');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [prospectId]);

  const removePhoto = async (photoId: number) => {
    try {
      await api.del(`/api/prospects/${prospectId}/photos/${photoId}`);
      setPhotos((current) => (current ? current.filter((p) => p.id !== photoId) : current));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete photo');
    }
  };

  if (loading) return <div style={{ fontSize: 12, color: T.muted, padding: '8px 0' }}>Loading photos…</div>;
  if (error) return <div style={{ fontSize: 12, color: T.amber, padding: '8px 0' }}>{error}</div>;
  if (!photos || photos.length === 0) {
    return <div style={{ fontSize: 12, color: T.muted, padding: '8px 0' }}>No photos submitted</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
      {photos.map((p) => (
        <div key={p.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{
            width: '100%',
            aspectRatio: '1 / 1',
            backgroundImage: `url(${p.public_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}>
            <button
              type="button"
              onClick={() => removePhoto(p.id)}
              title="Delete photo"
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#000c',
                border: 'none',
                color: '#fff',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
          {p.caption && (
            <div style={{ padding: '6px 8px', fontSize: 11, color: T.text, lineHeight: 1.3 }}>
              {p.caption}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function TabProspects({ onBuild }: { onBuild: (prospect: { name: string }) => void }) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProspectStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [stats, setStats] = useState<ProspectStats>({ total: 0, new: 0, queued: 0, building: 0, live: 0 });

  const fetchProspects = async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = filter === 'all' ? '' : filter;
      const [prospectsData, statsData] = await Promise.all([
        api.get<ApiProspect[]>(`/api/prospects?status=${statusParam}&search=${encodeURIComponent(search)}`),
        api.get<ProspectStats>('/api/prospects/stats'),
      ]);
      setProspects(prospectsData.map(mapApiProspect));
      setStats(statsData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load prospects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProspects();
  }, [filter, search]);

  const queueProspect = async (id: string) => {
    try {
      await api.patch(`/api/prospects/${id}`, { status: 'queued' });
      setProspects(prospects.map(p =>
        p.id === id ? { ...p, status: 'queued' as ProspectStatus } : p
      ));
      setStats(s => ({ ...s, new: s.new - 1, queued: s.queued + 1 }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to queue prospect');
    }
  };

  return (
    <div>
      <Head title="Prospects" sub="Manage leads from Google Maps and onboarding forms" />

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatPill label="Total" value={stats.total} />
        <StatPill label="New" value={stats.new} color={T.blue} />
        <StatPill label="Queued" value={stats.queued} color={T.amber} />
        <StatPill label="Building" value={stats.building} color={T.purple} />
        <StatPill label="Live" value={stats.live} color={T.accentHi} />
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {statusFilters.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                background: filter === s ? T.accent : T.surface,
                color: filter === s ? T.bg : T.text,
                border: `1px solid ${filter === s ? T.accent : T.border}`,
                fontSize: 12,
                fontWeight: 500,
                textTransform: 'capitalize',
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, maxWidth: 300 }}>
          <FInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name or city..."
          />
        </div>
      </div>

      {/* Error banner */}
      {error && <ErrorBanner message={error} onRetry={fetchProspects} />}

      {/* Prospect list */}
      {loading && <SkeletonRows count={5} />}
      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {prospects.map(prospect => (
            <Card key={prospect.id} style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Score value={prospect.score} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 500 }}>{prospect.name}</span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: prospect.source === 'form' ? T.blueDim : T.dim,
                        color: prospect.source === 'form' ? T.blue : T.muted,
                        textTransform: 'uppercase',
                      }}
                    >
                      {prospect.source}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                    {prospect.category} &middot; {prospect.city} &middot; &#9733; {prospect.rating} ({prospect.reviews}) &middot; {prospect.phone}
                  </div>
                </div>
                <Badge status={prospect.status} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn size="sm" variant="ghost" onClick={() => setSelectedProspect(prospect)}>
                    View
                  </Btn>
                  {prospect.status === 'new' && (
                    <Btn size="sm" variant="amber" onClick={() => queueProspect(prospect.id)}>
                      Queue
                    </Btn>
                  )}
                  {(prospect.status === 'new' || prospect.status === 'queued') && (
                    <Btn size="sm" variant="primary" onClick={() => onBuild({ name: prospect.name })}>
                      Build Site &rarr;
                    </Btn>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedProspect && (
        <Modal title={selectedProspect.name} onClose={() => setSelectedProspect(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <DetailRow label="Category" value={selectedProspect.category} />
            <DetailRow label="City" value={selectedProspect.city} />
            <DetailRow label="Phone" value={selectedProspect.phone} />
            <DetailRow label="Rating" value={`${selectedProspect.rating} (${selectedProspect.reviews} reviews)`} />
            <DetailRow label="Score" value={<Score value={selectedProspect.score} />} />
            <DetailRow label="Status" value={<Badge status={selectedProspect.status} />} />
            <DetailRow label="Source" value={selectedProspect.source} />
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
              Submitted Photos
            </div>
            <ProspectPhotos prospectId={selectedProspect.id} />
          </div>
        </Modal>
      )}
    </div>
  );
}

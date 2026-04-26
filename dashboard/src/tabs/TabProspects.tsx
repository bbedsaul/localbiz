import { useState } from 'react';
import { T } from '../tokens';
import { Badge, Btn, Score, StatPill, Head, Modal, FInput, Card, DetailRow } from '../components/shared';

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

const sampleProspects: Prospect[] = [
  { id: '1', name: 'Johnson Plumbing', category: 'Plumber', city: 'Akron OH', phone: '(330) 555-0101', rating: 4.8, reviews: 47, score: 92, status: 'new', source: 'maps' },
  { id: '2', name: 'Quick Fix HVAC', category: 'HVAC', city: 'Canton OH', phone: '(330) 555-0102', rating: 4.5, reviews: 32, score: 85, status: 'queued', source: 'maps' },
  { id: '3', name: 'Green Thumb Landscaping', category: 'Landscaper', city: 'Dayton OH', phone: '(937) 555-0103', rating: 4.9, reviews: 89, score: 94, status: 'new', source: 'form' },
  { id: '4', name: 'Auto Masters', category: 'Auto Repair', city: 'Toledo OH', phone: '(419) 555-0104', rating: 4.2, reviews: 23, score: 72, status: 'contacted', source: 'maps' },
  { id: '5', name: 'Fresh Bites Bakery', category: 'Bakery', city: 'Columbus OH', phone: '(614) 555-0105', rating: 4.7, reviews: 156, score: 88, status: 'building', source: 'form' },
  { id: '6', name: 'Sparkle Clean Dry Cleaners', category: 'Dry Cleaner', city: 'Cleveland OH', phone: '(216) 555-0106', rating: 4.1, reviews: 18, score: 65, status: 'new', source: 'maps' },
  { id: '7', name: 'Smile Dental Care', category: 'Dental', city: 'Youngstown OH', phone: '(330) 555-0107', rating: 4.6, reviews: 72, score: 82, status: 'live', source: 'maps' },
  { id: '8', name: 'Power Fitness Gym', category: 'Fitness', city: 'Cincinnati OH', phone: '(513) 555-0108', rating: 4.4, reviews: 45, score: 78, status: 'queued', source: 'form' },
  { id: '9', name: 'Style Studio Salon', category: 'Salon', city: 'Akron OH', phone: '(330) 555-0109', rating: 4.8, reviews: 98, score: 90, status: 'new', source: 'maps' },
  { id: '10', name: 'Crystal Clear Cleaning', category: 'Cleaning', city: 'Canton OH', phone: '(330) 555-0110', rating: 4.3, reviews: 29, score: 70, status: 'contacted', source: 'maps' },
];

const statusFilters: (ProspectStatus | 'all')[] = ['all', 'new', 'queued', 'contacted', 'building', 'live'];

export function TabProspects({ onBuild }: { onBuild: (prospect: { name: string }) => void }) {
  const [prospects] = useState(sampleProspects);
  const [filter, setFilter] = useState<ProspectStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  const filteredProspects = prospects.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.city.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    total: prospects.length,
    new: prospects.filter(p => p.status === 'new').length,
    queued: prospects.filter(p => p.status === 'queued').length,
    building: prospects.filter(p => p.status === 'building').length,
    live: prospects.filter(p => p.status === 'live').length,
  };

  return (
    <div>
      <Head title="Prospects" sub="Manage leads from Google Maps and onboarding forms" />

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatPill label="Total" value={counts.total} />
        <StatPill label="New" value={counts.new} color={T.blue} />
        <StatPill label="Queued" value={counts.queued} color={T.amber} />
        <StatPill label="Building" value={counts.building} color={T.purple} />
        <StatPill label="Live" value={counts.live} color={T.accentHi} />
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

      {/* Prospect list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredProspects.map(prospect => (
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
                  <Btn size="sm" variant="amber" onClick={() => console.log('Queue', prospect.id)}>
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
        </Modal>
      )}
    </div>
  );
}

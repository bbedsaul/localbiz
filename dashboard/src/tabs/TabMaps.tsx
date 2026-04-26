import { useState } from 'react';
import { T } from '../tokens';
import { Badge, Btn, StatPill, Head, Modal, FSelect, Card } from '../components/shared';

const CATEGORIES = [
  'Auto Repair', 'Plumber', 'Dry Cleaner', 'Landscaper', 'Bakery', 'HVAC',
  'Restaurant', 'Dental', 'Fitness', 'Retail', 'Salon', 'Cleaning'
];

const CITIES = [
  'Akron OH', 'Canton OH', 'Dayton OH', 'Toledo OH', 'Columbus OH',
  'Cleveland OH', 'Youngstown OH', 'Cincinnati OH'
];

const SCHEDULES = [
  'Daily 2am', 'Daily 3am', 'Daily 4am', 'Weekly Mon', 'Weekly Wed', 'Manual only'
];

interface Search {
  id: number;
  category: string;
  city: string;
  schedule: string;
  status: 'active' | 'paused';
  lastRun: string;
  found: number;
}

const sampleSearches: Search[] = [
  { id: 1, category: 'Plumber', city: 'Akron OH', schedule: 'Daily 2am', status: 'active', lastRun: '2h ago', found: 47 },
  { id: 2, category: 'HVAC', city: 'Canton OH', schedule: 'Daily 3am', status: 'active', lastRun: '3h ago', found: 32 },
  { id: 3, category: 'Auto Repair', city: 'Dayton OH', schedule: 'Weekly Mon', status: 'paused', lastRun: '5d ago', found: 28 },
  { id: 4, category: 'Landscaper', city: 'Toledo OH', schedule: 'Daily 4am', status: 'active', lastRun: '4h ago', found: 56 },
  { id: 5, category: 'Restaurant', city: 'Columbus OH', schedule: 'Weekly Wed', status: 'active', lastRun: '2d ago', found: 89 },
  { id: 6, category: 'Dental', city: 'Cleveland OH', schedule: 'Manual only', status: 'paused', lastRun: '1w ago', found: 15 },
];

export function TabMaps() {
  const [searches, setSearches] = useState(sampleSearches);
  const [showModal, setShowModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newSchedule, setNewSchedule] = useState('');

  const activeCount = searches.filter(s => s.status === 'active').length;
  const totalProspects = searches.reduce((acc, s) => acc + s.found, 0);
  const citiesCovered = new Set(searches.map(s => s.city)).size;

  const toggleStatus = (id: number) => {
    setSearches(searches.map(s =>
      s.id === id ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s
    ));
  };

  const removeSearch = (id: number) => {
    setSearches(searches.filter(s => s.id !== id));
  };

  const addSearch = () => {
    if (!newCategory || !newCity || !newSchedule) return;
    const newSearch: Search = {
      id: Date.now(),
      category: newCategory,
      city: newCity,
      schedule: newSchedule,
      status: 'active',
      lastRun: 'Never',
      found: 0,
    };
    setSearches([...searches, newSearch]);
    setShowModal(false);
    setNewCategory('');
    setNewCity('');
    setNewSchedule('');
  };

  return (
    <div>
      <Head
        title="Scheduled Searches"
        sub="Configure automated Google Maps searches for prospects"
        action={<Btn variant="primary" onClick={() => setShowModal(true)}>+ New Search</Btn>}
      />

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatPill label="Active Searches" value={activeCount} color={T.accentHi} />
        <StatPill label="Total Prospects" value={totalProspects} />
        <StatPill label="New Today" value={12} color={T.blue} />
        <StatPill label="Cities Covered" value={citiesCovered} />
      </div>

      {/* Search list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {searches.map(search => (
          <Card key={search.id} style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Badge status={search.status} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>
                  {search.category} <span style={{ color: T.muted }}>&middot;</span> {search.city}
                </div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                  {search.schedule} &middot; Last run: {search.lastRun} &middot; {search.found} found
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn size="sm" variant="ghost" onClick={() => toggleStatus(search.id)}>
                  {search.status === 'active' ? 'Pause' : 'Resume'}
                </Btn>
                <Btn size="sm" variant="green" onClick={() => console.log('Run now', search.id)}>
                  Run Now
                </Btn>
                <Btn size="sm" variant="danger" onClick={() => removeSearch(search.id)}>
                  Remove
                </Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* New Search Modal */}
      {showModal && (
        <Modal title="New Search" onClose={() => setShowModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FSelect label="Category" value={newCategory} onChange={setNewCategory} options={CATEGORIES} />
            <FSelect label="City" value={newCity} onChange={setNewCity} options={CITIES} />
            <FSelect label="Schedule" value={newSchedule} onChange={setNewSchedule} options={SCHEDULES} />
            <div style={{ marginTop: 8 }}>
              <Btn variant="primary" onClick={addSearch}>Create Search</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

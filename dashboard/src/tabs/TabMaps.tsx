import { useState, useEffect } from 'react';
import { T } from '../tokens';
import { Badge, Btn, StatPill, Head, Modal, FSelect, Card } from '../components/shared';
import { SkeletonRows, ErrorBanner } from '../components/Loading';
import { api, ApiError } from '../lib/api';

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

interface ApiSearch {
  id: number;
  category: string;
  city: string;
  schedule: string;
  status: 'active' | 'paused';
  last_run: string | null;
  found_count: number;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
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

function mapApiSearch(s: ApiSearch): Search {
  return {
    id: s.id,
    category: s.category,
    city: s.city,
    schedule: s.schedule,
    status: s.status,
    lastRun: formatRelativeTime(s.last_run),
    found: s.found_count,
  };
}

export function TabMaps() {
  const [searches, setSearches] = useState<Search[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newSchedule, setNewSchedule] = useState('');

  const fetchSearches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ApiSearch[]>('/api/searches');
      setSearches(data.map(mapApiSearch));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load searches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSearches();
  }, []);

  const activeCount = searches.filter(s => s.status === 'active').length;
  const totalProspects = searches.reduce((acc, s) => acc + s.found, 0);
  const citiesCovered = new Set(searches.map(s => s.city)).size;
  const newToday = 0; // This would need a separate endpoint or stat

  const toggleStatus = async (id: number) => {
    const search = searches.find(s => s.id === id);
    if (!search) return;
    const newStatus = search.status === 'active' ? 'paused' : 'active';
    try {
      await api.patch(`/api/searches/${id}`, { status: newStatus });
      setSearches(searches.map(s =>
        s.id === id ? { ...s, status: newStatus } : s
      ));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status');
    }
  };

  const removeSearch = async (id: number) => {
    try {
      await api.del(`/api/searches/${id}`);
      setSearches(searches.filter(s => s.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete search');
    }
  };

  const runNow = async (id: number) => {
    try {
      await api.post(`/api/searches/${id}/run`);
      await fetchSearches(); // Refresh to get updated last_run
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to run search');
    }
  };

  const addSearch = async () => {
    if (!newCategory || !newCity || !newSchedule) return;
    try {
      const newSearchData = await api.post<ApiSearch>('/api/searches', {
        category: newCategory,
        city: newCity,
        schedule: newSchedule,
      });
      setSearches([...searches, mapApiSearch(newSearchData)]);
      setShowModal(false);
      setNewCategory('');
      setNewCity('');
      setNewSchedule('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create search');
    }
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
        <StatPill label="New Today" value={newToday} color={T.blue} />
        <StatPill label="Cities Covered" value={citiesCovered} />
      </div>

      {/* Error banner */}
      {error && <ErrorBanner message={error} onRetry={fetchSearches} />}

      {/* Search list */}
      {loading && <SkeletonRows count={5} />}
      {!loading && !error && (
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
                  <Btn size="sm" variant="green" onClick={() => runNow(search.id)}>
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
      )}

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

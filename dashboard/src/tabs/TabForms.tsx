import { useState, useEffect } from 'react';
import { T } from '../tokens';
import { Badge, Btn, StatPill, Head, Modal, Card, DetailRow } from '../components/shared';
import { SkeletonRows, ErrorBanner } from '../components/Loading';
import { api, ApiError } from '../lib/api';

type FormStatus = 'pending' | 'approved' | 'rejected';

interface FormSubmission {
  id: string;
  businessName: string;
  ownerName: string;
  city: string;
  category: string;
  phone: string;
  email: string;
  goals: string[];
  submittedAt: string;
  status: FormStatus;
  description?: string;
  services?: string;
  yearsInBusiness?: number;
}

interface ApiFormSubmission {
  id: string;
  business_name: string;
  owner_name: string;
  city: string;
  category: string;
  phone: string;
  email: string;
  goals: string[];
  submitted_at: string;
  status: 'new' | 'pending' | 'approved' | 'rejected';
  description?: string;
  services?: string;
  years_in_business?: number;
}

interface FormStats {
  total: number;
  pending: number;
  approved: number;
}

function formatRelativeTime(dateStr: string): string {
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

function mapApiForm(f: ApiFormSubmission): FormSubmission {
  return {
    id: f.id,
    businessName: f.business_name,
    ownerName: f.owner_name,
    city: f.city,
    category: f.category,
    phone: f.phone,
    email: f.email,
    goals: f.goals || [],
    submittedAt: formatRelativeTime(f.submitted_at),
    status: f.status === 'new' ? 'pending' : f.status as FormStatus,
    description: f.description,
    services: f.services,
    yearsInBusiness: f.years_in_business,
  };
}

export function TabForms({ onBuild }: { onBuild: (prospect: { name: string }) => void }) {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [stats, setStats] = useState<FormStats>({ total: 0, pending: 0, approved: 0 });

  const fetchForms = async () => {
    setLoading(true);
    setError(null);
    try {
      const [formsData, statsData] = await Promise.all([
        api.get<ApiFormSubmission[]>('/api/forms'),
        api.get<FormStats>('/api/forms/stats'),
      ]);
      setSubmissions(formsData.map(mapApiForm));
      setStats(statsData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load form submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const updateStatus = async (id: string, status: FormStatus) => {
    try {
      await api.patch(`/api/forms/${id}`, { status });
      setSubmissions(submissions.map(s => s.id === id ? { ...s, status } : s));
      // Update stats
      if (status === 'approved') {
        setStats(s => ({ ...s, pending: s.pending - 1, approved: s.approved + 1 }));
      } else if (status === 'rejected') {
        setStats(s => ({ ...s, pending: s.pending - 1 }));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status');
    }
  };

  return (
    <div>
      <Head
        title="Onboarding Forms"
        sub="Review and process business onboarding submissions"
        action={
          <Btn
            size="sm"
            variant="primary"
            onClick={() => window.open('/onboard', '_blank', 'noopener')}
          >
            Open submission form &rarr;
          </Btn>
        }
      />

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatPill label="Total Submissions" value={stats.total} />
        <StatPill label="Pending Review" value={stats.pending} color={T.amber} />
        <StatPill label="Approved" value={stats.approved} color={T.accentHi} />
      </div>

      {/* Error banner */}
      {error && <ErrorBanner message={error} onRetry={fetchForms} />}

      {/* Submissions list */}
      {loading && <SkeletonRows count={5} />}
      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {submissions.map(submission => (
            <Card key={submission.id} style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 500 }}>{submission.businessName}</span>
                    <Badge status={submission.status} />
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
                    {submission.ownerName} &middot; {submission.city} &middot; {submission.category}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                    {submission.phone} &middot; {submission.email}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    <span style={{ color: T.muted }}>Goals:</span>{' '}
                    <span style={{ color: T.text }}>{submission.goals.join(', ')}</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>
                    Submitted {submission.submittedAt}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Btn size="sm" variant="ghost" onClick={() => setSelectedSubmission(submission)}>
                    View
                  </Btn>
                  {submission.status === 'pending' && (
                    <>
                      <Btn size="sm" variant="green" onClick={() => updateStatus(submission.id, 'approved')}>
                        Approve
                      </Btn>
                      <Btn size="sm" variant="danger" onClick={() => updateStatus(submission.id, 'rejected')}>
                        Reject
                      </Btn>
                    </>
                  )}
                  {submission.status === 'approved' && (
                    <Btn size="sm" variant="primary" onClick={() => onBuild({ name: submission.businessName })}>
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
      {selectedSubmission && (
        <Modal title={selectedSubmission.businessName} onClose={() => setSelectedSubmission(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <DetailRow label="Owner" value={selectedSubmission.ownerName} />
            <DetailRow label="Category" value={selectedSubmission.category} />
            <DetailRow label="City" value={selectedSubmission.city} />
            <DetailRow label="Phone" value={selectedSubmission.phone} />
            <DetailRow label="Email" value={selectedSubmission.email} />
            <DetailRow label="Years in Business" value={selectedSubmission.yearsInBusiness || 'N/A'} />
            <DetailRow label="Goals" value={selectedSubmission.goals.join(', ')} />
            <DetailRow label="Services" value={selectedSubmission.services || 'N/A'} />
            <DetailRow label="Description" value={selectedSubmission.description || 'N/A'} />
            <DetailRow label="Status" value={<Badge status={selectedSubmission.status} />} />
            <DetailRow label="Submitted" value={selectedSubmission.submittedAt} />
          </div>
        </Modal>
      )}
    </div>
  );
}

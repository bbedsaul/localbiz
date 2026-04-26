import { useState } from 'react';
import { T } from '../tokens';
import { Badge, Btn, StatPill, Head, Modal, Card, DetailRow } from '../components/shared';

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

const sampleSubmissions: FormSubmission[] = [
  {
    id: '1',
    businessName: 'Smith Auto Body',
    ownerName: 'John Smith',
    city: 'Akron OH',
    category: 'Auto Repair',
    phone: '(330) 555-1001',
    email: 'john@smithautobody.com',
    goals: ['Get more customers', 'Online booking'],
    submittedAt: '2h ago',
    status: 'pending',
    description: 'Family-owned auto body shop serving Akron for 25 years',
    services: 'Collision repair, Paint, Dent removal',
    yearsInBusiness: 25,
  },
  {
    id: '2',
    businessName: 'Maria\'s Kitchen',
    ownerName: 'Maria Garcia',
    city: 'Canton OH',
    category: 'Restaurant',
    phone: '(330) 555-1002',
    email: 'maria@mariaskitchen.com',
    goals: ['Show menu online', 'Accept reservations'],
    submittedAt: '5h ago',
    status: 'approved',
    description: 'Authentic Mexican cuisine in downtown Canton',
    services: 'Dine-in, Takeout, Catering',
    yearsInBusiness: 8,
  },
  {
    id: '3',
    businessName: 'Dayton Dental Group',
    ownerName: 'Dr. Robert Chen',
    city: 'Dayton OH',
    category: 'Dental',
    phone: '(937) 555-1003',
    email: 'info@daytondental.com',
    goals: ['New patient forms', 'Appointment scheduling'],
    submittedAt: '1d ago',
    status: 'pending',
    description: 'General and cosmetic dentistry for the whole family',
    services: 'Cleanings, Fillings, Crowns, Whitening',
    yearsInBusiness: 12,
  },
  {
    id: '4',
    businessName: 'Toledo Fitness Center',
    ownerName: 'Mike Johnson',
    city: 'Toledo OH',
    category: 'Fitness',
    phone: '(419) 555-1004',
    email: 'mike@toledofitness.com',
    goals: ['Membership signup', 'Class schedules'],
    submittedAt: '2d ago',
    status: 'approved',
    description: '24/7 gym with personal training and group classes',
    services: 'Weights, Cardio, Classes, Personal Training',
    yearsInBusiness: 5,
  },
  {
    id: '5',
    businessName: 'Sunset Landscaping',
    ownerName: 'Tom Wilson',
    city: 'Columbus OH',
    category: 'Landscaper',
    phone: '(614) 555-1005',
    email: 'tom@sunsetlandscaping.com',
    goals: ['Show portfolio', 'Quote requests'],
    submittedAt: '3d ago',
    status: 'pending',
    description: 'Professional landscaping and lawn care services',
    services: 'Lawn care, Garden design, Hardscaping, Irrigation',
    yearsInBusiness: 15,
  },
];

export function TabForms({ onBuild }: { onBuild: (prospect: { name: string }) => void }) {
  const [submissions, setSubmissions] = useState(sampleSubmissions);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);

  const counts = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    approved: submissions.filter(s => s.status === 'approved').length,
  };

  const updateStatus = (id: string, status: FormStatus) => {
    setSubmissions(submissions.map(s => s.id === id ? { ...s, status } : s));
  };

  return (
    <div>
      <Head title="Onboarding Forms" sub="Review and process business onboarding submissions" />

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatPill label="Total Submissions" value={counts.total} />
        <StatPill label="Pending Review" value={counts.pending} color={T.amber} />
        <StatPill label="Approved" value={counts.approved} color={T.accentHi} />
      </div>

      {/* Submissions list */}
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

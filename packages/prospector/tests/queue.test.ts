import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

// Mock the db module
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom = jest.fn<() => any>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdate = jest.fn<() => any>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSelect = jest.fn<() => any>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockEq = jest.fn<() => any>();

const mockSupabase = {
  from: mockFrom,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdateProspectStatus = jest.fn<() => any>();

jest.unstable_mockModule('../src/db.js', () => ({
  supabase: mockSupabase,
  getTopProspects: jest.fn(),
  updateProspectStatus: mockUpdateProspectStatus,
  insertToOutreachQueue: jest.fn(),
}));

let markContacted: typeof import('../src/queue.js').markContacted;
let recordResponse: typeof import('../src/queue.js').recordResponse;
let getOutreachStats: typeof import('../src/queue.js').getOutreachStats;

beforeAll(async () => {
  const queueModule = await import('../src/queue.js');
  markContacted = queueModule.markContacted;
  recordResponse = queueModule.recordResponse;
  getOutreachStats = queueModule.getOutreachStats;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('markContacted', () => {
  it('should update outreach_queue with contact method and timestamp', async () => {
    mockFrom.mockReturnValue({ update: mockUpdate });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ error: null });
    mockUpdateProspectStatus.mockResolvedValue(undefined);

    await markContacted('place-123', 'email');

    expect(mockFrom).toHaveBeenCalledWith('outreach_queue');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        contact_method: 'email',
        contacted_at: expect.any(String),
      })
    );
    expect(mockEq).toHaveBeenCalledWith('place_id', 'place-123');
    expect(mockUpdateProspectStatus).toHaveBeenCalledWith('place-123', 'contacted');
  });

  it('should throw error if update fails', async () => {
    mockFrom.mockReturnValue({ update: mockUpdate });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ error: { message: 'Database error' } });

    await expect(markContacted('place-123', 'phone')).rejects.toThrow(
      'Failed to mark contacted: Database error'
    );
  });
});

describe('recordResponse', () => {
  it('should set status to closed for interested response', async () => {
    mockFrom.mockReturnValue({ update: mockUpdate });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ error: null });
    mockUpdateProspectStatus.mockResolvedValue(undefined);

    await recordResponse('place-123', 'interested', 'Great conversation');

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        response: 'interested',
        responded_at: expect.any(String),
        notes: 'Great conversation',
      })
    );
    expect(mockUpdateProspectStatus).toHaveBeenCalledWith('place-123', 'closed');
  });

  it('should set status to rejected for not_interested response', async () => {
    mockFrom.mockReturnValue({ update: mockUpdate });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ error: null });
    mockUpdateProspectStatus.mockResolvedValue(undefined);

    await recordResponse('place-123', 'not_interested');

    expect(mockUpdateProspectStatus).toHaveBeenCalledWith('place-123', 'rejected');
  });

  it('should not update prospect status for no_response', async () => {
    mockFrom.mockReturnValue({ update: mockUpdate });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ error: null });
    mockUpdateProspectStatus.mockResolvedValue(undefined);

    await recordResponse('place-123', 'no_response');

    expect(mockUpdateProspectStatus).not.toHaveBeenCalled();
  });
});

describe('getOutreachStats', () => {
  it('should return correct counts', async () => {
    const mockData = [
      { place_id: '1', contacted_at: '2024-01-01', response: 'interested' },
      { place_id: '2', contacted_at: '2024-01-02', response: 'not_interested' },
      { place_id: '3', contacted_at: '2024-01-03', response: 'no_response' },
      { place_id: '4', contacted_at: null, response: null },
      { place_id: '5', contacted_at: '2024-01-05', response: 'interested' },
    ];

    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockResolvedValue({ data: mockData, error: null });

    const stats = await getOutreachStats();

    expect(stats).toEqual({
      total: 5,
      contacted: 4,
      interested: 2,
      not_interested: 1,
      no_response: 1,
    });
  });

  it('should return zeros for empty data', async () => {
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockResolvedValue({ data: [], error: null });

    const stats = await getOutreachStats();

    expect(stats).toEqual({
      total: 0,
      contacted: 0,
      interested: 0,
      not_interested: 0,
      no_response: 0,
    });
  });

  it('should throw error on database failure', async () => {
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockResolvedValue({ data: null, error: { message: 'Database error' } });

    await expect(getOutreachStats()).rejects.toThrow('Failed to get outreach stats: Database error');
  });
});

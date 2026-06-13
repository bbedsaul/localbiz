import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockRunScan = jest.fn<(t: unknown) => Promise<unknown>>();
const mockGetProspectsToScan = jest.fn<() => Promise<unknown[]>>();
const mockUpdateProspectScan = jest.fn<(id: string, scan: unknown) => Promise<void>>();

jest.unstable_mockModule('sitevitals-engine', () => ({ runScan: mockRunScan }));
jest.unstable_mockModule('../src/db.js', () => ({
  getProspectsToScan: mockGetProspectsToScan,
  updateProspectScan: mockUpdateProspectScan,
}));

const { scanProspects } = await import('../src/scan-prospects.js');

describe('scanProspects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scans prospects that have a website and stores the grade', async () => {
    mockGetProspectsToScan.mockResolvedValue([
      { place_id: 'p1', name: "Joe's HVAC", city: 'Austin', category: 'HVAC', website_url: 'https://joes-hvac.com' },
    ]);
    mockRunScan.mockResolvedValue({
      finishedAt: '2026-06-13T12:00:00.000Z',
      scores: { composite: 72, grade: 'C' },
    });

    const enriched = await scanProspects();

    expect(enriched).toBe(1);
    expect(mockRunScan).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://joes-hvac.com', name: "Joe's HVAC" }),
    );
    expect(mockUpdateProspectScan).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ composite: 72, grade: 'C', scanned_at: '2026-06-13T12:00:00.000Z' }),
    );
  });

  it('returns 0 when no prospects have a website', async () => {
    mockGetProspectsToScan.mockResolvedValue([]);
    expect(await scanProspects()).toBe(0);
    expect(mockRunScan).not.toHaveBeenCalled();
  });

  it('keeps going when one scan fails', async () => {
    mockGetProspectsToScan.mockResolvedValue([
      { place_id: 'bad', name: 'Bad', city: 'X', category: 'Y', website_url: 'https://bad.test' },
      { place_id: 'ok', name: 'Ok', city: 'X', category: 'Y', website_url: 'https://ok.test' },
    ]);
    mockRunScan
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ finishedAt: 't', scores: { composite: 90, grade: 'A' } });

    expect(await scanProspects()).toBe(1);
    expect(mockUpdateProspectScan).toHaveBeenCalledTimes(1);
    expect(mockUpdateProspectScan).toHaveBeenCalledWith('ok', expect.objectContaining({ grade: 'A' }));
  });
});

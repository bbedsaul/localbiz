import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';

const mockUpsertProspect = jest.fn<() => Promise<void>>();

jest.unstable_mockModule('../src/db.js', () => ({
  upsertProspect: mockUpsertProspect,
  supabase: {},
  findByPlaceId: jest.fn(),
  getTopProspects: jest.fn(),
  updateProspectStatus: jest.fn(),
  insertToOutreachQueue: jest.fn(),
}));

let app: Express;
let generatePlaceId: (businessName: string, city: string, state: string) => string;

beforeAll(async () => {
  const apiModule = await import('../src/api.js');
  app = apiModule.app;
  generatePlaceId = apiModule.generatePlaceId;
});

describe('POST /api/onboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpsertProspect.mockResolvedValue(undefined);
  });

  const validBody = {
    businessName: 'Test Plumbing',
    ownerName: 'John Doe',
    city: 'Austin',
    state: 'TX',
    phone: '512-555-1234',
    email: 'john@testplumbing.com',
    category: 'plumber',
  };

  it('should return 400 when businessName is missing', async () => {
    const { businessName, ...body } = validBody;
    const res = await request(app).post('/api/onboard').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing required field: businessName');
  });

  it('should return 400 when city is missing', async () => {
    const { city, ...body } = validBody;
    const res = await request(app).post('/api/onboard').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing required field: city');
  });

  it('should return 400 when state is missing', async () => {
    const { state, ...body } = validBody;
    const res = await request(app).post('/api/onboard').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing required field: state');
  });

  it('should return 400 when phone is missing', async () => {
    const { phone, ...body } = validBody;
    const res = await request(app).post('/api/onboard').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing required field: phone');
  });

  it('should return 200 with correctly mapped Prospect on valid submission', async () => {
    const res = await request(app).post('/api/onboard').send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.placeId).toMatch(/^form-[a-f0-9]{64}$/);

    expect(mockUpsertProspect).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Plumbing',
        phone: '512-555-1234',
        city: 'Austin',
        category: 'plumber',
        score: 60,
        status: 'new',
        source: 'form',
      })
    );
  });

  it('should generate same place_id for same businessName+city+state', () => {
    const placeId1 = generatePlaceId('Test Plumbing', 'Austin', 'TX');
    const placeId2 = generatePlaceId('Test Plumbing', 'Austin', 'TX');
    expect(placeId1).toBe(placeId2);

    // Different inputs should produce different IDs
    const placeId3 = generatePlaceId('Other Business', 'Austin', 'TX');
    expect(placeId1).not.toBe(placeId3);
  });

  it('should return 500 when upsertProspect throws', async () => {
    mockUpsertProspect.mockRejectedValue(new Error('Supabase error'));

    const res = await request(app).post('/api/onboard').send(validBody);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

describe('GET /health', () => {
  it('should return 200 with status ok and timestamp', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

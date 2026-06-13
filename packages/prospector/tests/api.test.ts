import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';

const mockUpsertProspect = jest.fn<() => Promise<void>>();
const mockGetProspectStats = jest.fn<() => Promise<object>>();
const mockGetUser = jest.fn<() => Promise<{ data: { user: object | null }; error: Error | null }>>();

jest.unstable_mockModule('../src/db.js', () => ({
  upsertProspect: mockUpsertProspect,
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
  },
  findByPlaceId: jest.fn(),
  getTopProspects: jest.fn(),
  updateProspectStatus: jest.fn(),
  insertToOutreachQueue: jest.fn(),
  getProspects: jest.fn(),
  getProspectStats: mockGetProspectStats,
  getFormSubmissions: jest.fn(),
  getFormStats: jest.fn(),
  getScheduledSearches: jest.fn(),
  createScheduledSearch: jest.fn(),
  updateScheduledSearch: jest.fn(),
  deleteScheduledSearch: jest.fn(),
  getScheduledSearchById: jest.fn(),
  getSiteBuilds: jest.fn(),
  getBuildStats: jest.fn(),
  createSiteBuild: jest.fn(),
  updateSiteBuild: jest.fn(),
  insertProspectPhoto: jest.fn(),
  getProspectPhotos: jest.fn(),
  getProspectPhotoById: jest.fn(),
  deleteProspectPhoto: jest.fn(),
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

describe('Protected Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/prospects/stats', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const res = await request(app).get('/api/prospects/stats');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Missing authorization token');
    });

    it('should return 401 when authorization header is malformed', async () => {
      const res = await request(app)
        .get('/api/prospects/stats')
        .set('Authorization', 'InvalidToken');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Missing authorization token');
    });

    it('should return 401 when token is invalid', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid token'),
      });

      const res = await request(app)
        .get('/api/prospects/stats')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });

    it('should return 200 with stats when token is valid', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      mockGetProspectStats.mockResolvedValue({
        total: 100,
        new: 50,
        queued: 20,
        contacted: 15,
        building: 10,
        live: 5,
      });

      const res = await request(app)
        .get('/api/prospects/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        total: 100,
        new: 50,
        queued: 20,
        contacted: 15,
        building: 10,
        live: 5,
      });
    });
  });

  describe('GET /api/prospects', () => {
    it('should return 401 without authorization', async () => {
      const res = await request(app).get('/api/prospects');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Missing authorization token');
    });
  });

  describe('GET /api/forms', () => {
    it('should return 401 without authorization', async () => {
      const res = await request(app).get('/api/forms');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Missing authorization token');
    });
  });

  describe('GET /api/searches', () => {
    it('should return 401 without authorization', async () => {
      const res = await request(app).get('/api/searches');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Missing authorization token');
    });
  });

  describe('GET /api/builds', () => {
    it('should return 401 without authorization', async () => {
      const res = await request(app).get('/api/builds');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Missing authorization token');
    });
  });
});

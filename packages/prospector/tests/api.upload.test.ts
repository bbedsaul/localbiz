import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import type { ProspectPhoto } from '../src/types.js';
import type { InsertProspectPhotoInput } from '../src/db.js';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUpsertProspect = jest.fn<() => Promise<void>>();
const mockInsertProspectPhoto = jest.fn<(input: InsertProspectPhotoInput) => Promise<ProspectPhoto>>();
const mockGetProspectPhotos = jest.fn<() => Promise<ProspectPhoto[]>>();
const mockGetProspectPhotoById = jest.fn<() => Promise<ProspectPhoto | null>>();
const mockDeleteProspectPhoto = jest.fn<() => Promise<void>>();
const mockGetUser = jest.fn<() => Promise<{ data: { user: object | null }; error: Error | null }>>();

const mockStorageUpload = jest.fn<(key: string, buf: Buffer, ct: string) => Promise<{ key: string; publicUrl: string }>>();
const mockStorageDelete = jest.fn<(key: string) => Promise<void>>();
const mockStorageGetPublicUrl = jest.fn<(key: string) => string>();

jest.unstable_mockModule('../src/db.js', () => ({
  upsertProspect: mockUpsertProspect,
  supabase: {
    auth: { getUser: mockGetUser },
  },
  findByPlaceId: jest.fn(),
  getTopProspects: jest.fn(),
  updateProspectStatus: jest.fn(),
  insertToOutreachQueue: jest.fn(),
  getProspects: jest.fn(),
  getProspectStats: jest.fn(),
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
  insertProspectPhoto: mockInsertProspectPhoto,
  getProspectPhotos: mockGetProspectPhotos,
  getProspectPhotoById: mockGetProspectPhotoById,
  deleteProspectPhoto: mockDeleteProspectPhoto,
  getHotLeads: jest.fn(),
}));

jest.unstable_mockModule('../src/lib/storage.js', () => ({
  storage: {
    upload: mockStorageUpload,
    delete: mockStorageDelete,
    getPublicUrl: mockStorageGetPublicUrl,
  },
}));

let app: Express;

beforeAll(async () => {
  const apiModule = await import('../src/api.js');
  app = apiModule.app;
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const validForm = {
  businessName: 'Test Plumbing',
  ownerName: 'John Doe',
  city: 'Austin',
  state: 'TX',
  phone: '512-555-1234',
  email: 'john@testplumbing.com',
  category: 'plumber',
};

function fakeImage(byte: number): Buffer {
  // 1×1 PNG-ish bytes — content doesn't matter, only mimetype
  return Buffer.from([byte, byte + 1, byte + 2, byte + 3]);
}

function applyForm(req: request.Test, form: Record<string, string>): request.Test {
  for (const [k, v] of Object.entries(form)) req.field(k, v);
  return req;
}

function fakePhotoRow(overrides: Partial<ProspectPhoto> = {}): ProspectPhoto {
  return {
    id: 1,
    prospect_place_id: 'form-abc',
    storage_key: 'k',
    public_url: 'https://cdn/k',
    file_name: 'f.png',
    mime_type: 'image/png',
    size_bytes: 100,
    caption: '',
    sort_order: 0,
    created_at: '2026-05-03T00:00:00Z',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/onboard with photos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpsertProspect.mockResolvedValue(undefined);
    let nextId = 1;
    mockInsertProspectPhoto.mockImplementation(async (input) =>
      fakePhotoRow({
        id: nextId++,
        prospect_place_id: input.prospect_place_id,
        storage_key: input.storage_key,
        public_url: input.public_url,
        file_name: input.file_name,
        mime_type: input.mime_type,
        size_bytes: input.size_bytes,
        caption: input.caption,
        sort_order: input.sort_order,
      })
    );
    mockStorageUpload.mockImplementation(async (key) => ({
      key,
      publicUrl: `https://cdn.example/${key}`,
    }));
    mockStorageDelete.mockResolvedValue(undefined);
  });

  it('200 with photoCount: 2 when valid form + 2 image files', async () => {
    const res = await applyForm(request(app).post('/api/onboard'), validForm)
      .attach('photos', fakeImage(1), { filename: 'a.png', contentType: 'image/png' })
      .attach('photos', fakeImage(2), { filename: 'b.jpg', contentType: 'image/jpeg' })
      .field('captions[]', 'first')
      .field('captions[]', 'second');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.photoCount).toBe(2);
    expect(mockStorageUpload).toHaveBeenCalledTimes(2);
    expect(mockInsertProspectPhoto).toHaveBeenCalledTimes(2);
    // Captions and sort_order match submission order
    expect(mockInsertProspectPhoto.mock.calls[0][0].caption).toBe('first');
    expect(mockInsertProspectPhoto.mock.calls[0][0].sort_order).toBe(0);
    expect(mockInsertProspectPhoto.mock.calls[1][0].caption).toBe('second');
    expect(mockInsertProspectPhoto.mock.calls[1][0].sort_order).toBe(1);
  });

  it('caps at 20 when 21 photos are sent (no error thrown)', async () => {
    let req = applyForm(request(app).post('/api/onboard'), validForm);
    for (let i = 0; i < 21; i++) {
      req = req.attach('photos', fakeImage(i), { filename: `p${i}.png`, contentType: 'image/png' });
    }
    const res = await req;
    expect(res.status).toBe(200);
    expect(res.body.photoCount).toBe(20);
    expect(mockStorageUpload).toHaveBeenCalledTimes(20);
  });

  it('rejects non-image via fileFilter; prospect still created with valid photos', async () => {
    const res = await applyForm(request(app).post('/api/onboard'), validForm)
      .attach('photos', fakeImage(1), { filename: 'a.png', contentType: 'image/png' })
      .attach('photos', Buffer.from('not an image'), { filename: 'evil.txt', contentType: 'text/plain' })
      .attach('photos', fakeImage(3), { filename: 'c.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.photoCount).toBe(2); // .txt was dropped by fileFilter
    expect(mockUpsertProspect).toHaveBeenCalled();
    expect(mockStorageUpload).toHaveBeenCalledTimes(2);
  });

  it('returns 207 and rolls back when storage.upload throws on 2nd file', async () => {
    mockStorageUpload
      .mockImplementationOnce(async (key) => ({ key, publicUrl: `https://cdn/${key}` }))
      .mockImplementationOnce(async () => {
        throw new Error('S3 down');
      });

    const res = await applyForm(request(app).post('/api/onboard'), validForm)
      .attach('photos', fakeImage(1), { filename: 'a.png', contentType: 'image/png' })
      .attach('photos', fakeImage(2), { filename: 'b.png', contentType: 'image/png' });

    expect(res.status).toBe(207);
    expect(res.body.success).toBe(true);
    expect(res.body.photoErrors).toHaveLength(1);
    expect(res.body.photoErrors[0].fileName).toBe('b.png');
    // First upload's key should have been deleted as rollback
    expect(mockStorageDelete).toHaveBeenCalledTimes(1);
    // The DB row inserted for the first photo should also have been removed
    expect(mockDeleteProspectPhoto).toHaveBeenCalledTimes(1);
  });
});

describe('GET /api/prospects/:id/photos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 't@example.com' } },
      error: null,
    });
  });

  it('returns photos ordered by sort_order', async () => {
    const photos: ProspectPhoto[] = [
      fakePhotoRow({ id: 1, sort_order: 0, file_name: 'a.png' }),
      fakePhotoRow({ id: 2, sort_order: 1, file_name: 'b.png' }),
    ];
    mockGetProspectPhotos.mockResolvedValue(photos);

    const res = await request(app)
      .get('/api/prospects/form-abc/photos')
      .set('Authorization', 'Bearer valid');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].sort_order).toBe(0);
    expect(res.body[1].sort_order).toBe(1);
    expect(mockGetProspectPhotos).toHaveBeenCalledWith('form-abc');
  });
});

describe('DELETE /api/prospects/:id/photos/:photoId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 't@example.com' } },
      error: null,
    });
  });

  it('204 and storage.delete called when photo exists', async () => {
    mockGetProspectPhotoById.mockResolvedValue(
      fakePhotoRow({ id: 7, prospect_place_id: 'form-abc', storage_key: 'prospects/form-abc/img.png' })
    );
    mockDeleteProspectPhoto.mockResolvedValue(undefined);
    mockStorageDelete.mockResolvedValue(undefined);

    const res = await request(app)
      .delete('/api/prospects/form-abc/photos/7')
      .set('Authorization', 'Bearer valid');

    expect(res.status).toBe(204);
    expect(mockDeleteProspectPhoto).toHaveBeenCalledWith(7);
    expect(mockStorageDelete).toHaveBeenCalledWith('prospects/form-abc/img.png');
  });

  it('404 when photo not found', async () => {
    mockGetProspectPhotoById.mockResolvedValue(null);
    const res = await request(app)
      .delete('/api/prospects/form-abc/photos/99')
      .set('Authorization', 'Bearer valid');

    expect(res.status).toBe(404);
    expect(mockDeleteProspectPhoto).not.toHaveBeenCalled();
    expect(mockStorageDelete).not.toHaveBeenCalled();
  });
});

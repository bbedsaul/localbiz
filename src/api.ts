import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import {
  supabase,
  upsertProspect,
  updateProspectStatus,
  getProspects,
  getProspectStats,
  getFormSubmissions,
  getFormStats,
  getScheduledSearches,
  createScheduledSearch,
  updateScheduledSearch,
  deleteScheduledSearch,
  getScheduledSearchById,
  getSiteBuilds,
  getBuildStats,
  createSiteBuild,
  updateSiteBuild,
} from './db.js';
import { runProspectorSweep } from './prospector.js';
import { markContacted, recordResponse, getOutreachStats } from './queue.js';
import { Prospect, ContactMethod, OutreachResponse } from './types.js';
import 'dotenv/config';

const app = express();

app.use(cors());
app.use(express.json());

// ============ Types ============

interface OnboardingBody {
  businessName?: string;
  ownerName?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  category?: string;
  yearsInBusiness?: number;
  serviceType?: string;
  goals?: string;
  wantsBooking?: boolean;
  description?: string;
  services?: string;
  promo?: string;
  testimonial?: string;
  address?: string;
  openDays?: string;
  openTime?: string;
  closeTime?: string;
  social?: string;
  notes?: string;
}

interface AuthenticatedRequest extends Request {
  user?: { id: string; email?: string };
}

// ============ Helper Functions ============

function generatePlaceId(businessName: string, city: string, state: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(businessName + city + state)
    .digest('hex');
  return `form-${hash}`;
}

// ============ Auth Middleware ============

async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    req.user = { id: user.id, email: user.email };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ============ Public Routes ============

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/onboard', async (req: Request<object, object, OnboardingBody>, res: Response) => {
  const { businessName, city, state, phone, category } = req.body;

  // Validate required fields
  if (!businessName) {
    res.status(400).json({ error: 'Missing required field: businessName' });
    return;
  }
  if (!city) {
    res.status(400).json({ error: 'Missing required field: city' });
    return;
  }
  if (!state) {
    res.status(400).json({ error: 'Missing required field: state' });
    return;
  }
  if (!phone) {
    res.status(400).json({ error: 'Missing required field: phone' });
    return;
  }

  const placeId = generatePlaceId(businessName, city, state);

  const prospect: Prospect = {
    place_id: placeId,
    name: businessName,
    phone: phone,
    score: 60,
    status: 'new',
    source: 'form',
    city: city,
    category: category || 'general',
  };

  try {
    await upsertProspect(prospect);
    res.status(200).json({ success: true, placeId });
  } catch (error) {
    console.error('Failed to upsert prospect:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Protected Routes ============

// Prospects
app.get('/api/prospects', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, search, limit, offset } = req.query;
    const prospects = await getProspects({
      status: status as string | undefined,
      search: search as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });
    res.status(200).json(prospects);
  } catch (error) {
    console.error('Failed to get prospects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/prospects/stats', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await getProspectStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Failed to get prospect stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/prospects/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    res.status(400).json({ error: 'Missing status field' });
    return;
  }

  try {
    await updateProspectStatus(id, status);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to update prospect:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forms
app.get('/api/forms', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const forms = await getFormSubmissions();
    res.status(200).json(forms);
  } catch (error) {
    console.error('Failed to get forms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/forms/stats', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await getFormStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Failed to get form stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/forms/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
    return;
  }

  try {
    // Map 'approved' to 'queued' and 'rejected' to 'rejected' in prospects table
    const prospectStatus = status === 'approved' ? 'queued' : 'rejected';
    await updateProspectStatus(id, prospectStatus);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to update form:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Scheduled Searches
app.get('/api/searches', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const searches = await getScheduledSearches();
    res.status(200).json(searches);
  } catch (error) {
    console.error('Failed to get searches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/searches', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { category, city, schedule } = req.body;

  if (!category || !city || !schedule) {
    res.status(400).json({ error: 'Missing required fields: category, city, schedule' });
    return;
  }

  try {
    const search = await createScheduledSearch(category, city, schedule);
    res.status(201).json(search);
  } catch (error) {
    console.error('Failed to create search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/searches/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    res.status(400).json({ error: 'Missing status field' });
    return;
  }

  try {
    await updateScheduledSearch(parseInt(id, 10), { status });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to update search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/searches/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    await deleteScheduledSearch(parseInt(id, 10));
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/searches/:id/run', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const search = await getScheduledSearchById(parseInt(id, 10));

    if (!search) {
      res.status(404).json({ error: 'Search not found' });
      return;
    }

    // Trigger sweep asynchronously
    runProspectorSweep({ city: search.city, category: search.category })
      .then(async (stats) => {
        await updateScheduledSearch(parseInt(id, 10), {
          last_run: new Date().toISOString(),
          found_count: stats.upserted,
        });
        console.log(`Sweep completed for search ${id}:`, stats);
      })
      .catch((error) => {
        console.error(`Sweep failed for search ${id}:`, error);
      });

    res.status(202).json({ message: 'Sweep started' });
  } catch (error) {
    console.error('Failed to run search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Site Builds
app.get('/api/builds', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const builds = await getSiteBuilds();
    res.status(200).json(builds);
  } catch (error) {
    console.error('Failed to get builds:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/builds/stats', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await getBuildStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Failed to get build stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/builds', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { prospectId, template, domain, priority } = req.body;

  if (!prospectId || !template) {
    res.status(400).json({ error: 'Missing required fields: prospectId, template' });
    return;
  }

  try {
    const build = await createSiteBuild(prospectId, template, domain, priority);
    res.status(201).json(build);
  } catch (error) {
    console.error('Failed to create build:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/builds/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, url } = req.body;

  const updates: { status?: string; started_at?: string; completed_at?: string; url?: string } = {};

  if (status) {
    updates.status = status;
    if (status === 'building') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'live') {
      updates.completed_at = new Date().toISOString();
    }
  }

  if (url) {
    updates.url = url;
  }

  try {
    await updateSiteBuild(parseInt(id, 10), updates);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to update build:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Outreach ============

app.post('/api/outreach/:prospectId/contact', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { prospectId } = req.params;
  const { method } = req.body;

  const validMethods: ContactMethod[] = ['email', 'phone', 'mail'];
  if (!method || !validMethods.includes(method)) {
    res.status(400).json({ error: 'Invalid method. Must be "email", "phone", or "mail"' });
    return;
  }

  try {
    await markContacted(prospectId, method);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to mark contacted:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/outreach/:prospectId/response', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { prospectId } = req.params;
  const { response, notes } = req.body;

  const validResponses: OutreachResponse[] = ['interested', 'not_interested', 'no_response'];
  if (!response || !validResponses.includes(response)) {
    res.status(400).json({ error: 'Invalid response. Must be "interested", "not_interested", or "no_response"' });
    return;
  }

  try {
    await recordResponse(prospectId, response, notes);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to record response:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/outreach/stats', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await getOutreachStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Failed to get outreach stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Export & Start ============

export { app, generatePlaceId, authMiddleware };

const API_PORT = process.env.API_PORT || 3001;

// Start server when run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  app.listen(API_PORT, () => {
    console.log(`API server running on port ${API_PORT}`);
  });
}

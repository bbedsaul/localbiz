import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { upsertProspect } from './db.js';
import { markContacted, recordResponse, getOutreachStats } from './queue.js';
import { Prospect, ContactMethod, OutreachResponse } from './types.js';
import 'dotenv/config';

const app = express();

app.use(cors());
app.use(express.json());

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

function generatePlaceId(businessName: string, city: string, state: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(businessName + city + state)
    .digest('hex');
  return `form-${hash}`;
}

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

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Outreach endpoints
interface ContactBody {
  method: ContactMethod;
}

interface ResponseBody {
  response: OutreachResponse;
  notes?: string;
}

app.post('/api/outreach/:placeId/contact', async (req: Request<{ placeId: string }, object, ContactBody>, res: Response) => {
  const { placeId } = req.params;
  const { method } = req.body;

  if (!method || !['email', 'phone', 'mail'].includes(method)) {
    res.status(400).json({ error: 'Invalid or missing contact method' });
    return;
  }

  try {
    await markContacted(placeId, method);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to mark contacted:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/outreach/:placeId/response', async (req: Request<{ placeId: string }, object, ResponseBody>, res: Response) => {
  const { placeId } = req.params;
  const { response, notes } = req.body;

  if (!response || !['interested', 'not_interested', 'no_response'].includes(response)) {
    res.status(400).json({ error: 'Invalid or missing response' });
    return;
  }

  try {
    await recordResponse(placeId, response, notes);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to record response:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/outreach/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getOutreachStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Failed to get outreach stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { app, generatePlaceId };

const API_PORT = process.env.API_PORT || 3001;

// Start server when run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  app.listen(API_PORT, () => {
    console.log(`API server running on port ${API_PORT}`);
  });
}

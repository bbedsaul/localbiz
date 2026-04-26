import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { upsertProspect } from './db.js';
import { Prospect } from './types.js';
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

export { app, generatePlaceId };

const API_PORT = process.env.API_PORT || 3001;

// Start server when run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  app.listen(API_PORT, () => {
    console.log(`API server running on port ${API_PORT}`);
  });
}

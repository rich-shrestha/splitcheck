import { jwtVerify } from 'jose';
import { redis } from '../../lib/redis.js';

function getCookie(req, name) {
  const cookie = req.headers.cookie || '';
  const match = cookie.split(';').find(c => c.trim().startsWith(`${name}=`));
  return match ? match.split('=').slice(1).join('=').trim() : null;
}

async function getUser(req) {
  const token = getCookie(req, 'session');
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload.user;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const uid = user.id;

  if (req.method === 'GET') {
    const [flagged, history, skipped, splits, sessions, venmo] = await Promise.all([
      redis.get(`user:${uid}:flagged`),
      redis.get(`user:${uid}:history`),
      redis.get(`user:${uid}:skipped`),
      redis.get(`user:${uid}:splits`),
      redis.get(`user:${uid}:sessions`),
      redis.get(`user:${uid}:venmo`),
    ]);
    return res.status(200).json({
      flagged: flagged || [],
      history: history || [],
      skipped: skipped || {},
      splits: splits || {},
      sessions: sessions || [],
      venmo: venmo || {},
    });
  }

  if (req.method === 'POST') {
    const { type, data } = req.body;
    if (!['flagged', 'history', 'skipped', 'splits', 'sessions', 'venmo'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }
    await redis.set(`user:${uid}:${type}`, data);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}

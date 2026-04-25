import { redis } from '../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date().toISOString();
  const payload = JSON.stringify({
    ok: true,
    source: 'vercel-cron',
    ranAt: now,
  });

  await redis.set('system:keepalive', payload, { ex: 60 * 60 * 24 * 30 });
  const saved = await redis.get('system:keepalive');

  return res.status(200).json({
    ok: true,
    ranAt: now,
    saved,
  });
}

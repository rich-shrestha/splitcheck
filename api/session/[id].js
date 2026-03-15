// api/session/[id].js
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { id } = req.query;
  try {
    const raw = await redis.get(`session:${id}`);
    if (!raw) return res.status(404).json({ error: 'Session not found or expired (12h limit)' });
    const session = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return res.status(200).json(session);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
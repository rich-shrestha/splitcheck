import { redis } from '../../lib/redis.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const data = await redis.get(`card:${id}`);
    if (!data) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const newId = Math.random().toString(36).slice(2, 9);
    await redis.set(`card:${newId}`, req.body, { ex: 86400 * 30 });
    return res.status(200).json({ id: newId });
  }

  return res.status(405).end();
}

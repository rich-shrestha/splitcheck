import convert from 'heic-convert';

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let { image, mimeType } = req.body;
  if (!image) return res.status(400).json({ error: 'Need image' });

  // Server-side HEIC→JPEG conversion (heic2any can't handle HEVC-encoded iPhone photos)
  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    try {
      const buf = Buffer.from(image, 'base64');
      const jpegBuf = await convert({ buffer: buf, format: 'JPEG', quality: 0.9 });
      image = Buffer.from(jpegBuf).toString('base64');
      mimeType = 'image/jpeg';
    } catch (e) {
      return res.status(400).json({ error: `HEIC conversion failed: ${e.message}` });
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const prompt = `You are reading a bank statement, credit card statement, or transaction list.
Extract every debit/charge transaction visible.

Return ONLY this exact JSON (no markdown, no code fences):
{"transactions":[{"merchant":"store name","date":"MM/DD/YYYY","amount":0.00,"category":"grocery"}]}

RULES:
1. merchant: clean business name only (remove card numbers, location codes, etc)
2. date: MM/DD/YYYY — if only month/day visible use current year
3. amount: positive dollar amount of the charge
4. category: one of: restaurant, grocery, food & drink, shopping, entertainment, travel, other
5. Include ALL visible debit/charge transactions
6. SKIP: credits, payments, rewards redemptions, refunds, balance entries, fees
7. If the image shows many transactions, include every single one
8. If unclear, make your best guess rather than skipping

If no transactions found: {"transactions":[]}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: image } },
          { type: 'text', text: prompt }
        ]}],
      }),
    });
    const data = await r.json();
    const raw = data.content?.[0]?.text || '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(200).json({ transactions: [], _debug: { raw, error: data.error } });
    try {
      const parsed = JSON.parse(match[0]);
      return res.status(200).json(parsed);
    } catch(pe) {
      return res.status(200).json({ transactions: [], _debug: { raw, parseError: pe.message } });
    }
  } catch(e) {
    return res.status(500).json({ error: e.message, transactions: [] });
  }
}

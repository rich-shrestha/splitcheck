export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { image, mimeType, text, amount } = req.body;
  if (!image && !text) return res.status(400).json({ error: 'Need image or text' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const prompt = `Extract line items from this receipt. Return ONLY valid JSON with no markdown or explanation:
{"merchant":"...","total":0.00,"items":[{"name":"...","price":0.00}]}
Rules:
- Include only purchasable items (food, drinks, products)
- Exclude tax, tip, subtotal, discount, fee, and delivery lines
- Use the line total price for each item (not unit price)
- If you cannot find items, return {"merchant":"Unknown","total":0,"items":[]}${amount ? `\nThe expected receipt total is approximately $${amount}` : ''}`;

  const messages = image
    ? [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: image } },
        { type: 'text', text: prompt }
      ]}]
    : [{ role: 'user', content: `${prompt}\n\nReceipt text:\n${text.slice(0, 8000)}` }];

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages,
      }),
    });
    const data = await r.json();
    const raw = data.content?.[0]?.text || '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(200).json({ items: [] });
    const parsed = JSON.parse(match[0]);
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message, items: [] });
  }
}

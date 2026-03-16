export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { image, mimeType, text, amount } = req.body;
  if (!image && !text) return res.status(400).json({ error: 'Need image or text' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const prompt = `Extract purchased items from this receipt or order confirmation. Return ONLY valid JSON with no markdown:
{"merchant":"...","total":0.00,"items":[{"name":"...","price":0.00}]}
Rules:
- Include every product, food item, or grocery line with a price
- This may be a grocery receipt, restaurant check, Amazon/Whole Foods order, or any store receipt
- For order confirmations: include each ordered item and its price
- Exclude: tax, tip, subtotal, discount lines, delivery fee, service fee, bag fee
- Use the final line price for each item (after any per-item discount)
- Always return at least the items array, even if empty
- Do NOT return markdown, just raw JSON${amount ? `\nExpected total: ~$${amount}` : ''}`;

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
        model: 'claude-sonnet-4-6',
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

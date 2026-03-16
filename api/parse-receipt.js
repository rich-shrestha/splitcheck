export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { image, mimeType, text, amount } = req.body;
  if (!image && !text) return res.status(400).json({ error: 'Need image or text' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const prompt = `You are reading a receipt or order confirmation. Extract every purchased item and its price.

Return ONLY this exact JSON format with no markdown, no explanation, no code fences:
{"merchant":"store name","total":0.00,"items":[{"name":"item name","price":0.00}]}

IMPORTANT RULES:
1. Include ALL products, groceries, food items, drinks — anything that was purchased
2. For Whole Foods / Amazon grocery orders: each line like "Organic Milk $4.99" is one item
3. For restaurant receipts: each menu item with its price
4. EXCLUDE these line types: Tax, Tip, Subtotal, Total, Discount, Savings, Bag Fee, Delivery Fee, Service Fee, Estimated Tax
5. If an item has a sale price, use the final sale price (not original)
6. If you see "2x Item Name $9.98" treat it as one item at $9.98
7. Even if the receipt is blurry or partially readable, extract what you can
8. NEVER return an empty items array if you can see any products with prices${amount ? `\nThe order total should be around $${amount} — use this to sanity-check your extraction` : ''}

If you truly cannot find any items, return: {"merchant":"Unknown","total":0,"items":[]}`;

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

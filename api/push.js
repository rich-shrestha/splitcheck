// api/push.js
import crypto from 'crypto';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { expenses, threshold, twilioSid, twilioToken, twilioFrom, twilioTo } = req.body;
  if (!expenses?.length) return res.status(400).json({ error: 'No expenses provided' });

  const sessionId = crypto.randomBytes(6).toString('hex');
  const appUrl = `${process.env.APP_URL}/view/${sessionId}`;

  // Store session for 12 hours
  await redis.set(`session:${sessionId}`, JSON.stringify({ expenses, threshold, createdAt: Date.now() }), { ex: 43200 });

  // SMS
  let smsSent = false, smsError = null;
  if (twilioSid && twilioToken && twilioFrom && twilioTo) {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const lines = expenses.slice(0, 5).map(e => `• ${e.merchant}: $${e.amount.toFixed(2)}`).join('\n');
    const more = expenses.length > 5 ? `\n+${expenses.length - 5} more` : '';
    const body = `💸 SplitCheck: ${expenses.length} expense${expenses.length > 1 ? 's' : ''} to split ($${total.toFixed(2)})\n\n${lines}${more}\n\n${appUrl}`;
    try {
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: { 'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ From: twilioFrom, To: twilioTo, Body: body })
      });
      smsSent = r.ok;
      if (!r.ok) { const e = await r.json(); smsError = e.message; }
    } catch (e) { smsError = e.message; }
  }

  return res.status(200).json({ sessionId, appUrl, smsSent, smsError });
}
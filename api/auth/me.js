import { jwtVerify } from 'jose';

function getCookie(req, name) {
  const cookie = req.headers.cookie || '';
  const match = cookie.split(';').find(c => c.trim().startsWith(`${name}=`));
  return match ? match.split('=').slice(1).join('=').trim() : null;
}

export default async function handler(req, res) {
  const token = getCookie(req, 'session');
  if (!token) return res.status(401).json({ user: null });

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return res.status(200).json({ user: payload.user });
  } catch (e) {
    return res.status(401).json({ user: null });
  }
}

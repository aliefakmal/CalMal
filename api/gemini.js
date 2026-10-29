// Vercel Serverless Function: Proxy Gemini API requests securely
// Prevents exposing GEMINI_API_KEY to client bundles while supporting client override

export default async function handler(req, res) {
  // Set CORS headers for client requests
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use server environment variable first, or allow client-supplied bearer token
  const authHeader = req.headers.authorization || '';
  const clientKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const apiKey = process.env.GEMINI_API_KEY || clientKey;

  if (!apiKey) {
    return res.status(400).json({
      error: 'Gemini API key is not configured on the server. Please provide an API key in Profile settings.',
    });
  }

  try {
    const { model = 'gemini-2.0-flash', contents, generationConfig, systemInstruction } = req.body || {};
    const modelMap = {
      'gemini-3.5-flash-lite': 'gemini-2.0-flash',
      'gemini-3.1-flash-lite': 'gemini-1.5-flash',
      'gemma-4-31b': 'gemini-1.5-flash-8b',
      'gemini-2.5-flash': 'gemini-2.0-flash',
    };
    const targetModel = modelMap[model] || model;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${apiKey}`;

    const payload = { contents };
    if (!generationConfig) payload.generationConfig = { responseMimeType: 'application/json' };
    if (generationConfig) payload.generationConfig = generationConfig;
    if (systemInstruction) payload.systemInstruction = systemInstruction;

    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Server error proxying AI request: ' + (err.message || String(err)) });
  }
}

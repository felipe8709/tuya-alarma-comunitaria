const crypto = require('crypto');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { message, secret } = req.body;
    
    if (!message || !secret) {
      return res.status(400).json({ error: 'Message and secret required' });
    }

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(message, 'utf8');
    const signature = hmac.digest('hex').toUpperCase();

    res.json({
      success: true,
      signature: signature,
      message: message
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

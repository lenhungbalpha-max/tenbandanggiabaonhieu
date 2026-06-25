module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') return res.status(405).end();

  // Xác thực API Key từ SePay (header: Authorization: Apikey YOUR_KEY)
  const authHeader = req.headers['authorization'] || '';
  const expectedKey = process.env.WEBHOOK_API_KEY || 'NhungTechAI2026Ebook';
  if (authHeader !== `Apikey ${expectedKey}`) {
    console.warn('[webhook] Unauthorized request');
    return res.status(401).json({ status: false, message: 'Unauthorized' });
  }

  const tx = req.body;
  const isValid =
    tx.transferType === 'in' &&
    Number(tx.transferAmount) >= 99000 &&
    tx.accountNumber === '6868836636';

  if (isValid) {
    console.log('[SePay] Payment confirmed:', JSON.stringify(tx));
  }

  return res.status(200).json({ status: true });
}

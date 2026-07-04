module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = (process.env.SEPAY_TOKEN || '').replace(/^﻿/, '').trim();
  const ebookLink = process.env.EBOOK_LINK;
  const { name, phone, code, amount: expectedAmountRaw, product } = req.body || {};
  const searchCode = (code || 'EBOOK').toUpperCase();
  const expectedAmount = Number(expectedAmountRaw) || 199000;
  const productName = product || 'Tên Bạn Đáng Giá Bao Nhiêu';

  if (!token) return res.status(500).json({ success: false, message: 'Hệ thống chưa cấu hình. Vui lòng liên hệ hỗ trợ.' });

  try {
    const resp = await fetch(
      'https://my.sepay.vn/userapi/transactions/list?limit=100&sort=DESC',
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    const data = await resp.json();
    console.log('[verify] SePay response keys:', JSON.stringify(Object.keys(data || {})));

    if (!data || !Array.isArray(data.transactions)) {
      console.log('[verify] No transactions array. Full response:', JSON.stringify(data).slice(0, 800));
      return res.status(200).json({ success: false, message: 'Không thể kiểm tra giao dịch. Vui lòng thử lại sau 1 phút.' });
    }

    console.log('[verify] Total transactions:', data.transactions.length);
    if (data.transactions.length > 0) {
      console.log('[verify] First tx:', JSON.stringify(data.transactions[0]));
      console.log('[verify] Last tx:', JSON.stringify(data.transactions[data.transactions.length - 1]));
    } else {
      console.log('[verify] Transactions array is EMPTY. SePay error field:', data.error, data.messages);
    }

    const match = data.transactions.find((tx) => {
      const content = (tx.transaction_content || tx.content || tx.description || '').toUpperCase();
      const amount = Number(tx.amount_in || tx.transferAmount || tx.amount || 0);
      const type = (tx.transferType || tx.type || 'in').toLowerCase();
      return amount >= expectedAmount && content.includes(searchCode) && type !== 'out';
    });

    if (match) {
      const amount = Number(match.amount_in || match.transferAmount || match.amount || 0);

      const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
      const chatId = (process.env.TELEGRAM_CHAT_ID || '').trim();
      if (botToken && chatId) {
        const text =
          `🎉 *Đơn hàng mới – ${productName}*\n` +
          `👤 Tên: ${name || 'Không rõ'}\n` +
          `📱 SĐT: ${phone || 'Không rõ'}\n` +
          `💰 Số tiền: ${amount.toLocaleString('vi-VN')}đ\n` +
          `🔖 Mã GD: ${searchCode}`;
        try {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
          });
        } catch (e) {
          console.error('[verify] Telegram notify failed:', e);
        }
      }

      return res.status(200).json({
        success: true,
        message: '✅ Thanh toán thành công! Kết nối Zalo để nhận link ebook ngay.',
        link: ebookLink || 'https://heyzine.com/flip-book/abf9f5216c.html',
      });
    }

    return res.status(200).json({
      success: false,
      message: 'Chưa tìm thấy giao dịch hợp lệ. Nếu bạn vừa chuyển, hãy đợi 1–2 phút rồi thử lại. Vẫn không được? Nhắn Zalo 0902921645.',
    });
  } catch (err) {
    console.error('[verify] Error:', err);
    return res.status(500).json({ success: false, message: 'Lỗi kết nối. Vui lòng thử lại hoặc liên hệ Zalo 0902921645.' });
  }
};

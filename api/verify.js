// Xác nhận thanh toán qua SePay API
// Khách nhập số điện thoại → hệ thống kiểm tra giao dịch khớp → trả về link ebook
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ success: false, message: 'Vui lòng nhập số điện thoại.' });

  const token = process.env.SEPAY_TOKEN;
  const ebookLink = process.env.EBOOK_LINK;

  if (!token) return res.status(500).json({ success: false, message: 'Hệ thống chưa cấu hình. Vui lòng liên hệ hỗ trợ.' });

  try {
    // Lấy 50 giao dịch gần nhất từ SePay
    const resp = await fetch(
      'https://my.sepay.vn/userapi/transactions/list?limit=50&sort=DESC',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await resp.json();

    if (!data || !Array.isArray(data.transactions)) {
      return res.status(200).json({
        success: false,
        message: 'Không thể kiểm tra giao dịch. Vui lòng thử lại sau 1 phút.',
      });
    }

    const last4 = phone.replace(/\D/g, '').slice(-4);

    // Tìm giao dịch: tiền vào, đủ 99,000đ, nội dung chứa EBOOK
    // Ưu tiên khớp 4 số cuối SĐT trong nội dung CK
    const match = data.transactions.find((tx) => {
      const content = (tx.transaction_content || '').toUpperCase();
      const amount = Number(tx.amount_in);
      return (
        amount >= 99000 &&
        content.includes('EBOOK') &&
        (content.includes(last4) || content.includes('EBOOK'))
      );
    });

    if (match) {
      return res.status(200).json({
        success: true,
        message: '✅ Thanh toán thành công! Đây là link ebook của bạn:',
        link: ebookLink || 'https://heyzine.com/flip-book/abf9f5216c.html',
        amount: match.amount_in,
        date: match.transaction_date,
      });
    }

    return res.status(200).json({
      success: false,
      message:
        'Chưa tìm thấy giao dịch hợp lệ. Nếu bạn vừa chuyển, hãy đợi 1–2 phút rồi thử lại. Vẫn không được? Nhắn Zalo 0902921645.',
    });
  } catch (err) {
    console.error('[verify] Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi kết nối. Vui lòng thử lại hoặc liên hệ Zalo 0902921645.',
    });
  }
}

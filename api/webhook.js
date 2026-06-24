// SePay webhook endpoint
// SePay gọi URL này khi có giao dịch mới vào tài khoản ngân hàng
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') return res.status(405).end();

  const tx = req.body;

  // Chỉ xử lý giao dịch tiền vào, đúng số tài khoản, đủ tiền
  const isValid =
    tx.transferType === 'in' &&
    Number(tx.transferAmount) >= 99000 &&
    tx.accountNumber === '6868836636';

  if (isValid) {
    console.log('[SePay] Payment confirmed:', JSON.stringify(tx));
    // Tương lai: gửi email/Zalo tự động tại đây
  }

  // SePay yêu cầu phản hồi 200 để xác nhận đã nhận webhook
  return res.status(200).json({ status: true });
}

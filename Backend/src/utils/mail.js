const nodemailer = require('nodemailer');

/* ---------- Transporter ---------- */
const transporter = nodemailer.createTransport({
  service: 'gmail',             // nếu dùng dịch vụ khác -> đổi
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* Test config ngay khi app khởi động */
(async () => {
  try {
    await transporter.verify();
    console.log('[MAIL] Transporter verified');
  } catch (err) {
    console.error('[MAIL] Transporter ERROR:', err.message);
  }
})();

/* ---------- Helpers ---------- */
const sendReminderEmail = async (
  to,
  petName,
  appointmentInfo,
  petSpecies = 'Không xác định',
  ownerName = 'Quý khách',
) => {
  if (!to || !to.includes('@')) throw new Error('Invalid email address');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width:600px;margin:auto">
      <h2 style="color:#4a90e2">Nhắc nhở lịch tái khám</h2>
      <p>Kính gửi ${ownerName},</p>
      <p>Đây là email nhắc nhở về lịch tái khám sắp tới của thú cưng:</p>
      <div style="background:#f5f5f5;padding:15px;border-radius:5px;margin:20px 0">
        <p><strong>Tên thú cưng:</strong> ${petName}</p>
        <p><strong>Loài:</strong> ${petSpecies}</p>
        <p><strong>Ngày tái khám:</strong> ${appointmentInfo}</p>
      </div>
      <p>Vui lòng đưa thú cưng của bạn đến khám theo đúng lịch hẹn.</p>
      <p>Nếu cần thay đổi, hãy liên hệ với chúng tôi sớm nhất.</p>
      <p>Trân trọng,<br>Đội ngũ chăm sóc thú cưng</p>
    </div>
  `;

  const info = await transporter.sendMail({
    from   : process.env.EMAIL_USER,
    to,
    subject: `Nhắc nhở: Lịch tái khám của ${petName}`,
    html,
  });

  return { success: true, messageId: info.messageId };
};

const sendSecurityWarningEmail = async (
  to,
  petName,
  ownerName = 'Quý khách',
  lockoutDuration = '12 giờ'
) => {
  if (!to || !to.includes('@')) throw new Error('Invalid email address');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width:600px;margin:auto">
      <h2 style="color:#e74c3c">⚠️ Cảnh báo bảo mật</h2>
      <p>Kính gửi ${ownerName},</p>
      <p>Chúng tôi phát hiện có nhiều lần nhập sai mã bảo vệ cho hồ sơ thú cưng của bạn:</p>
      <div style="background:#f8d7da;padding:15px;border-radius:5px;margin:20px 0;border-left:4px solid #e74c3c">
        <p><strong>Tên thú cưng:</strong> ${petName}</p>
        <p><strong>Thời gian khóa:</strong> ${lockoutDuration}</p>
        <p><strong>Lý do:</strong> Nhập sai mã bảo vệ quá 5 lần</p>
      </div>
      <p><strong>Điều này có thể là dấu hiệu của:</strong></p>
      <ul>
        <li>Ai đó đang cố gắng truy cập trái phép vào hồ sơ thú cưng</li>
        <li>Thú cưng của bạn có thể bị người khác tìm thấy và cố gắng thay đổi thông tin</li>
      </ul>
      <p><strong>Hành động khuyến nghị:</strong></p>
      <ul>
        <li>Kiểm tra xem thú cưng của bạn có an toàn không</li>
        <li>Nếu bạn không phải là người nhập mã, hãy liên hệ ngay với chúng tôi</li>
        <li>Sau ${lockoutDuration}, bạn có thể thử nhập mã bảo vệ lại</li>
      </ul>
      <p style="color:#e74c3c"><strong>Lưu ý:</strong> Nếu không phải bạn thực hiện, vui lòng liên hệ ngay với đội hỗ trợ.</p>
      <p>Trân trọng,<br>Đội ngũ bảo mật VNIPET</p>
    </div>
  `;

  const info = await transporter.sendMail({
    from   : process.env.EMAIL_USER,
    to,
    subject: `🚨 Cảnh báo bảo mật: Hồ sơ ${petName} bị khóa`,
    html,
  });

  return { success: true, messageId: info.messageId };
};

const sendOTPEmail = async (
  to,
  otpCode,
  userName = 'Quý khách'
) => {
  if (!to || !to.includes('@')) throw new Error('Invalid email address');
  if (!otpCode) throw new Error('OTP code is required');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width:600px;margin:auto; background:#f9f9f9; padding:20px; border-radius:10px;">
      <div style="background:white; padding:30px; border-radius:8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align:center; margin-bottom:30px;">
          <h1 style="color:#4a90e2; margin:0; font-size:28px;">🔐 Khôi phục mật khẩu</h1>
        </div>
        
        <p style="font-size:16px; line-height:1.6; color:#333;">Kính gửi ${userName},</p>
        
        <p style="font-size:16px; line-height:1.6; color:#333;">
          Bạn đã yêu cầu khôi phục mật khẩu cho tài khoản VNIPET của mình. 
          Vui lòng sử dụng mã OTP bên dưới để xác thực:
        </p>
        
        <div style="background:#f8f9fa; padding:25px; border-radius:8px; margin:25px 0; text-align:center; border-left:4px solid #4a90e2;">
          <p style="margin:0 0 10px 0; color:#666; font-size:14px;">Mã OTP của bạn:</p>
          <h2 style="margin:0; color:#4a90e2; font-size:36px; letter-spacing:8px; font-weight:bold;">${otpCode}</h2>
        </div>
        
        <div style="background:#fff3cd; border:1px solid #ffeaa7; border-radius:6px; padding:15px; margin:20px 0;">
          <p style="margin:0; color:#856404; font-size:14px;">
            <strong>⚠️ Lưu ý quan trọng:</strong><br>
            • Mã OTP này sẽ hết hạn sau <strong>10 phút</strong><br>
            • Chỉ có thể sử dụng mã này <strong>1 lần</strong><br>
            • Không chia sẻ mã này với bất kỳ ai
          </p>
        </div>
        
        <p style="font-size:14px; line-height:1.6; color:#666; margin-top:30px;">
          Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này và mật khẩu của bạn sẽ không bị thay đổi.
        </p>
        
        <hr style="border:none; border-top:1px solid #eee; margin:30px 0;">
        
        <p style="font-size:12px; color:#999; text-align:center; margin:0;">
          Trân trọng,<br>
          <strong style="color:#4a90e2;">Đội ngũ VNIPET</strong><br>
          Email tự động - Vui lòng không phản hồi
        </p>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from   : process.env.EMAIL_USER,
    to,
    subject: `🔐 Mã OTP khôi phục mật khẩu - ${otpCode}`,
    html,
  });

  return { success: true, messageId: info.messageId };
};

const testEmailConfig = async () => transporter.verify();

module.exports = { transporter, sendReminderEmail, sendSecurityWarningEmail, sendOTPEmail, testEmailConfig };

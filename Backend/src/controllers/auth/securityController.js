/**
 * Security Controller
 * Quản lý bảo mật tài khoản (đổi mật khẩu, quên mật khẩu, OTP)
 */

const User = require('../../models/PetOwnerUser');
const { sendOTPEmail } = require('../../utils/mail');

/**
 * Request password reset - Send OTP to email
 * POST /api/v1/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'Email là bắt buộc' 
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Không tìm thấy tài khoản với email này' 
      });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ 
        success: false,
        error: 'Tài khoản đã bị vô hiệu hóa' 
      });
    }
    
    // Generate OTP
    const otpCode = user.generateOTP();
    await user.save();
    
    // Send OTP email
    try {
      await sendOTPEmail(user.email, otpCode, user.name);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      return res.status(500).json({ 
        success: false,
        error: 'Không thể gửi email OTP. Vui lòng thử lại sau.' 
      });
    }
    
    res.json({
      success: true,
      message: 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
      email: user.email
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

/**
 * Verify OTP code
 * POST /api/v1/auth/verify-otp
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otpCode } = req.body;
    
    if (!email || !otpCode) {
      return res.status(400).json({ 
        success: false,
        error: 'Email và mã OTP là bắt buộc' 
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Không tìm thấy tài khoản với email này' 
      });
    }
    
    // Verify OTP
    const otpResult = user.verifyOTP(otpCode);
    if (!otpResult.isValid) {
      await user.save(); // Save the incremented attempts
      return res.status(400).json({ 
        success: false,
        error: otpResult.error 
      });
    }
    
    // OTP is valid - save the state but don't clear OTP yet (will clear on password reset)
    await user.save();
    
    res.json({
      success: true,
      message: 'Mã OTP hợp lệ. Bạn có thể đặt mật khẩu mới.',
      email: user.email
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

/**
 * Reset password with new password
 * POST /api/v1/auth/reset-password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { email, otpCode, newPassword, confirmPassword } = req.body;
    
    if (!email || !otpCode || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Email, mã OTP, mật khẩu mới và xác nhận mật khẩu là bắt buộc' 
      });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Mật khẩu mới và xác nhận mật khẩu không khớp' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'Mật khẩu mới phải có ít nhất 6 ký tự' 
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Không tìm thấy tài khoản với email này' 
      });
    }
    
    // Verify OTP one more time
    const otpResult = user.verifyOTP(otpCode);
    if (!otpResult.isValid) {
      await user.save();
      return res.status(400).json({ 
        success: false,
        error: otpResult.error 
      });
    }
    
    // Update password and clear OTP
    user.password = newPassword;
    user.clearOTP();
    await user.save();
    
    res.json({
      success: true,
      message: 'Mật khẩu đã được cập nhật thành công. Bạn có thể đăng nhập với mật khẩu mới.'
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

/**
 * Change user password when logged in
 * PUT /api/v1/auth/change-password
 */
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu là bắt buộc' 
      });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Mật khẩu mới và xác nhận mật khẩu không khớp' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'Mật khẩu mới phải có ít nhất 6 ký tự' 
      });
    }
    
    // Get user and verify current password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Không tìm thấy người dùng' 
      });
    }
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        error: 'Mật khẩu hiện tại không chính xác' 
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Mật khẩu đã được thay đổi thành công'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}; 
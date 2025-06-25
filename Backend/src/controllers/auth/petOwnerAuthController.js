const jwt = require('jsonwebtoken');
const PetOwnerUser = require('../../models/PetOwnerUser');
const Pet = require('../../models/Pet');
const { sendOTPEmail } = require('../../utils/mail');

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId, role: 'petOwner' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Helper function to validate basic pet info completion
const validateBasicPetInfo = (petData) => {
  const requiredFields = ['info.name', 'info.species', 'owner.name', 'owner.phone'];
  const missingFields = [];
  
  requiredFields.forEach(field => {
    const [obj, prop] = field.split('.');
    if (!petData[obj] || !petData[obj][prop]) {
      missingFields.push(field);
    }
  });
  
  return {
    isComplete: missingFields.length === 0,
    missingFields
  };
};

/**
 * Register new pet owner
 * POST /api/v1/pet-owner/register
 * Updated for account-first approach - petId is now optional
 */
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, petId, petData } = req.body;
    
    // Validate required fields (petId is now optional)
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ 
        error: 'Name, email, phone, and password are required' 
      });
    }
    
    // Check if user already exists
    const existingUser = await PetOwnerUser.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // If petId is provided, validate and link the pet (legacy support)
    let linkedPet = null;
    if (petId) {
      // Check if pet exists and is available for registration
      const pet = await Pet.findById(petId);
      if (!pet) {
        return res.status(404).json({ error: 'Pet profile not found' });
      }
      
      if (pet.ownerAccount) {
        return res.status(400).json({ 
          error: 'This pet profile is already registered to another user' 
        });
      }
      
      // Validate basic pet info if provided
      if (petData) {
        const validation = validateBasicPetInfo(petData);
        if (!validation.isComplete) {
          return res.status(400).json({ 
            error: 'Please complete all required pet information',
            missingFields: validation.missingFields
          });
        }
      }
    }
    
    // Create new user
    const user = await PetOwnerUser.create({
      name,
      email,
      phone,
      password,
      hasCompletedInitialSetup: !!petData,
      pets: petId ? [petId] : [] // Add pet to user's pets array if provided
    });
    
    // Link pet to user if petId was provided
    if (petId) {
      const updateData = { 
        ownerAccount: user._id,
        'linking.linkedAt': new Date(),
        'linking.linkingMethod': 'registration',
        'linking.isLinked': true,
        'setupStatus.hasOwnerAccount': true,
        'setupStatus.isFirstTime': false
      };
      
      if (petData) {
        updateData.info = petData.info;
        updateData.owner = {
          ...petData.owner,
          email: email  // Always save the user's email to the pet profile
        };
        updateData['setupStatus.basicInfoCompleted'] = true;
      }
      
      linkedPet = await Pet.findByIdAndUpdate(
        petId,
        updateData,
        { new: true, runValidators: true }
      ).populate('ownerAccount', 'name email phone');
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    const response = {
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        accountTier: user.accountTier,
        totalPetsLimit: user.totalPetsLimit
      },
      message: petId 
        ? 'Registration successful! Your pet profile is now linked to your account.'
        : 'Registration successful! You can now scan QR codes to link pet profiles to your account.'
    };
    
    // Include pet data if a pet was linked during registration
    if (linkedPet) {
      response.pet = linkedPet;
    }
    
    res.status(201).json(response);
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Login existing pet owner
 * POST /api/v1/pet-owner/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user
    const user = await PetOwnerUser.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({ 
        error: 'Account temporarily locked due to too many failed login attempts. Please try again later.' 
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await user.resetLoginAttempts();
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    // Get user's pets using the new field name
    const pets = await Pet.find({ ownerAccount: user._id }).populate('themeId');
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        accountTier: user.accountTier,
        totalPetsLimit: user.totalPetsLimit,
        hasCompletedInitialSetup: user.hasCompletedInitialSetup
      },
      pets,
      message: 'Login successful!'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Complete initial pet setup (4 basic fields)
 * POST /api/v1/pet-owner/complete-setup/:petId
 */
exports.completeInitialSetup = async (req, res) => {
  try {
    const { petId } = req.params;
    const userId = req.user.id; // from auth middleware
    const { info } = req.body; // Chỉ nhận thông tin về thú cưng, không cần thông tin chủ sở hữu
    
    // Validate required fields for pet info
    if (!info || !info.name || !info.species) {
      return res.status(400).json({ 
        error: 'Please complete all required fields',
        missingFields: [],
        required: [
          'info.name (Pet Name)',
          'info.species (Pet Species)'
        ]
      });
    }
    
    // Check if pet belongs to user
    const pet = await Pet.findOne({ _id: petId, ownerAccount: userId });
    if (!pet) {
      return res.status(404).json({ 
        error: 'Pet profile not found or you do not have permission to edit it' 
      });
    }
    
    // Get user's information
    const user = await PetOwnerUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User account not found'
      });
    }
    
    // Update pet information provided by user
    pet.info = {
      ...pet.info,
      ...info
    };
    
    // Đồng bộ thông tin chủ sở hữu từ tài khoản người dùng
    pet.owner = {
      name: user.name,
      phone: user.phone,
      email: user.email
    };
    
    // Cập nhật trạng thái thiết lập
    pet.setupStatus.basicInfoCompleted = true;
    pet.setupStatus.isFirstTime = false;
    
    // Lưu pet sau khi cập nhật
    await pet.save();
    
    // Update user's setup status
    await PetOwnerUser.findByIdAndUpdate(
      userId,
      { hasCompletedInitialSetup: true }
    );
    
    res.json({
      success: true,
      pet: pet,
      message: 'Pet profile setup completed successfully!'
    });
    
  } catch (error) {
    console.error('Setup completion error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Verify email with OTP
 * POST /api/v1/pet-owner/verify-email
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { email, otpCode } = req.body;
    
    if (!email || !otpCode) {
      return res.status(400).json({ error: 'Email and OTP code are required' });
    }
    
    // Find user by email
    const user = await PetOwnerUser.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if OTP is valid and not expired
    if (!user.otp || user.otp !== otpCode) {
      return res.status(400).json({ error: 'Invalid OTP code' });
    }
    
    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ error: 'OTP has expired' });
    }
    
    // Mark email as verified
    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    
    res.json({
      success: true,
      message: 'Email verified successfully'
    });
    
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Resend verification email
 * POST /api/v1/pet-owner/resend-verification
 */
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Find user by email
    const user = await PetOwnerUser.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    
    // Save OTP to user
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();
    
    // Send OTP email
    await sendOTPEmail(email, otp, 'email verification');
    
    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
    
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Forgot password - Send OTP to email
 * POST /api/v1/pet-owner/forgot-password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Find user by email
    const user = await PetOwnerUser.findOne({ email });
    if (!user) {
      // Don't reveal that the user doesn't exist for security reasons
      return res.json({
        success: true,
        message: 'If the email exists in our system, a password reset OTP will be sent'
      });
    }
    
    // Generate OTP
    const otp = user.generateOTP();
    await user.save();
    
    // Send OTP to email
    await sendOTPEmail(
      user.email, 
      otp, 
      `Hello ${user.name}, your password reset OTP is ${otp}. Valid for 10 minutes.`,
      'VNIPET - Password Reset OTP'
    );
    
    res.json({
      success: true,
      message: 'Password reset OTP sent to your email'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Verify OTP for password reset
 * POST /api/v1/pet-owner/verify-otp
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp: otpCode, deviceId } = req.body;
    
    if (!email || !otpCode) {
      return res.status(400).json({ error: 'Email and OTP code are required' });
    }
    
    // Find user by email
    const user = await PetOwnerUser.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if OTP is valid and not expired
    if (!user.otpCode || user.otpCode !== otpCode) {
      return res.status(400).json({ error: 'Invalid OTP code' });
    }
    
    if (user.otpExpiresAt < Date.now()) {
      return res.status(400).json({ error: 'OTP has expired' });
    }
    
    // Use the verifyOTP method from the model which handles attempts counting
    const otpResult = user.verifyOTP(otpCode);
    if (!otpResult.isValid) {
      await user.save(); // Save the incremented attempts
      return res.status(400).json({ error: otpResult.error || 'Invalid OTP code' });
    }
    
    // Clear OTP after successful verification
    user.clearOTP();
    await user.save();
    
    res.json({
      success: true,
      message: 'OTP verified successfully',
      resetToken: jwt.sign(
        { id: user._id, purpose: 'password-reset' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      )
    });
    
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Reset password with new password
 * POST /api/v1/pet-owner/reset-password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    
    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ 
        error: 'Email, reset token, and new password are required' 
      });
    }
    
    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired reset token' });
    }
    
    // Check token purpose
    if (decoded.purpose !== 'password-reset') {
      return res.status(401).json({ error: 'Invalid token purpose' });
    }
    
    // Find user by email and id from token
    const user = await PetOwnerUser.findOne({ 
      _id: decoded.id,
      email: email
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update password
    user.password = newPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get current user info
 * GET /api/v1/pet-owner/me
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware
    
    // Find user by id
    const user = await PetOwnerUser.findById(userId).select('-password -otp -otpExpires');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's pets
    const pets = await Pet.find({ ownerAccount: userId }).populate('themeId');
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        accountTier: user.accountTier,
        totalPetsLimit: user.totalPetsLimit,
        hasCompletedInitialSetup: user.hasCompletedInitialSetup,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt
      },
      pets
    });
    
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Check pet status for QR code scanning
 * GET /api/v1/pet-owner/check-pet/:petId
 */
exports.checkPetStatus = async (req, res) => {
  try {
    const { petId } = req.params;
    
    // Find pet by id
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ error: 'Pet profile not found' });
    }
    
    // Check if user is authenticated and is the pet owner
    const isOwner = req.user && pet.ownerAccount && 
      pet.ownerAccount.toString() === req.user.id.toString();
    
    // Determine pet status
    const status = {
      isLinked: !!pet.ownerAccount,
      isOwner,
      requiresRegistration: !pet.ownerAccount,
      canViewPublicly: pet.visibility && pet.visibility.isPubliclyViewable,
      setupStatus: pet.setupStatus || {
        hasOwnerAccount: !!pet.ownerAccount,
        basicInfoCompleted: false,
        isFirstTime: !pet.ownerAccount
      }
    };
    
    res.json({
      success: true,
      petId: pet._id,
      status
    });
    
  } catch (error) {
    console.error('Check pet status error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get user profile
 * GET /api/v1/account/profile
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware
    
    // Find user by id
    const user = await PetOwnerUser.findById(userId).select('-password -otp -otpExpires');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        accountTier: user.accountTier,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update user profile
 * PUT /api/v1/account/profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware
    const { name, phone } = req.body;
    
    // Validate required fields
    if (!name && !phone) {
      return res.status(400).json({ 
        error: 'At least one field (name or phone) is required to update' 
      });
    }
    
    // Update user
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    
    const user = await PetOwnerUser.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpires');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        accountTier: user.accountTier,
        isEmailVerified: user.isEmailVerified,
        updatedAt: user.updatedAt
      },
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Change password
 * PUT /api/v1/account/password
 */
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Current password and new password are required' 
      });
    }
    
    // Find user
    const user = await PetOwnerUser.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: error.message });
  }
}; 
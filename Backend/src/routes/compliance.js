const express = require('express');
const router = express.Router();
const authPetOwner = require('../middleware/authPetOwner');
const authAdmin = require('../middleware/authAdmin');
const complianceController = require('../controllers/admin/complianceController');

// =====================
// PUBLIC COMPLIANCE ENDPOINTS
// =====================

/**
 * @route GET /api/v1/compliance/privacy-policy
 * @desc Get privacy policy (supports JSON/HTML)
 * @access Public
 * @query lang - Language (vi/en), format - Format (json/html)
 */
router.get('/privacy-policy', complianceController.getPrivacyPolicy);

/**
 * @route GET /api/v1/compliance/terms-of-service
 * @desc Get terms of service (supports JSON/HTML)
 * @access Public
 * @query lang - Language (vi/en), format - Format (json/html)
 */
router.get('/terms-of-service', complianceController.getTermsOfService);

/**
 * @route GET /api/v1/compliance/app-review
 * @desc App Store review mode detection
 * @access Public
 */
router.get('/app-review', complianceController.getAppReviewMode);

/**
 * @route GET /api/v1/compliance/app-metadata
 * @desc App Store metadata information
 * @access Public
 */
router.get('/app-metadata', complianceController.getAppStoreMetadata);

// =====================
// USER DATA RIGHTS (GDPR)
// =====================

/**
 * @route GET /api/v1/compliance/export-data
 * @desc Export all user data (GDPR compliance)
 * @access Private (Pet Owner)
 */
router.get('/export-data', authPetOwner, complianceController.exportUserData);

/**
 * @route POST /api/v1/compliance/delete-account
 * @desc Permanently delete user account and all data
 * @access Private (Pet Owner)
 * @body confirmEmail - Email confirmation
 * @body confirmPassword - Password confirmation
 */
router.post('/delete-account', authPetOwner, complianceController.deleteUserAccount);

// =====================
// ADMIN COMPLIANCE TOOLS
// =====================

/**
 * @route GET /api/v1/compliance/admin/users-export
 * @desc Export all users data for compliance reporting
 * @access Private (Admin)
 */
router.get('/admin/users-export', authAdmin, (req, res) => {
    // Admin-only full data export for compliance reporting
    res.json({
        success: true,
        message: 'Admin export functionality - implement as needed',
        note: 'This would export anonymized user statistics for compliance reporting'
    });
});

/**
 * @route POST /api/v1/compliance/admin/gdpr-request
 * @desc Handle GDPR requests from authorities
 * @access Private (Admin)
 */
router.post('/admin/gdpr-request', authAdmin, (req, res) => {
    // Handle official GDPR requests
    res.json({
        success: true,
        message: 'GDPR request received',
        note: 'This would handle official data requests from privacy authorities'
    });
});

module.exports = router; 
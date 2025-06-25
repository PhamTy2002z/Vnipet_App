const express = require('express');
const router = express.Router();
const authPetOwner = require('../middleware/authPetOwner');
const authAdmin = require('../middleware/authAdmin');
const deepLinkController = require('../controllers/admin/deepLinkController');

// =====================
// UNIVERSAL LINKS CONFIGURATION
// =====================

/**
 * @route GET /.well-known/apple-app-site-association
 * @desc Apple App Site Association for Universal Links
 * @access Public
 */
router.get('/.well-known/apple-app-site-association', deepLinkController.getAppleAppSiteAssociation);

/**
 * @route GET /apple-app-site-association
 * @desc Alternative path for Apple App Site Association
 * @access Public
 */
router.get('/apple-app-site-association', deepLinkController.getAppleAppSiteAssociation);

// =====================
// PET PROFILE DEEP LINKS
// =====================

/**
 * @route GET /pet/:petId
 * @desc Handle pet profile deep link access
 * @access Public (respects pet privacy settings)
 * @param petId - Pet ID
 * @query type - Link type (profile/share/etc)
 * @query source - Source of the link (qr/social/etc)
 */
router.get('/pet/:petId', deepLinkController.handlePetDeepLink);

/**
 * @route POST /api/v1/deeplinks/pet/:petId/generate
 * @desc Generate shareable deep link for pet
 * @access Private (Pet Owner)
 * @param petId - Pet ID
 * @query shareType - Type of share (profile/emergency/etc)
 * @query includeBranding - Include VNIPET branding
 */
router.post('/api/v1/deeplinks/pet/:petId/generate', authPetOwner, deepLinkController.generatePetDeepLink);

// =====================
// QR CODE DEEP LINKS
// =====================

/**
 * @route GET /api/v1/deeplinks/pet/:petId/qr
 * @desc Generate QR code with deep link
 * @access Private (Pet Owner) or Public (if pet is public)
 * @param petId - Pet ID
 * @query size - QR code size (default 256)
 * @query format - Format (png/svg)
 * @query errorLevel - Error correction level (L/M/Q/H)
 */
router.get('/api/v1/deeplinks/pet/:petId/qr', deepLinkController.generateQRDeepLink);

// =====================
// SHARE EXTENSION SUPPORT
// =====================

/**
 * @route POST /api/v1/deeplinks/share
 * @desc Handle iOS share extension requests
 * @access Private (Pet Owner)
 * @body type - Share type (photo/text/url)
 * @body content - Shared content
 * @body petId - Optional pet ID
 */
router.post('/api/v1/deeplinks/share', authPetOwner, deepLinkController.handleShareExtension);

// =====================
// THEME STORE DEEP LINKS
// =====================

/**
 * @route GET /theme/:themeId
 * @desc Handle theme store deep link
 * @access Public
 * @param themeId - Theme ID
 */
router.get('/theme/:themeId', (req, res) => {
    const { themeId } = req.params;
    const { source = 'unknown' } = req.query;
    
    // Check user agent to determine redirect target
    const userAgent = req.get('User-Agent') || '';
    const isIOSApp = userAgent.includes('VNIPET') || userAgent.includes('com.vnipet.app');
    
    if (isIOSApp) {
        // Redirect to app theme store
        return res.redirect(`vnipet://theme/${themeId}?source=${source}`);
    }
    
    // Web fallback - redirect to app download
    const html = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>VNIPET Theme Store</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px 20px; }
                .container { max-width: 400px; margin: 0 auto; }
                .logo { font-size: 48px; margin-bottom: 20px; }
                h1 { color: #FF6B35; margin-bottom: 15px; }
                p { color: #666; margin-bottom: 30px; line-height: 1.6; }
                .download-btn { background: #FF6B35; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; display: inline-block; margin: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">🐾</div>
                <h1>VNIPET Theme Store</h1>
                <p>Tải ứng dụng VNIPET để khám phá các theme độc đáo cho thú cưng của bạn!</p>
                <a href="https://apps.apple.com/app/vnipet" class="download-btn">Tải cho iOS</a>
                <a href="https://play.google.com/store/apps/details?id=com.vnipet.app" class="download-btn">Tải cho Android</a>
            </div>
            
            <script>
                // Try to open in app
                setTimeout(() => {
                    window.location.href = 'vnipet://theme/${themeId}?source=web';
                }, 100);
            </script>
        </body>
        </html>
    `;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
});

// =====================
// QR SCANNER DEEP LINKS
// =====================

/**
 * @route GET /qr/scan
 * @desc Handle QR scanner deep link
 * @access Public
 * @query data - Optional pre-filled QR data
 */
router.get('/qr/scan', (req, res) => {
    const { data } = req.query;
    
    const userAgent = req.get('User-Agent') || '';
    const isIOSApp = userAgent.includes('VNIPET') || userAgent.includes('com.vnipet.app');
    
    if (isIOSApp) {
        const scanUrl = data ? `vnipet://qr/scan?data=${encodeURIComponent(data)}` : 'vnipet://qr/scan';
        return res.redirect(scanUrl);
    }
    
    // Web QR scanner fallback
    const html = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>VNIPET QR Scanner</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px 20px; background: #f5f5f5; }
                .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                .icon { font-size: 64px; margin-bottom: 20px; }
                h1 { color: #FF6B35; margin-bottom: 15px; }
                p { color: #666; margin-bottom: 30px; line-height: 1.6; }
                .download-btn { background: #FF6B35; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; display: inline-block; margin: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">📱</div>
                <h1>VNIPET QR Scanner</h1>
                <p>Sử dụng ứng dụng VNIPET để quét mã QR và truy cập thông tin thú cưng!</p>
                <a href="https://apps.apple.com/app/vnipet" class="download-btn">Tải cho iOS</a>
                <a href="https://play.google.com/store/apps/details?id=com.vnipet.app" class="download-btn">Tải cho Android</a>
            </div>
            
            <script>
                setTimeout(() => {
                    window.location.href = 'vnipet://qr/scan${data ? '?data=' + encodeURIComponent(data) : ''}';
                }, 100);
            </script>
        </body>
        </html>
    `;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
});

// =====================
// ANALYTICS & ADMIN
// =====================

/**
 * @route GET /api/v1/deeplinks/analytics
 * @desc Get deep link analytics
 * @access Private (Admin)
 */
router.get('/api/v1/deeplinks/analytics', authAdmin, deepLinkController.getDeepLinkAnalytics);

/**
 * @route GET /api/v1/deeplinks/test
 * @desc Test deep link functionality
 * @access Public
 */
router.get('/api/v1/deeplinks/test', (req, res) => {
    const { type = 'app' } = req.query;
    
    const testLinks = {
        universal: `${req.protocol}://${req.get('host')}/pet/test123`,
        scheme: 'vnipet://pet/test123',
        qr: `${req.protocol}://${req.get('host')}/api/v1/deeplinks/pet/test123/qr`,
        theme: `${req.protocol}://${req.get('host')}/theme/test456`,
        scanner: `${req.protocol}://${req.get('host')}/qr/scan`
    };
    
    res.json({
        success: true,
        message: 'Deep link test endpoints',
        data: {
            testLinks,
            userAgent: req.get('User-Agent'),
            instructions: {
                universal: 'Copy this link and open in Safari on iOS device with VNIPET app installed',
                scheme: 'This will only work from within iOS apps or web pages',
                qr: 'This generates a QR code that opens the pet profile when scanned',
                testing: 'Use these links to test deep linking functionality'
            }
        }
    });
});

module.exports = router; 
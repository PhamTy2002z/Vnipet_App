const express = require('express');
const router = express.Router();

// Simple test route
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Compliance routes working'
    });
});

// Privacy Policy (simple version)
router.get('/privacy-policy', (req, res) => {
    const { lang = 'vi', format = 'json' } = req.query;
    
    const privacyContent = {
        vi: {
            title: "Chính Sách Bảo Mật VNIPET",
            lastUpdated: "2024-06-19",
            content: "VNIPET cam kết bảo vệ thông tin cá nhân của người dùng..."
        },
        en: {
            title: "VNIPET Privacy Policy", 
            lastUpdated: "2024-06-19",
            content: "VNIPET is committed to protecting user personal information..."
        }
    };
    
    const content = privacyContent[lang] || privacyContent.vi;
    
    if (format === 'html') {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${content.title}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #FF6B35; }
                </style>
            </head>
            <body>
                <h1>${content.title}</h1>
                <p><em>Cập nhật: ${content.lastUpdated}</em></p>
                <p>${content.content}</p>
            </body>
            </html>
        `;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
    }
    
    res.json({
        success: true,
        data: content
    });
});

// Terms of Service (simple version)
router.get('/terms-of-service', (req, res) => {
    const { lang = 'vi', format = 'json' } = req.query;
    
    const termsContent = {
        vi: {
            title: "Điều Khoản Dịch Vụ VNIPET",
            lastUpdated: "2024-06-19", 
            content: "Bằng việc sử dụng VNIPET, bạn đồng ý với các điều khoản..."
        },
        en: {
            title: "VNIPET Terms of Service",
            lastUpdated: "2024-06-19",
            content: "By using VNIPET, you agree to these terms and conditions..."
        }
    };
    
    const content = termsContent[lang] || termsContent.vi;
    
    if (format === 'html') {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${content.title}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #FF6B35; }
                </style>
            </head>
            <body>
                <h1>${content.title}</h1>
                <p><em>Last Updated: ${content.lastUpdated}</em></p>
                <p>${content.content}</p>
            </body>
            </html>
        `;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
    }
    
    res.json({
        success: true,
        data: content
    });
});

// App Store metadata
router.get('/app-metadata', (req, res) => {
    const metadata = {
        app: {
            name: "VNIPET",
            version: "1.0.0",
            category: "Lifestyle",
            description: "Complete pet management solution with QR code tracking"
        },
        privacy: {
            dataTypes: ["Contact Info", "User Content", "Identifiers"],
            dataUsage: "To provide pet management services"
        },
        support: {
            website: "https://vnipet.com",
            email: "support@vnipet.com",
            privacyPolicy: `${req.protocol}://${req.get('host')}/api/v1/compliance/privacy-policy?format=html`,
            termsOfService: `${req.protocol}://${req.get('host')}/api/v1/compliance/terms-of-service?format=html`
        }
    };
    
    res.json({
        success: true,
        data: metadata
    });
});

// App review mode
router.get('/app-review', (req, res) => {
    const userAgent = req.get('User-Agent') || '';
    const isAppStoreReview = userAgent.includes('App Store') || 
                            userAgent.includes('Apple') ||
                            req.query.review === 'appstore';
    
    if (isAppStoreReview) {
        res.json({
            success: true,
            reviewMode: true,
            demoData: {
                pets: [
                    { name: "Buddy", species: "Dog", breed: "Golden Retriever" },
                    { name: "Whiskers", species: "Cat", breed: "Persian" }
                ]
            }
        });
    } else {
        res.json({
            success: true,
            reviewMode: false,
            message: 'Normal app mode'
        });
    }
});

module.exports = router; 
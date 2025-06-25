const PetOwnerUser = require('../../models/PetOwnerUser');
const Pet = require('../../models/Pet');
const UserTheme = require('../../models/UserTheme');
const asyncWrap = require('../../utils/asyncWrap');
const path = require('path');
const fs = require('fs').promises;

/**
 * Get Privacy Policy
 * Serves dynamic privacy policy for iOS App Store compliance
 */
const getPrivacyPolicy = asyncWrap(async (req, res) => {
    try {
        const { lang = 'vi', format = 'json' } = req.query;
        
        // Privacy policy content (Vietnamese & English)
        const privacyContent = {
            vi: {
                title: "Chính Sách Bảo Mật VNIPET",
                lastUpdated: "2024-06-19",
                sections: [
                    {
                        title: "1. Thu Thập Thông Tin",
                        content: "VNIPET thu thập thông tin cần thiết để cung cấp dịch vụ quản lý thú cưng, bao gồm: thông tin cá nhân của chủ nuôi, thông tin thú cưng (tên, giống, tuổi, ảnh), dữ liệu sức khỏe và chăm sóc."
                    },
                    {
                        title: "2. Sử Dụng Thông Tin",
                        content: "Thông tin được sử dụng để: tạo hồ sơ thú cưng, cung cấp dịch vụ QR code, gửi nhắc nhở chăm sóc, hỗ trợ khách hàng, cải thiện dịch vụ."
                    },
                    {
                        title: "3. Bảo Mật Dữ Liệu",
                        content: "VNIPET cam kết bảo vệ dữ liệu người dùng bằng mã hóa SSL/TLS, xác thực JWT, lưu trữ an toàn trên MongoDB Atlas, sao lưu định kỳ."
                    },
                    {
                        title: "4. Chia Sẻ Thông Tin",
                        content: "VNIPET không bán, cho thuê hoặc chia sẻ thông tin cá nhân với bên thứ ba, trừ khi có yêu cầu pháp lý hoặc để cung cấp dịch vụ (với sự đồng ý)."
                    },
                    {
                        title: "5. Quyền Người Dùng",
                        content: "Người dùng có quyền: truy cập dữ liệu cá nhân, chỉnh sửa thông tin, xóa tài khoản, xuất dữ liệu (GDPR compliance), rút lại sự đồng ý."
                    },
                    {
                        title: "6. Liên Hệ",
                        content: "Mọi thắc mắc về chính sách bảo mật, vui lòng liên hệ: privacy@vnipet.com hoặc qua ứng dụng VNIPET."
                    }
                ]
            },
            en: {
                title: "VNIPET Privacy Policy",
                lastUpdated: "2024-06-19",
                sections: [
                    {
                        title: "1. Information Collection",
                        content: "VNIPET collects necessary information to provide pet management services, including: owner personal information, pet information (name, breed, age, photos), health and care data."
                    },
                    {
                        title: "2. Information Usage",
                        content: "Information is used to: create pet profiles, provide QR code services, send care reminders, customer support, service improvement."
                    },
                    {
                        title: "3. Data Security",
                        content: "VNIPET is committed to protecting user data with SSL/TLS encryption, JWT authentication, secure MongoDB Atlas storage, regular backups."
                    },
                    {
                        title: "4. Information Sharing",
                        content: "VNIPET does not sell, rent, or share personal information with third parties, except when legally required or to provide services (with consent)."
                    },
                    {
                        title: "5. User Rights",
                        content: "Users have the right to: access personal data, edit information, delete account, export data (GDPR compliance), withdraw consent."
                    },
                    {
                        title: "6. Contact",
                        content: "For privacy policy inquiries, please contact: privacy@vnipet.com or through the VNIPET app."
                    }
                ]
            }
        };

        const content = privacyContent[lang] || privacyContent.vi;

        if (format === 'html') {
            // Return HTML format for web view
            const html = `
                <!DOCTYPE html>
                <html lang="${lang}">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${content.title}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; line-height: 1.6; }
                        h1 { color: #FF6B35; border-bottom: 2px solid #FF6B35; padding-bottom: 10px; }
                        h2 { color: #333; margin-top: 30px; }
                        .updated { color: #666; font-style: italic; margin-bottom: 30px; }
                        .section { margin-bottom: 25px; }
                        .content { background: #f8f9fa; padding: 15px; border-radius: 8px; }
                    </style>
                </head>
                <body>
                    <h1>${content.title}</h1>
                    <p class="updated">Cập nhật lần cuối: ${content.lastUpdated}</p>
                    ${content.sections.map(section => `
                        <div class="section">
                            <h2>${section.title}</h2>
                            <div class="content">${section.content}</div>
                        </div>
                    `).join('')}
                </body>
                </html>
            `;
            
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);
        }

        // JSON format (default)
        res.json({
            success: true,
            data: content
        });

    } catch (error) {
        console.error('Privacy policy error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading privacy policy'
        });
    }
});

/**
 * Get Terms of Service
 * Dynamic terms loading for iOS App Store compliance
 */
const getTermsOfService = asyncWrap(async (req, res) => {
    try {
        const { lang = 'vi', format = 'json' } = req.query;
        
        const termsContent = {
            vi: {
                title: "Điều Khoản Dịch Vụ VNIPET",
                lastUpdated: "2024-06-19",
                sections: [
                    {
                        title: "1. Chấp Nhận Điều Khoản",
                        content: "Bằng việc sử dụng ứng dụng VNIPET, bạn đồng ý tuân thủ các điều khoản và điều kiện được nêu trong tài liệu này."
                    },
                    {
                        title: "2. Mô Tả Dịch Vụ",
                        content: "VNIPET cung cấp nền tảng quản lý thú cưng với các tính năng: tạo hồ sơ thú cưng, QR code tracking, nhắc nhở chăm sóc, cửa hàng theme, quản lý lịch tiêm."
                    },
                    {
                        title: "3. Tài Khoản Người Dùng",
                        content: "Người dùng chịu trách nhiệm: cung cấp thông tin chính xác, bảo mật thông tin đăng nhập, thông báo ngay khi phát hiện truy cập trái phép."
                    },
                    {
                        title: "4. Sử Dụng Hợp Lý",
                        content: "Người dùng không được: sử dụng dịch vụ cho mục đích bất hợp pháp, can thiệp vào hoạt động của hệ thống, upload nội dung có hại."
                    },
                    {
                        title: "5. Quyền Sở Hữu Trí Tuệ",
                        content: "VNIPET sở hữu các quyền đối với: thiết kế ứng dụng, logo, theme, tính năng. Người dùng giữ quyền đối với dữ liệu thú cưng của mình."
                    },
                    {
                        title: "6. Chấm Dứt Dịch Vụ",
                        content: "VNIPET có quyền chấm dứt tài khoản khi vi phạm điều khoản. Người dùng có thể xóa tài khoản bất kỳ lúc nào."
                    }
                ]
            },
            en: {
                title: "VNIPET Terms of Service",
                lastUpdated: "2024-06-19",
                sections: [
                    {
                        title: "1. Acceptance of Terms",
                        content: "By using the VNIPET application, you agree to comply with the terms and conditions outlined in this document."
                    },
                    {
                        title: "2. Service Description",
                        content: "VNIPET provides a pet management platform with features: pet profile creation, QR code tracking, care reminders, theme store, vaccination scheduling."
                    },
                    {
                        title: "3. User Accounts",
                        content: "Users are responsible for: providing accurate information, securing login credentials, reporting unauthorized access immediately."
                    },
                    {
                        title: "4. Acceptable Use",
                        content: "Users must not: use the service for illegal purposes, interfere with system operations, upload harmful content."
                    },
                    {
                        title: "5. Intellectual Property",
                        content: "VNIPET owns rights to: app design, logos, themes, features. Users retain rights to their pet data."
                    },
                    {
                        title: "6. Service Termination",
                        content: "VNIPET may terminate accounts for terms violations. Users can delete accounts at any time."
                    }
                ]
            }
        };

        const content = termsContent[lang] || termsContent.vi;

        if (format === 'html') {
            // Return HTML format for web view
            const html = `
                <!DOCTYPE html>
                <html lang="${lang}">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${content.title}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; line-height: 1.6; }
                        h1 { color: #FF6B35; border-bottom: 2px solid #FF6B35; padding-bottom: 10px; }
                        h2 { color: #333; margin-top: 30px; }
                        .updated { color: #666; font-style: italic; margin-bottom: 30px; }
                        .section { margin-bottom: 25px; }
                        .content { background: #f8f9fa; padding: 15px; border-radius: 8px; }
                    </style>
                </head>
                <body>
                    <h1>${content.title}</h1>
                    <p class="updated">Cập nhật lần cuối: ${content.lastUpdated}</p>
                    ${content.sections.map(section => `
                        <div class="section">
                            <h2>${section.title}</h2>
                            <div class="content">${section.content}</div>
                        </div>
                    `).join('')}
                </body>
                </html>
            `;
            
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);
        }

        // JSON format (default)
        res.json({
            success: true,
            data: content
        });

    } catch (error) {
        console.error('Terms of service error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading terms of service'
        });
    }
});

/**
 * Get App Store Review Information
 * For App Store review process
 */
const getAppStoreInfo = asyncWrap(async (req, res) => {
    try {
        const { lang = 'en', format = 'json' } = req.query;
        
        const appStoreInfo = {
            en: {
                title: "VNIPET App Store Review Information",
                lastUpdated: "2024-06-19",
                app: {
                    name: "VNIPET - Pet Management",
                    version: "1.0.0",
                    description: "VNIPET is a comprehensive pet management application that helps pet owners manage their pets' information, health records, and more."
                },
                testAccount: {
                    email: "appstore.review@vnipet.com",
                    password: "Review2024!"
                },
                features: [
                    "Pet profile management",
                    "QR code generation and scanning",
                    "Health record tracking",
                    "Vaccination reminders",
                    "Theme customization",
                    "Offline data access"
                ],
                notes: "This app uses camera for QR code scanning and photo uploads. Location access is optional for finding nearby veterinary services."
            },
            vi: {
                title: "Thông Tin Xét Duyệt App Store VNIPET",
                lastUpdated: "2024-06-19",
                app: {
                    name: "VNIPET - Quản Lý Thú Cưng",
                    version: "1.0.0",
                    description: "VNIPET là ứng dụng quản lý thú cưng toàn diện giúp chủ nuôi quản lý thông tin, hồ sơ sức khỏe và nhiều hơn nữa."
                },
                testAccount: {
                    email: "appstore.review@vnipet.com",
                    password: "Review2024!"
                },
                features: [
                    "Quản lý hồ sơ thú cưng",
                    "Tạo và quét mã QR",
                    "Theo dõi hồ sơ sức khỏe",
                    "Nhắc nhở tiêm chủng",
                    "Tùy chỉnh giao diện",
                    "Truy cập dữ liệu ngoại tuyến"
                ],
                notes: "Ứng dụng này sử dụng camera để quét mã QR và tải lên hình ảnh. Quyền truy cập vị trí là tùy chọn để tìm dịch vụ thú y gần đó."
            }
        };

        const content = appStoreInfo[lang] || appStoreInfo.en;

        if (format === 'html') {
            // Return HTML format for web view
            const html = `
                <!DOCTYPE html>
                <html lang="${lang}">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${content.title}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; line-height: 1.6; }
                        h1 { color: #FF6B35; border-bottom: 2px solid #FF6B35; padding-bottom: 10px; }
                        h2 { color: #333; margin-top: 30px; }
                        .updated { color: #666; font-style: italic; margin-bottom: 30px; }
                        .section { margin-bottom: 25px; }
                        .content { background: #f8f9fa; padding: 15px; border-radius: 8px; }
                        .features { list-style-type: disc; padding-left: 20px; }
                        .test-account { background: #e9f7fe; padding: 15px; border-radius: 8px; border-left: 4px solid #4dabf7; }
                    </style>
                </head>
                <body>
                    <h1>${content.title}</h1>
                    <p class="updated">Last Updated: ${content.lastUpdated}</p>
                    
                    <div class="section">
                        <h2>App Information</h2>
                        <div class="content">
                            <p><strong>Name:</strong> ${content.app.name}</p>
                            <p><strong>Version:</strong> ${content.app.version}</p>
                            <p><strong>Description:</strong> ${content.app.description}</p>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2>Test Account</h2>
                        <div class="test-account">
                            <p><strong>Email:</strong> ${content.testAccount.email}</p>
                            <p><strong>Password:</strong> ${content.testAccount.password}</p>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2>Features</h2>
                        <div class="content">
                            <ul class="features">
                                ${content.features.map(feature => `<li>${feature}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2>Review Notes</h2>
                        <div class="content">
                            <p>${content.notes}</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
            
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);
        }

        // JSON format (default)
        res.json({
            success: true,
            data: content
        });

    } catch (error) {
        console.error('App Store info error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading App Store information'
        });
    }
});

/**
 * Get user data deletion instructions
 * Required for App Store compliance
 */
const getDataDeletionInfo = asyncWrap(async (req, res) => {
    try {
        const { lang = 'en', format = 'json' } = req.query;
        
        const deletionInfo = {
            en: {
                title: "VNIPET Data Deletion Instructions",
                lastUpdated: "2024-06-19",
                sections: [
                    {
                        title: "In-App Deletion",
                        content: "You can delete your account and all associated data directly within the VNIPET app by following these steps:\n1. Open the VNIPET app and log in\n2. Go to Profile > Settings > Account\n3. Scroll down and tap 'Delete Account'\n4. Confirm your decision by entering your password\n5. Your account and all associated data will be permanently deleted"
                    },
                    {
                        title: "Email Request",
                        content: "Alternatively, you can request account deletion by sending an email to privacy@vnipet.com with the subject 'Account Deletion Request'. Please include your registered email address in the body of the email. We will process your request within 7 business days."
                    },
                    {
                        title: "Data Retention",
                        content: "After deletion, your personal data will be permanently removed from our active systems. Some information may be retained in our backup systems for up to 30 days before being permanently deleted."
                    }
                ]
            },
            vi: {
                title: "Hướng Dẫn Xóa Dữ Liệu VNIPET",
                lastUpdated: "2024-06-19",
                sections: [
                    {
                        title: "Xóa Trong Ứng Dụng",
                        content: "Bạn có thể xóa tài khoản và tất cả dữ liệu liên quan trực tiếp trong ứng dụng VNIPET bằng cách:\n1. Mở ứng dụng VNIPET và đăng nhập\n2. Đi đến Hồ sơ > Cài đặt > Tài khoản\n3. Cuộn xuống và nhấn 'Xóa tài khoản'\n4. Xác nhận quyết định bằng cách nhập mật khẩu\n5. Tài khoản và tất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn"
                    },
                    {
                        title: "Yêu Cầu Qua Email",
                        content: "Ngoài ra, bạn có thể yêu cầu xóa tài khoản bằng cách gửi email đến privacy@vnipet.com với tiêu đề 'Yêu cầu xóa tài khoản'. Vui lòng cung cấp địa chỉ email đã đăng ký trong nội dung email. Chúng tôi sẽ xử lý yêu cầu của bạn trong vòng 7 ngày làm việc."
                    },
                    {
                        title: "Lưu Trữ Dữ Liệu",
                        content: "Sau khi xóa, dữ liệu cá nhân của bạn sẽ bị xóa vĩnh viễn khỏi hệ thống hoạt động của chúng tôi. Một số thông tin có thể được lưu giữ trong hệ thống sao lưu của chúng tôi trong tối đa 30 ngày trước khi bị xóa vĩnh viễn."
                    }
                ]
            }
        };

        const content = deletionInfo[lang] || deletionInfo.en;

        if (format === 'html') {
            // Return HTML format for web view
            const html = `
                <!DOCTYPE html>
                <html lang="${lang}">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${content.title}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; line-height: 1.6; }
                        h1 { color: #FF6B35; border-bottom: 2px solid #FF6B35; padding-bottom: 10px; }
                        h2 { color: #333; margin-top: 30px; }
                        .updated { color: #666; font-style: italic; margin-bottom: 30px; }
                        .section { margin-bottom: 25px; }
                        .content { background: #f8f9fa; padding: 15px; border-radius: 8px; white-space: pre-line; }
                    </style>
                </head>
                <body>
                    <h1>${content.title}</h1>
                    <p class="updated">Last Updated: ${content.lastUpdated}</p>
                    ${content.sections.map(section => `
                        <div class="section">
                            <h2>${section.title}</h2>
                            <div class="content">${section.content}</div>
                        </div>
                    `).join('')}
                </body>
                </html>
            `;
            
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);
        }

        // JSON format (default)
        res.json({
            success: true,
            data: content
        });

    } catch (error) {
        console.error('Data deletion info error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading data deletion information'
        });
    }
});

/**
 * Get app statistics
 * For App Store review and compliance
 */
const getAppStatistics = asyncWrap(async (req, res) => {
    try {
        // Get real statistics from database
        const [userCount, petCount, themeCount] = await Promise.all([
            PetOwnerUser.countDocuments(),
            Pet.countDocuments(),
            UserTheme.countDocuments()
        ]);
        
        res.json({
            success: true,
            data: {
                users: userCount,
                pets: petCount,
                themes: themeCount,
                serverVersion: process.env.npm_package_version || '1.0.0',
                apiVersion: 'v1',
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('App statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading app statistics'
        });
    }
});

module.exports = {
    getPrivacyPolicy,
    getTermsOfService,
    getAppStoreInfo,
    getDataDeletionInfo,
    getAppStatistics
}; 
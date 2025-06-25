const Pet = require('../../models/Pet');
const PetOwnerUser = require('../../models/PetOwnerUser');
const asyncWrap = require('../../utils/asyncWrap');
const QRCode = require('qrcode');

/**
 * Universal Links Configuration
 * Apple App Site Association for deep linking
 */
const getAppleAppSiteAssociation = asyncWrap(async (req, res) => {
    try {
        const association = {
            applinks: {
                details: [
                    {
                        appIDs: ["TEAM_ID.com.vnipet.app"],
                        components: [
                            {
                                "/": "/pet/*",
                                comment: "Pet profile deep links"
                            },
                            {
                                "/": "/share/*",
                                comment: "Share functionality deep links"
                            },
                            {
                                "/": "/theme/*",
                                comment: "Theme store deep links"
                            },
                            {
                                "/": "/qr/*",
                                comment: "QR code scanner deep links"
                            }
                        ]
                    }
                ]
            },
            webcredentials: {
                apps: ["TEAM_ID.com.vnipet.app"]
            }
        };

        res.setHeader('Content-Type', 'application/json');
        res.json(association);

    } catch (error) {
        console.error('Apple App Site Association error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading app site association'
        });
    }
});

/**
 * Generate Pet Deep Link
 * Creates shareable deep links for pet profiles
 */
const generatePetDeepLink = asyncWrap(async (req, res) => {
    try {
        const { petId } = req.params;
        const { shareType = 'profile', includeBranding = true } = req.query;
        
        // Verify pet exists and user has permission
        const pet = await Pet.findById(petId);
        if (!pet) {
            return res.status(404).json({
                success: false,
                message: 'Pet not found'
            });
        }

        // Check if user owns the pet or pet is public
        if (pet.ownerId.toString() !== req.user?.id && !pet.isPublic) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        // Generate different link types
        const links = {
            // Universal link (iOS deep link)
            universal: `${baseUrl}/pet/${petId}?type=${shareType}`,
            
            // Custom URL scheme for iOS
            scheme: `vnipet://pet/${petId}?type=${shareType}`,
            
            // Web fallback
            web: `${baseUrl}/pet/${petId}`,
            
            // QR code data URL
            qrCode: await QRCode.toDataURL(`${baseUrl}/pet/${petId}`, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            })
        };

        // Generate shareable content
        const shareContent = {
            title: `Meet ${pet.name}!`,
            description: pet.description || `${pet.name} is a ${pet.age} year old ${pet.breed}`,
            imageUrl: pet.avatar ? `${baseUrl}${pet.avatar}` : null,
            links: links
        };

        // Add branding if requested
        if (includeBranding) {
            shareContent.branding = {
                appName: "VNIPET",
                logo: `${baseUrl}/assets/logo.png`,
                tagline: "Smart Pet Management"
            };
        }

        res.json({
            success: true,
            data: shareContent
        });

    } catch (error) {
        console.error('Generate pet deep link error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating deep link'
        });
    }
});

/**
 * Handle Pet Deep Link Access
 * Processes incoming deep link requests
 */
const handlePetDeepLink = asyncWrap(async (req, res) => {
    try {
        const { petId } = req.params;
        const { type = 'profile', source = 'unknown' } = req.query;
        
        // Get pet information
        const pet = await Pet.findById(petId).populate('ownerId', 'name email phone');
        
        if (!pet) {
            // Redirect to app with error state
            return res.redirect(`vnipet://error?code=pet_not_found&petId=${petId}`);
        }

        // Check accessibility
        const isPublicAccess = !req.user;
        const isOwnerAccess = req.user && pet.ownerId._id.toString() === req.user.id;
        
        if (!pet.isPublic && !isOwnerAccess) {
            return res.redirect(`vnipet://error?code=access_denied&petId=${petId}`);
        }

        // Log deep link access for analytics
        console.log(`Deep link access: petId=${petId}, type=${type}, source=${source}, user=${req.user?.id || 'anonymous'}`);

        // Return pet data for web view or redirect to app
        const userAgent = req.get('User-Agent') || '';
        const isIOSApp = userAgent.includes('VNIPET') || userAgent.includes('com.vnipet.app');
        
        if (isIOSApp) {
            // Redirect to app with pet data
            const deepLinkUrl = `vnipet://pet/${petId}?type=${type}&loaded=true`;
            return res.redirect(deepLinkUrl);
        }

        // Web view fallback
        const webData = {
            pet: {
                id: pet._id,
                name: pet.name,
                species: pet.species,
                breed: pet.breed,
                age: pet.age,
                avatar: pet.avatar,
                description: pet.description,
                isPublic: pet.isPublic
            },
            owner: isPublicAccess ? {
                name: pet.ownerId.name,
                contact: pet.emergencyContact
            } : pet.ownerId,
            shareInfo: {
                title: `${pet.name} - VNIPET`,
                description: `Thông tin chi tiết về ${pet.name}`,
                image: pet.avatar,
                url: `${req.protocol}://${req.get('host')}/pet/${petId}`
            },
            appDownload: {
                ios: "https://apps.apple.com/app/vnipet",
                android: "https://play.google.com/store/apps/details?id=com.vnipet.app"
            }
        };

        // Return HTML page for web browsers
        const html = `
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${webData.shareInfo.title}</title>
                
                <!-- Open Graph Meta Tags -->
                <meta property="og:title" content="${webData.shareInfo.title}">
                <meta property="og:description" content="${webData.shareInfo.description}">
                <meta property="og:image" content="${webData.shareInfo.image || ''}">
                <meta property="og:url" content="${webData.shareInfo.url}">
                <meta property="og:type" content="website">
                
                <!-- Twitter Meta Tags -->
                <meta name="twitter:card" content="summary_large_image">
                <meta name="twitter:title" content="${webData.shareInfo.title}">
                <meta name="twitter:description" content="${webData.shareInfo.description}">
                <meta name="twitter:image" content="${webData.shareInfo.image || ''}">
                
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                    .container { max-width: 400px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #FF6B35, #F7931E); color: white; padding: 20px; text-align: center; }
                    .avatar { width: 80px; height: 80px; border-radius: 50%; border: 3px solid white; margin: 0 auto 15px; background: #ddd; }
                    .pet-info { padding: 20px; }
                    .pet-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                    .pet-details { color: #666; margin-bottom: 15px; }
                    .description { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                    .download-section { text-align: center; padding: 20px; background: #f8f9fa; }
                    .download-btn { display: inline-block; background: #FF6B35; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 5px; }
                    .powered-by { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        ${webData.pet.avatar ? `<img src="${webData.pet.avatar}" alt="${webData.pet.name}" class="avatar">` : '<div class="avatar"></div>'}
                        <h1>${webData.pet.name}</h1>
                        <p>${webData.pet.species} • ${webData.pet.breed}</p>
                    </div>
                    
                    <div class="pet-info">
                        <div class="pet-details">
                            <strong>Tuổi:</strong> ${webData.pet.age} tuổi<br>
                            <strong>Chủ nuôi:</strong> ${webData.owner.name}
                        </div>
                        
                        ${webData.pet.description ? `<div class="description">${webData.pet.description}</div>` : ''}
                        
                        <div class="download-section">
                            <p><strong>Tải ứng dụng VNIPET để xem thêm thông tin!</strong></p>
                            <a href="${webData.appDownload.ios}" class="download-btn">Tải cho iOS</a>
                            <a href="${webData.appDownload.android}" class="download-btn">Tải cho Android</a>
                        </div>
                    </div>
                </div>
                
                <div class="powered-by">
                    Powered by VNIPET - Smart Pet Management
                </div>
                
                <script>
                    // Try to open in app if available
                    setTimeout(() => {
                        window.location.href = 'vnipet://pet/${petId}?type=${type}&source=web';
                    }, 100);
                </script>
            </body>
            </html>
        `;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);

    } catch (error) {
        console.error('Handle pet deep link error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing deep link'
        });
    }
});

/**
 * QR Code Deep Link Generation
 * Special QR codes that work with iOS camera app
 */
const generateQRDeepLink = asyncWrap(async (req, res) => {
    try {
        const { petId } = req.params;
        const { 
            size = 256, 
            format = 'png',
            errorLevel = 'M',
            includeDescription = true 
        } = req.query;
        
        // Verify pet exists
        const pet = await Pet.findById(petId);
        if (!pet) {
            return res.status(404).json({
                success: false,
                message: 'Pet not found'
            });
        }

        // Check permissions
        if (pet.ownerId.toString() !== req.user?.id && !pet.isPublic) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const deepLinkUrl = `${baseUrl}/pet/${petId}?source=qr`;
        
        // QR Code options
        const qrOptions = {
            width: parseInt(size),
            height: parseInt(size),
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: errorLevel
        };

        if (format === 'svg') {
            // Generate SVG QR code
            const qrSvg = await QRCode.toString(deepLinkUrl, {
                ...qrOptions,
                type: 'svg'
            });
            
            res.setHeader('Content-Type', 'image/svg+xml');
            res.send(qrSvg);
            
        } else {
            // Generate PNG QR code (default)
            const qrBuffer = await QRCode.toBuffer(deepLinkUrl, {
                ...qrOptions,
                type: 'png'
            });
            
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Content-Disposition', `inline; filename="qr_${pet.name}_${petId}.png"`);
            res.send(qrBuffer);
        }

    } catch (error) {
        console.error('Generate QR deep link error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating QR code'
        });
    }
});

/**
 * Share Extension Support
 * Handle iOS share extension requests
 */
const handleShareExtension = asyncWrap(async (req, res) => {
    try {
        const { type, content, petId } = req.body;
        const userId = req.user?.id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        switch (type) {
            case 'photo':
                // Handle photo sharing
                if (petId) {
                    const pet = await Pet.findById(petId);
                    if (pet && pet.ownerId.toString() === userId) {
                        // Photo can be added to pet profile
                        res.json({
                            success: true,
                            action: 'add_photo',
                            petId: petId,
                            message: 'Photo can be added to pet profile'
                        });
                    } else {
                        res.json({
                            success: false,
                            message: 'Pet not found or access denied'
                        });
                    }
                } else {
                    // Show pet selection for photo
                    const pets = await Pet.find({ ownerId: userId }).select('name species avatar');
                    res.json({
                        success: true,
                        action: 'select_pet',
                        pets: pets,
                        message: 'Select a pet to add this photo'
                    });
                }
                break;
                
            case 'text':
                // Handle text/note sharing
                const pets = await Pet.find({ ownerId: userId }).select('name species avatar');
                res.json({
                    success: true,
                    action: 'add_note',
                    pets: pets,
                    content: content,
                    message: 'Add this note to a pet profile'
                });
                break;
                
            case 'url':
                // Handle URL sharing (vet websites, pet products, etc.)
                res.json({
                    success: true,
                    action: 'save_link',
                    url: content,
                    message: 'Save this link to your pet resources'
                });
                break;
                
            default:
                res.status(400).json({
                    success: false,
                    message: 'Unsupported share type'
                });
        }

    } catch (error) {
        console.error('Share extension error:', error);
        res.status(500).json({
            success: false,
            message: 'Error handling share extension'
        });
    }
});

/**
 * Deep Link Analytics
 * Track deep link usage for insights
 */
const getDeepLinkAnalytics = asyncWrap(async (req, res) => {
    try {
        const { timeRange = '7d' } = req.query;
        
        // This would integrate with analytics service
        // For now, return mock data
        const analytics = {
            timeRange: timeRange,
            totalClicks: 1250,
            uniqueUsers: 892,
            topPets: [
                { petId: 'pet1', name: 'Buddy', clicks: 156 },
                { petId: 'pet2', name: 'Whiskers', clicks: 134 },
                { petId: 'pet3', name: 'Charlie', clicks: 98 }
            ],
            sources: {
                qr: 45,
                social: 30,
                direct: 15,
                other: 10
            },
            platforms: {
                ios: 70,
                android: 20,
                web: 10
            }
        };

        res.json({
            success: true,
            data: analytics
        });

    } catch (error) {
        console.error('Deep link analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading analytics'
        });
    }
});

module.exports = {
    getAppleAppSiteAssociation,
    generatePetDeepLink,
    handlePetDeepLink,
    generateQRDeepLink,
    handleShareExtension,
    getDeepLinkAnalytics
}; 
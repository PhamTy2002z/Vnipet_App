const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { authPetOwnerMiddleware } = require('../middleware/authPetOwner');
const iosMediaController = require('../controllers/media/iosMediaController');

// Configure multer storage for iOS uploads with better filename handling
const iosStorage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const uploadDir = 'uploads/temp';
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: function (req, file, cb) {
        // Preserve original extension for better format detection
        const originalExt = path.extname(file.originalname).toLowerCase();
        // Generate unique filename with original extension
        const uniqueFilename = `${uuidv4()}${originalExt}`;
        cb(null, uniqueFilename);
    }
});

// Define allowed mime types for different media types
const imageFilter = function (req, file, cb) {
    const allowedMimes = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'image/heic', 'image/heif', // iOS specific formats
        'image/x-canon-cr2', 'image/x-nikon-nef', 'image/x-sony-arw', // RAW formats
        'application/octet-stream' // Sometimes iOS sends HEIC as octet-stream
    ];
    
    // Also check extensions for octet-stream
    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'].includes(ext);
    
    if (allowedMimes.includes(file.mimetype) || isAllowedExt) {
        cb(null, true);
    } else {
        cb(new Error(`Unsupported image format: ${file.mimetype}${ext}`), false);
    }
};

const videoFilter = function (req, file, cb) {
    const allowedMimes = [
        'video/mp4', 'video/quicktime', 'video/mov',
        'video/mpeg', 'video/x-m4v', 'video/3gpp'
    ];
    
    // Also check extensions
    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowedExt = ['.mp4', '.mov', '.m4v', '.3gp', '.mpeg'].includes(ext);
    
    if (allowedMimes.includes(file.mimetype) || isAllowedExt) {
        cb(null, true);
    } else {
        cb(new Error(`Unsupported video format: ${file.mimetype}${ext}`), false);
    }
};

// Configure multer for single image upload
const uploadIOSImage = multer({
    storage: iosStorage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB limit for iOS photos
    },
    fileFilter: imageFilter
}).single('image');

// Configure multer for video upload
const uploadIOSVideo = multer({
    storage: iosStorage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit for videos
    },
    fileFilter: videoFilter
}).single('video');

// Configure multer for Live Photo (image + video) upload
const uploadLivePhoto = multer({
    storage: iosStorage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB combined limit
    }
}).fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]);

// Handle multer errors globally
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Multer error (file size, etc)
        return res.status(400).json({
            success: false,
            error: {
                code: 'UPLOAD_ERROR',
                message: `Upload error: ${err.message}`
            }
        });
    } else if (err) {
        // Other errors
        return res.status(400).json({
            success: false,
            error: {
                code: 'FILE_ERROR',
                message: err.message
            }
        });
    }
    next();
};

// Wrap multer middleware with error handling
const wrapMulter = (uploadMiddleware) => {
    return (req, res, next) => {
        uploadMiddleware(req, res, (err) => {
            if (err) {
                handleMulterError(err, req, res, next);
            } else {
                next();
            }
        });
    };
};

// Routes for iOS-specific media uploads
router.post('/upload/image', authPetOwnerMiddleware, wrapMulter(uploadIOSImage), iosMediaController.uploadIOSImage);
router.post('/upload/video', authPetOwnerMiddleware, wrapMulter(uploadIOSVideo), iosMediaController.uploadVideo);
router.post('/upload/live-photo', authPetOwnerMiddleware, wrapMulter(uploadLivePhoto), iosMediaController.uploadLivePhoto);
router.get('/media/:filename/metadata', authPetOwnerMiddleware, iosMediaController.getMediaMetadata);

module.exports = router; 
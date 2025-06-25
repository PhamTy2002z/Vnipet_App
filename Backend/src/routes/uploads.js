const express = require('express');
const uploadManager = require('../utils/uploadManager');
const authPetOwner = require('../middleware/authPetOwner');
const authAdmin = require('../middleware/authAdmin');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const imageProcessor = require('../utils/imageProcessor');

// Middleware để đảm bảo thư mục uploads tồn tại
router.use(async (req, res, next) => {
    try {
        const uploadDirs = [
            path.join(__dirname, '../../uploads/temp'),
            path.join(__dirname, '../../uploads/processed'),
            path.join(__dirname, '../../uploads/chunks')
        ];
        
        for (const dir of uploadDirs) {
            await fs.mkdir(dir, { recursive: true });
        }
        
        next();
    } catch (error) {
        console.error('Error creating upload directories:', error);
        next(error);
    }
});

/**
 * Mobile Upload Routes
 * Comprehensive file upload system optimized for mobile apps
 */

// =====================
// PUBLIC ROUTES
// =====================

/**
 * @route GET /api/v1/uploads/config
 * @desc Get upload configuration for mobile clients
 * @access Public
 */
router.get('/config', (req, res) => {
    res.apiSuccess({
        maxFileSize: uploadManager.config.maxFileSize,
        maxBatchSize: uploadManager.config.maxTotalSize,
        maxFiles: uploadManager.config.maxFiles,
        chunkSize: uploadManager.config.chunkSize,
        supportedFormats: uploadManager.config.supportedFormats,
        optimizedDelivery: true,
        chunkedUploadSupported: true,
        progressTracking: true
    }, 'Upload configuration');
});

/**
 * @route GET /api/v1/uploads/files/:filename
 * @desc Serve processed files
 * @access Public
 */
router.get('/files/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads/processed', filename);
    
    fs.access(filePath)
        .then(() => {
            res.sendFile(filePath);
        })
        .catch(() => {
            res.apiNotFound('File not found');
        });
});

// =====================
// AUTHENTICATED ROUTES
// =====================

/**
 * @route POST /api/v1/uploads/single
 * @desc Upload single file with optimization
 * @access Private
 */
router.post('/single', authPetOwner, (req, res) => {
    try {
        const upload = multer({
            storage: multer.memoryStorage(),
            limits: {
                fileSize: uploadManager.config.maxFileSize
            },
            fileFilter: (req, file, cb) => {
                if (uploadManager.config.allowedMimeTypes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
                }
            }
        }).single('file');

        upload(req, res, async (err) => {
            if (err) {
                return res.apiBadRequest(err.message);
            }

            if (!req.file) {
                return res.apiBadRequest('No file uploaded');
            }

            // Process image
            const processOptions = {
                format: req.body.format || 'webp',
                quality: parseInt(req.body.quality || 80),
                width: req.body.width ? parseInt(req.body.width) : null,
                height: req.body.height ? parseInt(req.body.height) : null,
                outputFilename: `${uuidv4()}.${req.body.format || 'webp'}`
            };

            // Handle HEIC format
            if (req.file.mimetype === 'image/heic' || req.file.mimetype === 'image/heif') {
                const result = await imageProcessor.convertHeic(req.file.buffer, processOptions);
                
                if (!result.success) {
                    return res.apiError('Failed to process HEIC image', 500, { error: result.error });
                }
                
                return res.apiSuccess({
                    filename: result.filename,
                    path: `/uploads/processed/${result.filename}`,
                    size: result.processedMeta.size,
                    format: result.format,
                    width: result.processedMeta.width,
                    height: result.processedMeta.height,
                    originalSize: result.originalMeta?.size,
                    sizeReduction: result.sizeReduction
                }, 'HEIC image converted and uploaded successfully');
            }

            // Process regular image
            const result = await imageProcessor.processImage(req.file.buffer, processOptions);
            
            if (!result.success) {
                return res.apiError('Failed to process image', 500, { error: result.error });
            }
            
            res.apiSuccess({
                filename: result.filename,
                path: `/uploads/processed/${result.filename}`,
                size: result.processedMeta.size,
                format: result.format,
                width: result.processedMeta.width,
                height: result.processedMeta.height,
                originalSize: result.originalMeta?.size,
                sizeReduction: result.sizeReduction
            }, 'Image uploaded and processed successfully');
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.apiError('Upload failed', 500, { error: error.message });
    }
});

/**
 * @route POST /api/v1/uploads/batch
 * @desc Upload multiple files in one request
 * @access Private
 */
router.post('/batch', authPetOwner, (req, res) => {
    try {
        const upload = multer({
            storage: multer.memoryStorage(),
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB per file
                files: uploadManager.config.maxFiles
            }
        }).array('files', uploadManager.config.maxFiles);

        upload(req, res, async (err) => {
            if (err) {
                return res.apiBadRequest(err.message);
            }

            if (!req.files || req.files.length === 0) {
                return res.apiBadRequest('No files uploaded');
            }

            // Process batch
            const results = [];
            const errors = [];

            for (const file of req.files) {
                try {
                    const result = await imageProcessor.processImage(file.buffer, {
                        format: 'webp',
                        quality: 80
                    });
                    
                    if (result.success) {
                        results.push({
                            originalName: file.originalname,
                            filename: result.filename,
                            path: `/uploads/processed/${result.filename}`,
                            size: result.processedMeta.size,
                            sizeReduction: result.sizeReduction
                        });
                    } else {
                        errors.push({
                            filename: file.originalname,
                            error: result.error
                        });
                    }
                } catch (error) {
                    errors.push({
                        filename: file.originalname,
                        error: error.message
                    });
                }
            }

            res.apiSuccess({
                total: req.files.length,
                successful: results.length,
                failed: errors.length,
                results,
                errors: errors.length > 0 ? errors : null
            }, 'Batch upload processed');
        });
    } catch (error) {
        console.error('Batch upload error:', error);
        res.apiError('Batch upload failed', 500, { error: error.message });
    }
});

/**
 * @route POST /api/v1/uploads/chunked/start
 * @desc Start a chunked upload session
 * @access Private
 */
router.post('/chunked/start', authPetOwner, async (req, res) => {
    try {
        const { fileName, fileSize, mimeType, totalChunks } = req.body;
        
        if (!fileName || !fileSize || !mimeType || !totalChunks) {
            return res.apiBadRequest('Missing required fields');
        }
        
        const sessionInfo = await uploadManager.startChunkedUpload({
            fileName,
            fileSize: parseInt(fileSize),
            mimeType,
            totalChunks: parseInt(totalChunks),
            userId: req.user.id,
            uploadType: req.body.uploadType || 'pet-image'
        });
        
        res.apiSuccess(sessionInfo, 'Chunked upload session started');
        
    } catch (error) {
        console.error('Chunked upload start error:', error);
        res.apiError('Failed to start chunked upload', 500, { error: error.message });
    }
});

/**
 * @route POST /api/v1/uploads/chunked/:sessionId
 * @desc Upload a chunk for a session
 * @access Private
 */
router.post('/chunked/:sessionId', authPetOwner, (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const upload = multer({
            storage: multer.memoryStorage(),
            limits: {
                fileSize: 5 * 1024 * 1024 // 5MB per chunk
            }
        }).single('chunk');
        
        upload(req, res, async (err) => {
            if (err) {
                return res.apiBadRequest(err.message);
            }
            
            if (!req.file) {
                return res.apiBadRequest('No chunk uploaded');
            }
            
            const chunkIndex = parseInt(req.body.chunkIndex);
            const chunkHash = req.body.chunkHash;
            
            if (isNaN(chunkIndex)) {
                return res.apiBadRequest('Invalid chunk index');
            }
            
            try {
                const result = await uploadManager.uploadChunk(sessionId, {
                    chunkIndex,
                    chunkHash,
                    chunkBuffer: req.file.buffer
                });
                
                res.apiSuccess(result, `Chunk ${chunkIndex} processed`);
                
            } catch (error) {
                console.error('Chunk upload error:', error);
                res.apiError(`Chunk upload failed: ${error.message}`, 500);
            }
        });
        
    } catch (error) {
        console.error('Chunked upload error:', error);
        res.apiError('Chunked upload failed', 500, { error: error.message });
    }
});

/**
 * @route GET /api/v1/uploads/chunked/:sessionId/status
 * @desc Get status of a chunked upload
 * @access Private
 */
router.get('/chunked/:sessionId/status', authPetOwner, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const progress = uploadManager.getUploadProgress(sessionId);
        
        if (!progress) {
            return res.apiNotFound('Upload session not found');
        }
        
        res.apiSuccess(progress, 'Upload progress');
        
    } catch (error) {
        console.error('Upload status error:', error);
        res.apiError('Failed to get upload status', 500, { error: error.message });
    }
});

// =====================
// ADMIN ROUTES
// =====================

/**
 * @route GET /api/v1/uploads/admin/stats
 * @desc Get upload statistics
 * @access Private (Admin)
 */
router.get('/admin/stats', 
    authAdmin, 
    uploadController.getUploadStats
);

/**
 * @route POST /api/v1/uploads/admin/cleanup
 * @desc Clean up old uploads
 * @access Private (Admin)
 */
router.post('/admin/cleanup', 
    authAdmin, 
    uploadController.cleanupUploads
);

/**
 * @route GET /api/v1/uploads/admin/sessions
 * @desc Get active upload sessions
 * @access Private (Admin)
 */
router.get('/admin/sessions', authAdmin, (req, res) => {
    try {
        const sessions = Array.from(uploadManager.uploadSessions.entries()).map(([id, session]) => ({
            sessionId: id,
            fileId: session.fileId,
            fileName: session.fileName,
            fileSize: session.fileSize,
            mimeType: session.mimeType,
            uploadType: session.uploadType,
            userId: session.userId,
            status: session.status,
            progress: uploadManager.calculateProgress(session),
            createdAt: session.createdAt,
            lastActivity: session.lastActivity
        }));

        res.json({
            success: true,
            data: {
                totalSessions: sessions.length,
                sessions
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// =====================
// ERROR HANDLING MIDDLEWARE
// =====================

/**
 * Handle multer errors
 */
router.use((error, req, res, next) => {
    if (error) {
        console.error('Upload middleware error:', error);
        
        let message = 'Upload failed';
        let statusCode = 400;

        if (error.code === 'LIMIT_FILE_SIZE') {
            message = `File too large. Maximum size: ${uploadManager.config.maxFileSize / (1024 * 1024)}MB`;
        } else if (error.code === 'LIMIT_FILE_COUNT') {
            message = `Too many files. Maximum: ${uploadManager.config.maxFiles}`;
        } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            message = 'Unexpected file field';
        } else if (error.message) {
            message = error.message;
        }

        return res.status(statusCode).json({
            success: false,
            message,
            code: error.code || 'UPLOAD_ERROR'
        });
    }
    next();
});

module.exports = router; 
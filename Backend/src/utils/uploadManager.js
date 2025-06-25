const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const crypto = require('crypto');
const imageProcessor = require('./imageProcessor');

/**
 * Advanced Upload Manager for Mobile Apps
 * Handles chunked uploads, progress tracking, and batch processing
 */
class UploadManager {
    constructor() {
        this.activeUploads = new Map(); // Track ongoing uploads
        this.uploadSessions = new Map(); // Track upload sessions
        this.tempDir = 'uploads/temp';
        this.processedDir = 'uploads/processed';
        this.chunkDir = 'uploads/chunks';
        
        // Mobile-optimized upload configurations
        this.config = {
            maxFileSize: 50 * 1024 * 1024, // 50MB per file
            maxTotalSize: 200 * 1024 * 1024, // 200MB total batch
            maxFiles: 20, // Max files per batch
            chunkSize: 1024 * 1024, // 1MB chunks
            allowedMimeTypes: [
                'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
                'image/heic', 'image/heif', 'image/tiff', 'image/bmp',
                'image/gif', 'image/svg+xml'
            ],
            supportedFormats: ['jpeg', 'jpg', 'png', 'webp', 'heic', 'heif', 'tiff', 'bmp'],
            uploadTimeout: 5 * 60 * 1000, // 5 minutes
            cleanupInterval: 30 * 60 * 1000 // 30 minutes
        };

        this.initializeDirs();
        this.startCleanupTimer();
    }

    /**
     * Initialize required directories
     */
    async initializeDirs() {
        try {
            await Promise.all([
                fs.mkdir(this.tempDir, { recursive: true }),
                fs.mkdir(this.processedDir, { recursive: true }),
                fs.mkdir(this.chunkDir, { recursive: true })
            ]);
        } catch (error) {
            console.error('Directory initialization failed:', error);
        }
    }

    /**
     * Create multer configuration for different upload types
     * @param {string} uploadType - Type of upload (single, batch, chunked)
     * @returns {Object} Multer configuration
     */
    createMulterConfig(uploadType = 'single') {
        const storage = multer.memoryStorage();
        
        const fileFilter = (req, file, cb) => {
            // Validate MIME type
            if (!this.config.allowedMimeTypes.includes(file.mimetype)) {
                return cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
            }
            
            // Additional file extension check
            const ext = path.extname(file.originalname).toLowerCase().substring(1);
            if (!this.config.supportedFormats.includes(ext) && ext !== '') {
                return cb(new Error(`Unsupported file extension: ${ext}`), false);
            }
            
            cb(null, true);
        };

        const limits = {
            fileSize: this.config.maxFileSize,
            files: uploadType === 'batch' ? this.config.maxFiles : 1
        };

        return multer({
            storage,
            fileFilter,
            limits
        });
    }

    /**
     * Start chunked upload session
     * @param {Object} uploadInfo - Upload information
     * @returns {Object} Upload session details
     */
    async startChunkedUpload(uploadInfo) {
        try {
            const {
                fileName,
                fileSize,
                mimeType,
                totalChunks,
                userId,
                uploadType = 'general'
            } = uploadInfo;

            // Validate file size
            if (fileSize > this.config.maxFileSize) {
                throw new Error(`File size exceeds limit: ${this.config.maxFileSize / (1024 * 1024)}MB`);
            }

            // Validate MIME type
            if (!this.config.allowedMimeTypes.includes(mimeType)) {
                throw new Error(`Unsupported file type: ${mimeType}`);
            }

            const sessionId = uuidv4();
            const fileId = uuidv4();
            
            const session = {
                sessionId,
                fileId,
                fileName,
                fileSize,
                mimeType,
                totalChunks,
                uploadedChunks: 0,
                receivedChunks: new Set(),
                chunkHashes: new Map(),
                uploadType,
                userId,
                createdAt: new Date(),
                lastActivity: new Date(),
                status: 'initialized',
                tempFilePath: path.join(this.chunkDir, `${fileId}_chunks`)
            };

            this.uploadSessions.set(sessionId, session);

            // Create chunk directory for this upload
            await fs.mkdir(session.tempFilePath, { recursive: true });

            console.log(`Chunked upload session started: ${sessionId}`);
            
            return {
                sessionId,
                fileId,
                chunkSize: this.config.chunkSize,
                status: 'ready',
                message: 'Upload session initialized'
            };

        } catch (error) {
            throw new Error(`Failed to start chunked upload: ${error.message}`);
        }
    }

    /**
     * Handle chunk upload
     * @param {string} sessionId - Upload session ID
     * @param {Object} chunkData - Chunk information and data
     * @returns {Object} Upload progress
     */
    async uploadChunk(sessionId, chunkData) {
        try {
            const session = this.uploadSessions.get(sessionId);
            if (!session) {
                throw new Error('Upload session not found');
            }

            const {
                chunkIndex,
                chunkHash,
                chunkBuffer
            } = chunkData;

            // Validate chunk
            if (session.receivedChunks.has(chunkIndex)) {
                return {
                    status: 'duplicate',
                    message: `Chunk ${chunkIndex} already received`,
                    progress: this.calculateProgress(session)
                };
            }

            // Verify chunk hash
            const calculatedHash = crypto.createHash('md5').update(chunkBuffer).digest('hex');
            if (chunkHash && calculatedHash !== chunkHash) {
                throw new Error(`Chunk ${chunkIndex} hash mismatch`);
            }

            // Save chunk to disk
            const chunkPath = path.join(session.tempFilePath, `chunk_${chunkIndex}`);
            await fs.writeFile(chunkPath, chunkBuffer);

            // Update session
            session.receivedChunks.add(chunkIndex);
            session.chunkHashes.set(chunkIndex, calculatedHash);
            session.uploadedChunks++;
            session.lastActivity = new Date();

            const progress = this.calculateProgress(session);

            // Check if upload is complete
            if (session.uploadedChunks === session.totalChunks) {
                session.status = 'assembling';
                
                // Assemble file in background
                setImmediate(() => this.assembleFile(sessionId));
                
                return {
                    status: 'complete',
                    message: 'All chunks received, assembling file...',
                    progress: progress
                };
            }

            return {
                status: 'uploading',
                message: `Chunk ${chunkIndex} received`,
                progress: progress
            };

        } catch (error) {
            throw new Error(`Chunk upload failed: ${error.message}`);
        }
    }

    /**
     * Assemble uploaded chunks into final file
     * @param {string} sessionId - Upload session ID
     * @returns {Object} Assembly result
     */
    async assembleFile(sessionId) {
        try {
            const session = this.uploadSessions.get(sessionId);
            if (!session) {
                throw new Error('Upload session not found');
            }

            session.status = 'assembling';

            // Create final file path
            const finalFileName = `${session.fileId}_${session.fileName}`;
            const finalFilePath = path.join(this.tempDir, finalFileName);

            // Assemble chunks in order
            const writeStream = require('fs').createWriteStream(finalFilePath);
            
            for (let i = 0; i < session.totalChunks; i++) {
                const chunkPath = path.join(session.tempFilePath, `chunk_${i}`);
                const chunkData = await fs.readFile(chunkPath);
                writeStream.write(chunkData);
            }
            
            writeStream.end();
            
            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });

            // Verify file integrity
            const finalBuffer = await fs.readFile(finalFilePath);
            if (finalBuffer.length !== session.fileSize) {
                throw new Error('File size mismatch after assembly');
            }

            // Process image if it's an image file
            let processedResult = null;
            if (session.mimeType.startsWith('image/')) {
                processedResult = await imageProcessor.processImage(finalBuffer, {
                    type: session.uploadType,
                    userId: session.userId,
                    outputDir: this.processedDir
                });
            }

            // Update session
            session.status = 'completed';
            session.finalFilePath = finalFilePath;
            session.processedResult = processedResult;
            session.completedAt = new Date();

            // Clean up chunk files
            await this.cleanupChunks(session.tempFilePath);

            console.log(`File assembly completed: ${sessionId}`);

            return {
                status: 'completed',
                fileId: session.fileId,
                fileName: session.fileName,
                filePath: finalFilePath,
                processed: processedResult,
                message: 'File uploaded and processed successfully'
            };

        } catch (error) {
            console.error(`File assembly failed: ${error.message}`);
            
            // Update session status
            if (this.uploadSessions.has(sessionId)) {
                this.uploadSessions.get(sessionId).status = 'failed';
                this.uploadSessions.get(sessionId).error = error.message;
            }
            
            throw error;
        }
    }

    /**
     * Handle batch upload
     * @param {Array} files - Array of file objects
     * @param {Object} options - Upload options
     * @returns {Object} Batch upload results
     */
    async processBatchUpload(files, options = {}) {
        try {
            const {
                userId,
                uploadType = 'general',
                processImages = true
            } = options;

            // Validate batch size
            if (files.length > this.config.maxFiles) {
                throw new Error(`Too many files: ${files.length}. Maximum: ${this.config.maxFiles}`);
            }

            const totalSize = files.reduce((sum, file) => sum + file.size, 0);
            if (totalSize > this.config.maxTotalSize) {
                throw new Error(`Total batch size exceeds limit: ${totalSize / (1024 * 1024)}MB`);
            }

            const batchId = uuidv4();
            const results = {
                batchId,
                uploadType,
                totalFiles: files.length,
                processed: 0,
                failed: 0,
                results: [],
                errors: []
            };

            // Process files concurrently (limit to 3 at a time)
            const processPromises = files.map(async (file, index) => {
                try {
                    let processed = null;
                    
                    if (processImages && file.mimetype.startsWith('image/')) {
                        processed = await imageProcessor.processImage(file.buffer, {
                            type: uploadType,
                            userId,
                            outputDir: this.processedDir
                        });
                    }

                    const fileResult = {
                        index,
                        originalName: file.originalname,
                        fileId: uuidv4(),
                        size: file.size,
                        mimeType: file.mimetype,
                        processed,
                        status: 'success'
                    };

                    results.results.push(fileResult);
                    results.processed++;

                    return fileResult;

                } catch (error) {
                    const errorResult = {
                        index,
                        originalName: file.originalname,
                        error: error.message,
                        status: 'failed'
                    };

                    results.errors.push(errorResult);
                    results.failed++;

                    return errorResult;
                }
            });

            // Wait for all files to be processed
            await Promise.all(processPromises);

            console.log(`Batch upload completed: ${batchId}, ${results.processed}/${results.totalFiles} successful`);

            return results;

        } catch (error) {
            throw new Error(`Batch upload failed: ${error.message}`);
        }
    }

    /**
     * Get upload progress
     * @param {string} sessionId - Upload session ID
     * @returns {Object} Progress information
     */
    getUploadProgress(sessionId) {
        const session = this.uploadSessions.get(sessionId);
        if (!session) {
            return { error: 'Session not found' };
        }

        return {
            sessionId,
            fileId: session.fileId,
            fileName: session.fileName,
            status: session.status,
            progress: this.calculateProgress(session),
            uploadedChunks: session.uploadedChunks,
            totalChunks: session.totalChunks,
            error: session.error
        };
    }

    /**
     * Calculate upload progress
     * @param {Object} session - Upload session
     * @returns {Object} Progress details
     */
    calculateProgress(session) {
        const percentage = Math.round((session.uploadedChunks / session.totalChunks) * 100);
        const uploadedBytes = session.uploadedChunks * this.config.chunkSize;
        const remainingBytes = session.fileSize - uploadedBytes;

        return {
            percentage,
            uploadedBytes: Math.min(uploadedBytes, session.fileSize),
            totalBytes: session.fileSize,
            remainingBytes: Math.max(remainingBytes, 0),
            estimatedTime: this.estimateRemainingTime(session)
        };
    }

    /**
     * Estimate remaining upload time
     * @param {Object} session - Upload session
     * @returns {number} Estimated seconds remaining
     */
    estimateRemainingTime(session) {
        if (session.uploadedChunks === 0) return null;

        const elapsedTime = (new Date() - session.createdAt) / 1000;
        const avgTimePerChunk = elapsedTime / session.uploadedChunks;
        const remainingChunks = session.totalChunks - session.uploadedChunks;

        return Math.round(avgTimePerChunk * remainingChunks);
    }

    /**
     * Resume upload session
     * @param {string} sessionId - Upload session ID
     * @returns {Object} Resume information
     */
    resumeUpload(sessionId) {
        const session = this.uploadSessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found or expired');
        }

        session.lastActivity = new Date();

        return {
            sessionId,
            fileId: session.fileId,
            fileName: session.fileName,
            receivedChunks: Array.from(session.receivedChunks),
            progress: this.calculateProgress(session),
            status: session.status
        };
    }

    /**
     * Cancel upload session
     * @param {string} sessionId - Upload session ID
     */
    async cancelUpload(sessionId) {
        const session = this.uploadSessions.get(sessionId);
        if (!session) {
            return { message: 'Session not found' };
        }

        try {
            // Clean up chunk files
            await this.cleanupChunks(session.tempFilePath);
            
            // Remove session
            this.uploadSessions.delete(sessionId);

            console.log(`Upload cancelled: ${sessionId}`);
            return { message: 'Upload cancelled successfully' };

        } catch (error) {
            console.error(`Cleanup error for cancelled upload: ${error.message}`);
            return { message: 'Upload cancelled with cleanup errors' };
        }
    }

    /**
     * Clean up chunk files
     * @param {string} chunkDir - Chunk directory path
     */
    async cleanupChunks(chunkDir) {
        try {
            const files = await fs.readdir(chunkDir);
            await Promise.all(files.map(file => 
                fs.unlink(path.join(chunkDir, file))
            ));
            await fs.rmdir(chunkDir);
        } catch (error) {
            console.log(`Chunk cleanup error: ${error.message}`);
        }
    }

    /**
     * Start automatic cleanup timer
     */
    startCleanupTimer() {
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, this.config.cleanupInterval);
    }

    /**
     * Clean up expired upload sessions
     */
    async cleanupExpiredSessions() {
        const now = new Date();
        const expiredSessions = [];

        for (const [sessionId, session] of this.uploadSessions) {
            const lastActivity = new Date(session.lastActivity);
            const timeElapsed = now - lastActivity;

            if (timeElapsed > this.config.uploadTimeout) {
                expiredSessions.push(sessionId);
            }
        }

        for (const sessionId of expiredSessions) {
            console.log(`Cleaning up expired session: ${sessionId}`);
            await this.cancelUpload(sessionId);
        }

        if (expiredSessions.length > 0) {
            console.log(`Cleaned up ${expiredSessions.length} expired upload sessions`);
        }
    }

    /**
     * Get active upload statistics
     * @returns {Object} Upload statistics
     */
    getUploadStats() {
        const sessions = Array.from(this.uploadSessions.values());
        
        return {
            totalSessions: sessions.length,
            activeSessions: sessions.filter(s => s.status === 'uploading').length,
            completedSessions: sessions.filter(s => s.status === 'completed').length,
            failedSessions: sessions.filter(s => s.status === 'failed').length,
            totalUploadsSize: sessions.reduce((sum, s) => sum + s.fileSize, 0)
        };
    }
}

module.exports = new UploadManager(); 
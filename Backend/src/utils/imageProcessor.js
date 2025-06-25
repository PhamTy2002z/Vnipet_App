const sharp = require('sharp');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const os = require('os');

// Check if heic-convert module is available (optional dependency)
let heicConvert;
try {
    heicConvert = require('heic-convert');
} catch (error) {
    console.log('heic-convert not available. Will use Sharp for HEIC conversion.');
}

/**
 * Image Processor for Mobile Uploads
 * Optimizes and converts images for better mobile experience
 * Enhanced for iOS-specific formats and features
 */
class ImageProcessor {
    constructor() {
        this.outputDir = 'uploads/processed';
        this.tempDir = 'uploads/temp';
        this.cacheDir = 'uploads/cache';
        this.thumbnailsDir = 'uploads/thumbnails';
        this.metadataDir = 'uploads/metadata';
        this.videoThumbnailsDir = 'uploads/video-thumbnails';
        
        // Formats hỗ trợ mở rộng cho iOS
        this.supportedInputFormats = [
            // Standard formats
            'jpeg', 'jpg', 'png', 'webp', 'gif', 'tiff', 
            // iOS formats
            'heic', 'heif', 'avif',
            // Raw formats
            'dng', 'cr2', 'nef', 'arw',
            // Video thumbnails
            'mp4', 'mov', 'm4v'
        ];
        
        // Output formats supported
        this.supportedOutputFormats = ['jpeg', 'png', 'webp', 'avif'];
        
        // Quality levels
        this.qualityLevels = {
            low: {
                webp: { quality: 60, effort: 3 },
                avif: { quality: 50, effort: 5 },
                jpeg: { quality: 70, mozjpeg: true }
            },
            medium: {
                webp: { quality: 75, effort: 4 },
                avif: { quality: 65, effort: 6 },
                jpeg: { quality: 80, mozjpeg: true }
            },
            high: {
                webp: { quality: 85, effort: 5 },
                avif: { quality: 75, effort: 7 },
                jpeg: { quality: 90, mozjpeg: true }
            },
            ultra: {
                webp: { quality: 95, effort: 6 },
                avif: { quality: 90, effort: 8 },
                jpeg: { quality: 98, mozjpeg: true }
            }
        };
        
        // WebP configuration
        this.webpOptions = {
            quality: 80,
            lossless: false,
            nearLossless: false,
            smartSubsample: true,
            effort: 4 // 0-6, 6 is slowest but best compression
        };
        
        // AVIF configuration (cho iOS 16+ và Android mới)
        this.avifOptions = {
            quality: 65,
            lossless: false,
            effort: 7 // 0-9, 9 is slowest but best compression
        };
        
        // Thumbnail configuration
        this.thumbnailSizes = {
            xs: 80,  // Icon size
            sm: 150, // Small thumbnail
            md: 300, // Medium thumbnail
            lg: 600, // Large preview
            xl: 900  // Extra large preview
        };
        
        // Check for ffmpeg for video support
        this.hasFFmpeg = false;
        this.checkFFmpeg();
        
        // Ensure directories exist
        this.initDirectories();
    }
    
    /**
     * Check if ffmpeg is installed for video processing
     */
    async checkFFmpeg() {
        try {
            await execPromise('ffmpeg -version');
            this.hasFFmpeg = true;
            console.log('FFmpeg detected, video processing enabled');
        } catch (error) {
            this.hasFFmpeg = false;
            console.log('FFmpeg not found, video processing disabled');
        }
    }
    
    async initDirectories() {
        try {
            await Promise.all([
                fs.mkdir(this.outputDir, { recursive: true }),
                fs.mkdir(this.tempDir, { recursive: true }),
                fs.mkdir(this.cacheDir, { recursive: true }),
                fs.mkdir(this.thumbnailsDir, { recursive: true }),
                fs.mkdir(this.metadataDir, { recursive: true }),
                fs.mkdir(this.videoThumbnailsDir, { recursive: true }),
                fs.mkdir(path.join(this.cacheDir, 'webp'), { recursive: true }),
                fs.mkdir(path.join(this.cacheDir, 'avif'), { recursive: true }),
                fs.mkdir(path.join(this.thumbnailsDir, 'xs'), { recursive: true }),
                fs.mkdir(path.join(this.thumbnailsDir, 'sm'), { recursive: true }),
                fs.mkdir(path.join(this.thumbnailsDir, 'md'), { recursive: true }),
                fs.mkdir(path.join(this.thumbnailsDir, 'lg'), { recursive: true }),
                fs.mkdir(path.join(this.thumbnailsDir, 'xl'), { recursive: true })
            ]);
            console.log('Image processor directories initialized');
        } catch (error) {
            console.error('Error creating directories:', error);
        }
    }
    
    /**
     * Phát hiện định dạng phù hợp nhất cho client
     * @param {Object} req - Express request
     * @returns {string} Format phù hợp nhất (webp, avif, or jpeg)
     */
    detectBestFormat(req) {
        if (!req) return 'webp'; // Default to WebP if no request
        
        const acceptHeader = req.headers.accept || '';
        const userAgent = req.headers['user-agent'] || '';
        
        // Check Accept header first
        if (acceptHeader.includes('image/avif')) {
            return 'avif'; // Best quality/compression
        }
        
        if (acceptHeader.includes('image/webp')) {
            return 'webp'; // Good compromise
        }
        
        // Check user agent for iOS/Safari version
        const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
        const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);
        
        if (isIOS || isSafari) {
            // iOS 16+ supports AVIF
            if (userAgent.match(/OS 16_|OS 17_/)) {
                return 'avif';
            }
            
            // iOS 14+ supports WebP
            if (userAgent.match(/OS 14_|OS 15_|OS 16_|OS 17_/)) {
                return 'webp';
            }
            
            return 'jpeg'; // Fallback for older iOS
        }
        
        // Most modern browsers support WebP
        return 'webp';
    }
    
    /**
     * Generate cache key for image
     * @param {Buffer|string} input - Image source
     * @param {Object} options - Processing options
     * @returns {string} Cache key
     */
    generateCacheKey(input, options) {
        const content = Buffer.isBuffer(input) ? input : input.toString();
        const hash = crypto.createHash('md5');
        
        // Hash input content
        hash.update(content);
        
        // Add options to hash
        hash.update(JSON.stringify({
            format: options.format,
            quality: options.quality,
            width: options.width,
            height: options.height,
            fit: options.fit
        }));
        
        return hash.digest('hex');
    }
    
    /**
     * Process image with automatic optimization
     * @param {Buffer|string} input - Image buffer or file path
     * @param {Object} options - Processing options
     * @param {Object} req - Express request for format detection
     * @returns {Promise<Object>} Processing result with paths and metadata
     */
    async processImage(input, options = {}, req = null) {
        try {
            // Detect best format based on client if format not specified
            const detectedFormat = this.detectBestFormat(req);
            
            const {
                format = detectedFormat,
                quality = format === 'avif' ? 65 : 80,
                width = null,
                height = null,
                fit = 'inside',
                outputFilename = null, // Will generate if not provided
                metadata = true,
                autoRotate = true,
                withoutEnlargement = true,
                useCache = true
            } = options;
            
            // Generate cache key if caching enabled
            const cacheKey = useCache ? this.generateCacheKey(input, {
                format, quality, width, height, fit
            }) : null;
            
            // Check cache first
            if (useCache && cacheKey) {
                const cachedPath = path.join(this.cacheDir, format, `${cacheKey}.${format}`);
                try {
                    await fs.access(cachedPath);
                    console.log(`Cache hit: ${cachedPath}`);
                    
                    // Get cached image metadata
                    let cachedMeta = null;
                    if (metadata) {
                        const cachedImage = sharp(cachedPath);
                        cachedMeta = await cachedImage.metadata();
                    }
                    
                    return {
                        success: true,
                        cached: true,
                        outputPath: cachedPath,
                        filename: path.basename(cachedPath),
                        format,
                        processedMeta: cachedMeta,
                        quality
                    };
                } catch (e) {
                    // Cache miss, continue processing
                }
            }
            
            // Generate output filename if not provided
            const filename = outputFilename || `${cacheKey || uuidv4()}.${format}`;
            
            // Create a sharp instance
            let image = sharp(input);
            
            // Auto-rotate based on EXIF data if requested
            if (autoRotate) {
                image = image.rotate();
            }
            
            // Get original metadata if requested
            let meta = null;
            if (metadata) {
                meta = await image.metadata();
            }
            
            // Resize if dimensions provided
            if (width || height) {
                image = image.resize({
                    width,
                    height,
                    fit,
                    withoutEnlargement
                });
            }
            
            // Apply format-specific optimizations
            switch (format.toLowerCase()) {
                case 'jpeg':
                case 'jpg':
                    image = image.jpeg({ 
                        quality,
                        mozjpeg: true, // Use mozjpeg for better compression
                        chromaSubsampling: '4:2:0' // Better compression with slight color loss
                    });
                    break;
                    
                case 'png':
                    image = image.png({ 
                        quality: quality / 1.2,
                        compressionLevel: 9, // Max compression
                        adaptiveFiltering: true // Better compression
                    });
                    break;
                    
                case 'webp':
                    image = image.webp({
                        ...this.webpOptions,
                        quality,
                    });
                    break;
                    
                case 'avif':
                    image = image.avif({
                        ...this.avifOptions,
                        quality
                    });
                    break;
                    
                default:
                    // Default to WebP for best compatibility/compression ratio
                    image = image.webp({
                        ...this.webpOptions,
                        quality
                    });
            }
            
            // Determine output path - cache or regular output
            const outputPath = useCache && cacheKey
                ? path.join(this.cacheDir, format, `${cacheKey}.${format}`)
                : path.join(this.outputDir, filename);
            
            // Process and save the image
            await image.toFile(outputPath);
            
            // Final metadata
            let processedMeta = null;
            if (metadata) {
                const outputImage = sharp(outputPath);
                processedMeta = await outputImage.metadata();
            }
            
            // Copy to output dir if using cache
            let finalPath = outputPath;
            if (useCache && cacheKey && outputPath.includes(this.cacheDir)) {
                finalPath = path.join(this.outputDir, filename);
                await fs.copyFile(outputPath, finalPath);
            }
            
            return {
                success: true,
                cached: false,
                originalMeta: meta,
                processedMeta,
                outputPath: finalPath,
                filename: path.basename(finalPath),
                format,
                quality,
                sizeReduction: meta && processedMeta ? 
                    `${(100 - (processedMeta.size / meta.size * 100)).toFixed(1)}%` : null,
                compressionRatio: meta && processedMeta ? 
                    (meta.size / processedMeta.size).toFixed(2) : null
            };
            
        } catch (error) {
            console.error('Image processing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Convert HEIC/HEIF to standard format with enhanced support for iOS images
     * @param {Buffer|string} input - HEIC image buffer or file path
     * @param {Object} options - Conversion options
     * @param {Object} req - Express request for format detection
     * @returns {Promise<Object>} Conversion result
     */
    async convertHeic(input, options = {}, req = null) {
        try {
            // Detect best target format based on client
            const targetFormat = this.detectBestFormat(req);
            
            // Check for heic-convert for better handling of iOS images
            if (heicConvert && (typeof input === 'string' && path.extname(input).toLowerCase() === '.heic')) {
                console.log(`Using heic-convert for iOS HEIC image`);
                
                // Read the HEIC file
                const heicBuffer = await fs.readFile(input);
                
                // Convert to target format
                let convertedBuffer;
                const tempFilePath = path.join(this.tempDir, `converted_${Date.now()}.${targetFormat}`);
                
                try {
                    // Try to extract metadata including depth & portrait mode data
                    const exifData = await this.extractExifData(input);
                    
                    // Convert to target format (jpg is most compatible with heic-convert)
                    convertedBuffer = await heicConvert({
                        buffer: heicBuffer,
                        format: 'JPEG',
                        quality: 0.9
                    });
                    
                    // Save temp file
                    await fs.writeFile(tempFilePath, convertedBuffer);
                    
                    // Check if this is a Live Photo by looking for paired .mov file
                    if (typeof input === 'string') {
                        const baseFilename = path.basename(input, '.heic');
                        const dirPath = path.dirname(input);
                        const possibleMovPath = path.join(dirPath, `${baseFilename}.mov`);
                        
                        if (fsSync.existsSync(possibleMovPath)) {
                            // This is a Live Photo! Process the video part
                            console.log(`Detected Live Photo with video: ${possibleMovPath}`);
                            
                            // Store this info in metadata for client reference
                            await this.saveMetadata(path.basename(tempFilePath), {
                                isLivePhoto: true,
                                videoPath: possibleMovPath,
                                originalHeic: input,
                                hasDepthData: exifData?.hasDepthData || false
                            });
                            
                            // Extract a frame from the video as well
                            if (this.hasFFmpeg) {
                                await this.extractVideoThumbnail(possibleMovPath);
                            }
                        } else if (exifData?.hasDepthData) {
                            // Portrait mode photo with depth data
                            console.log(`Detected Portrait mode photo with depth data`);
                            await this.saveMetadata(path.basename(tempFilePath), {
                                isPortraitMode: true,
                                hasDepthData: true,
                                originalHeic: input,
                                ...exifData
                            });
                        }
                    }
                    
                    // Process the converted image with Sharp for further optimizations
                    return await this.processImage(tempFilePath, {
                        ...options,
                        format: targetFormat,
                        quality: targetFormat === 'avif' ? 65 : 85,
                        useCache: true,
                        preserveMetadata: true
                    }, req);
                    
                } catch (conversionError) {
                    console.warn('heic-convert failed, falling back to Sharp:', conversionError);
                    // If heic-convert fails, fallback to Sharp
                }
            }
            
            // Fallback to Sharp which now supports HEIC inputs in newer versions
            console.log(`Converting HEIC to ${targetFormat} using Sharp`);
            
            // Convert with optimal settings for the target format
            return await this.processImage(input, {
                ...options,
                format: targetFormat,
                quality: targetFormat === 'avif' ? 65 : 85,
                useCache: true
            }, req);
            
        } catch (error) {
            console.error('HEIC conversion error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Extract EXIF data from image for iOS-specific metadata like depth maps
     * @param {string} imagePath - Path to the image file
     * @returns {Promise<Object>} EXIF metadata
     */
    async extractExifData(imagePath) {
        try {
            // Try to use ExifTool if available (for more complete metadata)
            try {
                const { stdout } = await execPromise(`exiftool -json "${imagePath}"`);
                const exifData = JSON.parse(stdout)[0];
                
                // Check for depth data (Portrait mode)
                const hasDepthData = 
                    exifData.DepthFormat !== undefined || 
                    exifData.DepthImageType !== undefined ||
                    exifData.AppleExtDepthData !== undefined;
                
                return {
                    make: exifData.Make,
                    model: exifData.Model,
                    software: exifData.Software,
                    creationDate: exifData.CreateDate || exifData.DateTimeOriginal,
                    gpsLatitude: exifData.GPSLatitude,
                    gpsLongitude: exifData.GPSLongitude,
                    hasDepthData,
                    isPortraitMode: hasDepthData,
                    lensModel: exifData.LensModel,
                    focalLength: exifData.FocalLength,
                    aperture: exifData.Aperture || exifData.FNumber,
                    shutterSpeed: exifData.ShutterSpeed || exifData.ExposureTime,
                    iso: exifData.ISO
                };
            } catch (exifToolError) {
                // ExifTool not available, use Sharp's more limited metadata
                const image = sharp(imagePath);
                const metadata = await image.metadata();
                
                return {
                    format: metadata.format,
                    width: metadata.width,
                    height: metadata.height,
                    hasExif: !!metadata.exif,
                    hasDepthData: false, // Cannot detect with Sharp alone
                    isPortraitMode: false
                };
            }
        } catch (error) {
            console.error('Failed to extract EXIF data:', error);
            return { error: error.message };
        }
    }
    
    /**
     * Save metadata for an image
     * @param {string} filename - Image filename
     * @param {Object} metadata - Metadata to save
     */
    async saveMetadata(filename, metadata) {
        try {
            const metadataPath = path.join(this.metadataDir, `${path.parse(filename).name}.json`);
            await fs.writeFile(
                metadataPath, 
                JSON.stringify({
                    ...metadata,
                    _savedAt: new Date().toISOString()
                }, null, 2)
            );
            return { success: true, metadataPath };
        } catch (error) {
            console.error('Error saving metadata:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Extract thumbnail from video file
     * @param {string} videoPath - Path to video file
     * @returns {Promise<Object>} Result with thumbnail path
     */
    async extractVideoThumbnail(videoPath) {
        if (!this.hasFFmpeg) {
            return { success: false, error: 'FFmpeg not available' };
        }
        
        try {
            const videoFilename = path.basename(videoPath);
            const outputPath = path.join(this.videoThumbnailsDir, `${path.parse(videoFilename).name}.jpg`);
            
            // Extract frame at 0.5 seconds for thumbnail
            await execPromise(`ffmpeg -y -i "${videoPath}" -ss 00:00:00.5 -vframes 1 -q:v 2 "${outputPath}"`);
            
            // Generate different sizes of thumbnails
            await this.generateThumbnail(outputPath, {
                prefix: 'video_',
                generateSizes: true
            });
            
            return {
                success: true,
                thumbnailPath: outputPath,
                filename: path.basename(outputPath)
            };
        } catch (error) {
            console.error('Video thumbnail extraction error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Generate responsive image variants
     * @param {Buffer|string} input - Image buffer or file path
     * @param {Object} options - Base options
     * @param {Object} req - Express request for format detection
     * @returns {Promise<Object>} Results with different size variants
     */
    async generateResponsiveImages(input, options = {}, req = null) {
        try {
            const format = options.format || this.detectBestFormat(req);
            const widths = options.widths || [640, 828, 1200, 1920]; // Common mobile widths
            const baseQuality = options.quality || (format === 'avif' ? 65 : 80);
            
            // Process original image first to get metadata
            const original = await this.processImage(input, {
                format,
                quality: baseQuality,
                metadata: true,
                autoRotate: true,
                ...options
            }, req);
            
            if (!original.success) {
                throw new Error(original.error || 'Failed to process original image');
            }
            
            // Generate variants in parallel
            const variants = await Promise.all(widths.map(async (width) => {
                // Skip sizes larger than original
                if (original.originalMeta && width > original.originalMeta.width) {
                    return null;
                }
                
                // Generate variant
                const result = await this.processImage(input, {
                    format,
                    width,
                    fit: 'inside',
                    withoutEnlargement: true,
                    quality: baseQuality,
                    metadata: false,
                    outputFilename: `${path.parse(original.filename).name}_${width}.${format}`,
                    ...options
                }, req);
                
                if (result.success) {
                    return {
                        width,
                        path: result.outputPath,
                        filename: result.filename,
                        url: `/uploads/processed/${result.filename}`
                    };
                }
                
                return null;
            }));
            
            // Filter out nulls and sort by width
            const validVariants = variants
                .filter(v => v !== null)
                .sort((a, b) => a.width - b.width);
            
            return {
                success: true,
                original: {
                    path: original.outputPath,
                    filename: original.filename,
                    url: `/uploads/processed/${original.filename}`,
                    width: original.processedMeta?.width,
                    height: original.processedMeta?.height,
                    format
                },
                variants: validVariants,
                srcset: validVariants.map(v => `${v.url} ${v.width}w`).join(', '),
                sizes: options.sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
            };
            
        } catch (error) {
            console.error('Responsive image generation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Generate thumbnail for an image
     * @param {Buffer|string} input - Image buffer or file path
     * @param {Object} options - Thumbnail options
     * @returns {Promise<Object>} Thumbnail result
     */
    async generateThumbnail(input, options = {}) {
        try {
            const {
                width = 200,
                height = 200,
                fit = 'cover',
                format = 'webp',
                quality = 70,
                outputFilename = `thumb_${uuidv4()}.${format}`,
                prefix = '',
                generateSizes = false,
                sizesToGenerate = ['xs', 'sm', 'md', 'lg', 'xl']
            } = options;
            
            // If only one size requested
            if (!generateSizes) {
                return await this.processImage(input, {
                    width,
                    height,
                    fit,
                    format,
                    quality,
                    outputFilename: prefix + outputFilename
                });
            }
            
            // Generate multiple thumbnail sizes
            const results = {};
            const baseFilename = path.parse(outputFilename).name;
            
            // Generate each requested size in parallel
            await Promise.all(sizesToGenerate.map(async (size) => {
                const thumbSize = this.thumbnailSizes[size];
                const sizeFilename = `${prefix}${baseFilename}_${size}.${format}`;
                const sizeOutputPath = path.join(this.thumbnailsDir, size, sizeFilename);
                
                const sizeResult = await this.processImage(input, {
                    width: thumbSize,
                    height: thumbSize,
                    fit,
                    format,
                    quality,
                    outputFilename: sizeFilename
                });
                
                if (sizeResult.success) {
                    results[size] = {
                        path: sizeResult.outputPath,
                        url: `/uploads/thumbnails/${size}/${sizeFilename}`,
                        width: thumbSize,
                        height: thumbSize
                    };
                }
            }));
            
            return {
                success: true,
                thumbnails: results,
                format,
                quality
            };
            
        } catch (error) {
            console.error('Thumbnail generation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Process videos for iOS (Live Photos, slow-motion, etc.)
     * @param {string} videoPath - Path to video file
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processing result
     */
    async processVideo(videoPath, options = {}) {
        if (!this.hasFFmpeg) {
            return { success: false, error: 'FFmpeg not available for video processing' };
        }
        
        try {
            const {
                generateThumbnail = true,
                convertToMP4 = true,
                generatePreview = true,
                quality = 'medium', // low, medium, high, original
                saveMetadata = true
            } = options;
            
            const videoFilename = path.basename(videoPath);
            const outputDir = path.join(this.outputDir, 'videos');
            await fs.mkdir(outputDir, { recursive: true });
            
            // Get video info using ffprobe
            const { stdout: videoInfo } = await execPromise(
                `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name,duration,r_frame_rate -of json "${videoPath}"`
            );
            
            const videoData = JSON.parse(videoInfo);
            const videoStream = videoData.streams[0];
            
            // Check if this is a slow-motion video (high frame rate)
            const frameRate = eval(videoStream.r_frame_rate); // ffprobe returns frame rate as fraction
            const isSlowMotion = frameRate > 60;
            
            // Results object
            const result = {
                success: true,
                original: {
                    path: videoPath,
                    filename: videoFilename,
                    width: videoStream.width,
                    height: videoStream.height,
                    duration: parseFloat(videoStream.duration),
                    codec: videoStream.codec_name,
                    frameRate
                },
                isSlowMotion,
                outputs: {}
            };
            
            // Generate thumbnail frame
            if (generateThumbnail) {
                const thumbnailResult = await this.extractVideoThumbnail(videoPath);
                if (thumbnailResult.success) {
                    result.thumbnail = thumbnailResult;
                }
            }
            
            // Convert to MP4 if needed (for better compatibility)
            if (convertToMP4 && !videoPath.toLowerCase().endsWith('.mp4')) {
                const mp4Filename = `${path.parse(videoFilename).name}.mp4`;
                const mp4OutputPath = path.join(outputDir, mp4Filename);
                
                // Quality presets for ffmpeg
                const qualityPresets = {
                    low: ['-crf', '28', '-preset', 'faster'],
                    medium: ['-crf', '23', '-preset', 'medium'],
                    high: ['-crf', '18', '-preset', 'slow'],
                    original: ['-crf', '16', '-preset', 'slow']
                };
                
                const qualityArgs = qualityPresets[quality] || qualityPresets.medium;
                
                // Convert to MP4
                await execPromise(`ffmpeg -y -i "${videoPath}" ${qualityArgs.join(' ')} "${mp4OutputPath}"`);
                
                result.outputs.mp4 = {
                    path: mp4OutputPath,
                    url: `/uploads/processed/videos/${mp4Filename}`,
                    quality
                };
            }
            
            // Generate short preview for Live Photos (first 3 seconds)
            if (generatePreview) {
                const previewFilename = `${path.parse(videoFilename).name}_preview.mp4`;
                const previewOutputPath = path.join(outputDir, previewFilename);
                
                await execPromise(
                    `ffmpeg -y -i "${videoPath}" -t 3 -vf "scale=480:-1" -c:v libx264 -crf 26 -preset faster "${previewOutputPath}"`
                );
                
                result.outputs.preview = {
                    path: previewOutputPath,
                    url: `/uploads/processed/videos/${previewFilename}`
                };
            }
            
            // Save video metadata
            if (saveMetadata) {
                const metadataResult = await this.saveMetadata(videoFilename, {
                    ...result,
                    originalPath: videoPath,
                    processedAt: new Date().toISOString()
                });
                
                if (metadataResult.success) {
                    result.metadata = metadataResult;
                }
            }
            
            return result;
            
        } catch (error) {
            console.error('Video processing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Process image with multiple quality levels
     * @param {Buffer|string} input - Image buffer or file path
     * @param {Object} options - Processing options 
     * @returns {Promise<Object>} Processing results at different quality levels
     */
    async processWithQualityLevels(input, options = {}) {
        try {
            const {
                format = 'webp',
                width = null,
                height = null,
                qualities = ['low', 'medium', 'high'],
                generateThumbnails = true,
                req = null
            } = options;
            
            // Detect best format if not specified
            const outputFormat = format || this.detectBestFormat(req);
            
            // Process image at different quality levels
            const results = {};
            
            // Get original metadata
            const image = sharp(input);
            const metadata = await image.metadata();
            
            // Generate outputs for each quality level
            await Promise.all(qualities.map(async (quality) => {
                const qualitySettings = this.qualityLevels[quality][outputFormat];
                const qualitySuffix = `_${quality}`;
                
                const result = await this.processImage(input, {
                    format: outputFormat,
                    width,
                    height,
                    ...qualitySettings,
                    outputFilename: `${path.parse(typeof input === 'string' ? input : 'image').name}${qualitySuffix}.${outputFormat}`
                }, req);
                
                if (result.success) {
                    results[quality] = {
                        path: result.outputPath,
                        url: `/uploads/processed/${result.filename}`,
                        size: result.processedMeta?.size || 0,
                        width: result.processedMeta?.width || metadata.width,
                        height: result.processedMeta?.height || metadata.height,
                        quality: qualitySettings.quality
                    };
                }
            }));
            
            // Generate thumbnails if requested
            if (generateThumbnails) {
                const thumbnailResult = await this.generateThumbnail(input, {
                    format: outputFormat,
                    generateSizes: true
                });
                
                if (thumbnailResult.success) {
                    results.thumbnails = thumbnailResult.thumbnails;
                }
            }
            
            return {
                success: true,
                original: {
                    format: metadata.format,
                    width: metadata.width,
                    height: metadata.height,
                    size: metadata.size
                },
                outputs: results,
                format: outputFormat
            };
            
        } catch (error) {
            console.error('Multi-quality processing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new ImageProcessor(); 
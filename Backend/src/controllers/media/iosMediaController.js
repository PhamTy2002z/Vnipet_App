const path = require('path');
const fs = require('fs').promises;
const imageProcessor = require('../../utils/imageProcessor');
const asyncWrap = require('../../utils/asyncWrap');
const Pet = require('../../models/Pet');

/**
 * Controller for handling iOS media uploads
 * Supports: HEIC/HEIF images, Live Photos, Portrait mode, Video processing
 */

/**
 * Process iOS image uploads with enhanced support
 * Accepts HEIC/HEIF and other formats
 * @route POST /api/v1/ios/upload/image
 */
const uploadIOSImage = asyncWrap(async (req, res) => {
    if (!req.file) {
        return res.apiValidation([{ field: 'image', message: 'Không có file nào được tải lên' }]);
    }
    
    try {
        const file = req.file;
        const petId = req.body.petId;
        const fieldName = req.body.fieldName || 'petImage'; // Default to petImage
        const quality = req.body.quality || 'high'; // low, medium, high, ultra
        
        console.log(`[iOS Upload] Received ${file.mimetype} file: ${file.originalname}`);
        
        // Determine if this is a HEIC/HEIF image
        const fileExt = path.extname(file.originalname).toLowerCase();
        const isHeic = fileExt === '.heic' || fileExt === '.heif' || file.mimetype.includes('heic') || file.mimetype.includes('heif');
        
        // Process the image based on format
        let processResult;
        
        if (isHeic) {
            // Enhanced HEIC processing for iOS images
            processResult = await imageProcessor.convertHeic(file.path, {
                quality: quality === 'ultra' ? 95 : quality === 'high' ? 85 : quality === 'medium' ? 75 : 65
            }, req);
        } else {
            // Process with quality levels for standard images
            processResult = await imageProcessor.processWithQualityLevels(file.path, {
                qualities: [quality],
                generateThumbnails: true,
                req
            });
        }
        
        if (!processResult.success) {
            return res.apiError('Failed to process image: ' + processResult.error);
        }
        
        // Create response data
        const responseData = {
            success: true,
            originalName: file.originalname,
            processed: true,
            format: processResult.format || path.extname(file.originalname).substring(1),
            outputs: processResult.outputs || {},
        };
        
        // Check if this is a pet profile image that needs to be saved to the pet record
        if (petId && fieldName) {
            // Update pet record with the new image URL
            const qualityToUse = quality || 'high';
            let imageUrl = '';
            
            // Get URL based on the structure of processResult
            if (processResult.outputs && processResult.outputs[qualityToUse]) {
                imageUrl = processResult.outputs[qualityToUse].url;
            } else if (processResult.outputPath) {
                // Handle direct output from convertHeic
                const filename = path.basename(processResult.outputPath);
                imageUrl = `/uploads/processed/${filename}`;
            }
            
            if (imageUrl) {
                const updateQuery = {};
                updateQuery[fieldName] = imageUrl;
                
                const updatedPet = await Pet.findByIdAndUpdate(petId, updateQuery, { new: true });
                
                if (updatedPet) {
                    responseData.petUpdated = true;
                    responseData.pet = {
                        id: updatedPet._id,
                        name: updatedPet.name,
                        [fieldName]: updatedPet[fieldName]
                    };
                }
            }
        }
        
        // Check if this is a Live Photo with associated video
        if (processResult.isLivePhoto || 
            (processResult.metadata && processResult.metadata.isLivePhoto)) {
            responseData.isLivePhoto = true;
            responseData.livePhotoVideo = processResult.videoUrl || processResult.metadata.videoPath;
        }
        
        // Check if this is a portrait mode photo with depth data
        if ((processResult.isPortraitMode || (processResult.metadata && processResult.metadata.isPortraitMode))) {
            responseData.isPortraitMode = true;
        }
        
        return res.apiSuccess(responseData, 'iOS image processed successfully');
        
    } catch (error) {
        console.error('iOS image upload error:', error);
        return res.apiError('iOS image upload failed: ' + error.message);
    } finally {
        // Clean up the temporary file if it exists
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (cleanupError) {
                console.error('Failed to clean up temporary file:', cleanupError);
            }
        }
    }
});

/**
 * Upload and process Live Photos from iOS
 * Handles the paired .heic + .mov files
 * @route POST /api/v1/ios/upload/live-photo
 */
const uploadLivePhoto = asyncWrap(async (req, res) => {
    if (!req.files || !req.files.image || !req.files.video) {
        return res.apiValidation([
            { field: 'image', message: 'Missing image part of Live Photo' },
            { field: 'video', message: 'Missing video part of Live Photo' }
        ]);
    }
    
    try {
        const imageFile = req.files.image[0];
        const videoFile = req.files.video[0];
        const petId = req.body.petId;
        const fieldName = req.body.fieldName || 'petImage';
        const quality = req.body.quality || 'high';
        
        console.log(`[iOS Live Photo] Received image: ${imageFile.originalname}, video: ${videoFile.originalname}`);
        
        // Process image first
        const imageResult = await imageProcessor.convertHeic(imageFile.path, {
            quality: quality === 'ultra' ? 95 : quality === 'high' ? 85 : 75
        }, req);
        
        if (!imageResult.success) {
            return res.apiError('Failed to process Live Photo image: ' + imageResult.error);
        }
        
        // Process video
        const videoResult = await imageProcessor.processVideo(videoFile.path, {
            quality,
            generateThumbnail: true,
            generatePreview: true
        });
        
        if (!videoResult.success) {
            return res.apiError('Failed to process Live Photo video: ' + videoResult.error);
        }
        
        // Save metadata linking the two files
        const livePhotoId = path.parse(imageFile.originalname).name;
        await imageProcessor.saveMetadata(livePhotoId, {
            type: 'livePhoto',
            imageFile: imageFile.originalname,
            videoFile: videoFile.originalname,
            imageResult,
            videoResult
        });
        
        // Create response data
        const responseData = {
            success: true,
            isLivePhoto: true,
            original: {
                image: imageFile.originalname,
                video: videoFile.originalname
            },
            image: {
                url: `/uploads/processed/${path.basename(imageResult.outputPath)}`,
                width: imageResult.processedMeta?.width,
                height: imageResult.processedMeta?.height,
                format: imageResult.format
            },
            video: {
                url: videoResult.outputs.mp4?.url || null,
                preview: videoResult.outputs.preview?.url || null,
                thumbnail: videoResult.thumbnail?.thumbnailPath ? 
                    `/uploads/video-thumbnails/${path.basename(videoResult.thumbnail.thumbnailPath)}` : null
            }
        };
        
        // Update pet record if petId provided
        if (petId && fieldName) {
            const updateQuery = {};
            updateQuery[fieldName] = responseData.image.url;
            updateQuery[`${fieldName}LivePhoto`] = responseData.video.url;
            
            const updatedPet = await Pet.findByIdAndUpdate(petId, updateQuery, { new: true });
            
            if (updatedPet) {
                responseData.petUpdated = true;
                responseData.pet = {
                    id: updatedPet._id,
                    name: updatedPet.name,
                    [fieldName]: updatedPet[fieldName],
                    [`${fieldName}LivePhoto`]: updatedPet[`${fieldName}LivePhoto`]
                };
            }
        }
        
        return res.apiSuccess(responseData, 'Live Photo processed successfully');
        
    } catch (error) {
        console.error('Live Photo upload error:', error);
        return res.apiError('Live Photo upload failed: ' + error.message);
    } finally {
        // Clean up the temporary files if they exist
        if (req.files) {
            for (const fileType in req.files) {
                for (const file of req.files[fileType]) {
                    try {
                        await fs.unlink(file.path);
                    } catch (cleanupError) {
                        console.error(`Failed to clean up temporary file ${file.path}:`, cleanupError);
                    }
                }
            }
        }
    }
});

/**
 * Process portrait mode photos with depth information
 * @route POST /api/v1/ios/upload/portrait
 */
const uploadPortraitPhoto = asyncWrap(async (req, res) => {
    if (!req.files || !req.files.image || !req.files.depth) {
        return res.apiValidation([
            { field: 'image', message: 'Missing image part of Portrait photo' },
            { field: 'depth', message: 'Missing depth map of Portrait photo' }
        ]);
    }
    
    try {
        const imageFile = req.files.image[0];
        const depthFile = req.files.depth[0];
        const petId = req.body.petId;
        const fieldName = req.body.fieldName || 'petImage';
        const quality = req.body.quality || 'high';
        
        console.log(`[iOS Portrait] Received image: ${imageFile.originalname}, depth: ${depthFile.originalname}`);
        
        // Process main image
        const imageResult = await imageProcessor.convertHeic(imageFile.path, {
            quality: quality === 'ultra' ? 95 : quality === 'high' ? 85 : 75
        }, req);
        
        if (!imageResult.success) {
            return res.apiError('Failed to process Portrait photo: ' + imageResult.error);
        }
        
        // Save depth map
        const depthMapFilename = `depth_${path.parse(imageFile.originalname).name}.jpg`;
        const depthMapPath = path.join(process.cwd(), 'uploads', 'processed', depthMapFilename);
        await fs.copyFile(depthFile.path, depthMapPath);
        
        // Save metadata linking the image and depth map
        const portraitId = path.parse(imageFile.originalname).name;
        await imageProcessor.saveMetadata(portraitId, {
            type: 'portrait',
            imageFile: imageFile.originalname,
            depthFile: depthFile.originalname,
            imageResult,
            depthMapPath
        });
        
        // Create response data
        const responseData = {
            success: true,
            isPortraitMode: true,
            original: {
                image: imageFile.originalname,
                depth: depthFile.originalname
            },
            image: {
                url: `/uploads/processed/${path.basename(imageResult.outputPath)}`,
                width: imageResult.processedMeta?.width,
                height: imageResult.processedMeta?.height,
                format: imageResult.format
            },
            depth: {
                url: `/uploads/processed/${depthMapFilename}`
            }
        };
        
        // Update pet record if petId provided
        if (petId && fieldName) {
            const updateQuery = {};
            updateQuery[fieldName] = responseData.image.url;
            updateQuery[`${fieldName}Depth`] = responseData.depth.url;
            
            const updatedPet = await Pet.findByIdAndUpdate(petId, updateQuery, { new: true });
            
            if (updatedPet) {
                responseData.petUpdated = true;
                responseData.pet = {
                    id: updatedPet._id,
                    name: updatedPet.name,
                    [fieldName]: updatedPet[fieldName],
                    [`${fieldName}Depth`]: updatedPet[`${fieldName}Depth`]
                };
            }
        }
        
        return res.apiSuccess(responseData, 'Portrait photo processed successfully');
        
    } catch (error) {
        console.error('Portrait photo upload error:', error);
        return res.apiError('Portrait photo upload failed: ' + error.message);
    } finally {
        // Clean up the temporary files if they exist
        if (req.files) {
            for (const fileType in req.files) {
                for (const file of req.files[fileType]) {
                    try {
                        await fs.unlink(file.path);
                    } catch (cleanupError) {
                        console.error(`Failed to clean up temporary file ${file.path}:`, cleanupError);
                    }
                }
            }
        }
    }
});

/**
 * Upload and process video
 * @route POST /api/v1/ios/upload/video
 */
const uploadVideo = asyncWrap(async (req, res) => {
    if (!req.file) {
        return res.apiValidation([{ field: 'video', message: 'Không có video nào được tải lên' }]);
    }
    
    try {
        const file = req.file;
        const petId = req.body.petId;
        const fieldName = req.body.fieldName || 'petVideo';
        const quality = req.body.quality || 'high';
        
        console.log(`[iOS Video Upload] Received ${file.mimetype} file: ${file.originalname}`);
        
        // Process the video
        const videoResult = await imageProcessor.processVideo(file.path, {
            quality,
            generateThumbnail: true,
            generatePreview: true
        });
        
        if (!videoResult.success) {
            return res.apiError('Failed to process video: ' + videoResult.error);
        }
        
        // Create response data
        const responseData = {
            success: true,
            originalName: file.originalname,
            processed: true,
            format: videoResult.format || path.extname(file.originalname).substring(1),
            outputs: videoResult.outputs || {},
            thumbnail: videoResult.thumbnail?.thumbnailPath ? 
                `/uploads/video-thumbnails/${path.basename(videoResult.thumbnail.thumbnailPath)}` : null
        };
        
        // Check if this video needs to be saved to a pet record
        if (petId && fieldName) {
            const updateQuery = {};
            updateQuery[fieldName] = videoResult.outputs.mp4?.url || null;
            updateQuery[`${fieldName}Thumbnail`] = responseData.thumbnail;
            
            const updatedPet = await Pet.findByIdAndUpdate(petId, updateQuery, { new: true });
            
            if (updatedPet) {
                responseData.petUpdated = true;
                responseData.pet = {
                    id: updatedPet._id,
                    name: updatedPet.name,
                    [fieldName]: updatedPet[fieldName],
                    [`${fieldName}Thumbnail`]: updatedPet[`${fieldName}Thumbnail`]
                };
            }
        }
        
        return res.apiSuccess(responseData, 'Video processed successfully');
        
    } catch (error) {
        console.error('Video upload error:', error);
        return res.apiError('Video upload failed: ' + error.message);
    } finally {
        // Clean up the temporary file if it exists
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (cleanupError) {
                console.error('Failed to clean up temporary file:', cleanupError);
            }
        }
    }
});

/**
 * Get media metadata
 * @route GET /api/v1/ios/media/:filename/metadata
 */
const getMediaMetadata = asyncWrap(async (req, res) => {
    try {
        const filename = req.params.filename;
        if (!filename) {
            return res.apiValidation([{ field: 'filename', message: 'Filename is required' }]);
        }
        
        // Get media ID from filename
        const mediaId = path.parse(filename).name;
        
        // Fetch metadata
        const metadata = await imageProcessor.getMetadata(mediaId);
        
        if (!metadata) {
            return res.status(404).json({
                success: false,
                message: 'Metadata not found for this media file'
            });
        }
        
        return res.apiSuccess({
            mediaId,
            metadata
        }, 'Media metadata retrieved successfully');
        
    } catch (error) {
        console.error('Get media metadata error:', error);
        return res.apiError('Failed to retrieve media metadata: ' + error.message);
    }
});

module.exports = {
    uploadIOSImage,
    uploadVideo,
    uploadLivePhoto,
    uploadPortraitPhoto,
    getMediaMetadata
}; 
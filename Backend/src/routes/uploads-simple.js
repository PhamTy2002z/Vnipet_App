const express = require('express');
const router = express.Router();

// Simple test route
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Upload routes working'
    });
});

// Get upload configuration
router.get('/config', (req, res) => {
    res.json({
        success: true,
        data: {
            maxFileSize: 50 * 1024 * 1024,
            maxFiles: 20,
            chunkSize: 1024 * 1024,
            supportedFormats: ['jpeg', 'png', 'webp', 'heic']
        }
    });
});

module.exports = router; 
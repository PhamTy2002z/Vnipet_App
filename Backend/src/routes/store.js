// src/routes/store.js
const express   = require('express');
const Theme     = require('../models/Theme');

const router = express.Router();

// Helper function to get the correct image URL for a theme
const getThemeImageUrl = (theme) => {
  if (theme && theme.image && theme.image.publicUrl) {
    return theme.image.publicUrl;
  }
  
  if (theme && theme.imageUrl) {
    return theme.imageUrl;
  }
  
  return null;
};

/*  GET /api/v1/store/themes
    Public endpoint to browse available themes (no authentication required)          */
router.get('/themes', async (_req, res, next) => {
  try {
    const list = await Theme.find({ isActive: true, inStore: true })
      .sort({ order: 1, createdAt: -1 })
      .select('name imageUrl image description price isPremium presetKey');
    
    // Transform themes to include correct image URL
    const transformedThemes = list.map(theme => ({
      _id: theme._id,
      name: theme.name,
      imageUrl: getThemeImageUrl(theme),
      description: theme.description,
      price: theme.price,
      isPremium: theme.isPremium,
      presetKey: theme.presetKey,
    }));
    
    res.json(transformedThemes);
  } catch (err) { next(err); }
});

module.exports = router;

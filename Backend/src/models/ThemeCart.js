const mongoose = require('mongoose');

/**
 * ThemeCart – One active cart per pet owner user
 * Allows adding multiple themes which can later be purchased in bulk.
 */
const ThemeCartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PetOwnerUser',
      required: true,
      unique: true, // One cart per user
      index: true,
    },
    items: [
      {
        themeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Theme',
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('ThemeCart', ThemeCartSchema); 
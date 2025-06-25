// src/models/UserTheme.js
const mongoose = require('mongoose');

const UserThemeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PetOwnerUser',
      required: true
    },
    themeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Theme',
      required: true
    },
    purchaseDate: {
      type: Date,
      default: Date.now
    },
    transactionId: {
      type: String,
      default: null
    },
    purchasePrice: {
      type: Number,
      default: 0
    },
    appliedToPets: [{
      petId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pet'
      },
      appliedAt: {
        type: Date,
        default: Date.now
      }
    }],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { 
    timestamps: true 
  }
);

// Compound index to prevent duplicate theme purchases
UserThemeSchema.index({ userId: 1, themeId: 1 }, { unique: true });

// Method to apply theme to a pet
UserThemeSchema.methods.applyToPet = function(petId) {
  // Remove if already applied to avoid duplicates
  this.appliedToPets = this.appliedToPets.filter(
    applied => applied.petId.toString() !== petId.toString()
  );
  
  // Add new application
  this.appliedToPets.push({
    petId: petId,
    appliedAt: new Date()
  });
};

// Method to remove theme from a pet
UserThemeSchema.methods.removeFromPet = function(petId) {
  this.appliedToPets = this.appliedToPets.filter(
    applied => applied.petId.toString() !== petId.toString()
  );
};

// Method to check if theme is applied to a specific pet
UserThemeSchema.methods.isAppliedToPet = function(petId) {
  return this.appliedToPets.some(
    applied => applied.petId.toString() === petId.toString()
  );
};

module.exports = mongoose.model('UserTheme', UserThemeSchema);

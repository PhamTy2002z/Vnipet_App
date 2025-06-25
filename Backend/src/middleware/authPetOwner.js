const jwt = require('jsonwebtoken');
const PetOwnerUser = require('../models/PetOwnerUser');
const Pet = require('../models/Pet');

/**
 * Middleware to authenticate pet owner users
 * Adds user info to req.user if token is valid
 */
const authPetOwnerMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is for pet owner role
    if (decoded.role !== 'petOwner') {
      return res.status(403).json({ error: 'Access denied. Invalid token type.' });
    }
    
    const user = await PetOwnerUser.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token. User not found or inactive.' });
    }
    
    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({ 
        error: 'Account temporarily locked. Please try again later.' 
      });
    }
    
    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: 'petOwner'
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed.' });
  }
};

/**
 * Middleware to check if user owns the pet or if editing is allowed
 * Use after authPetOwner for protected pet operations
 */
const authPetOwnership = async (req, res, next) => {
  try {
    const petId = req.params.id || req.params.petId || req.body.petId;
    
    if (!petId) {
      return res.status(400).json({ error: 'Pet ID is required.' });
    }
    
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ error: 'Pet profile not found.' });
    }
    
    // Check if user owns this pet
    if (!pet.ownerAccount || pet.ownerAccount.toString() !== req.user.id) {
      return res.status(403).json({ 
        error: 'You do not have permission to access this pet profile.' 
      });
    }
    
    req.pet = pet;
    next();
  } catch (error) {
    console.error('Pet ownership auth error:', error);
    res.status(500).json({ error: 'Authorization failed.' });
  }
};

/**
 * Optional middleware - authenticates if token is provided, but allows access without token
 * Used for public viewing with optional enhanced access for owners
 */
const optionalAuthPetOwner = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // No token provided, continue without authentication
      req.user = null;
      return next();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role === 'petOwner') {
      const user = await PetOwnerUser.findById(decoded.id);
      if (user && user.isActive && !user.isLocked()) {
        req.user = {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: 'petOwner'
        };
      }
    }
    
    next();
  } catch (error) {
    // If token is invalid, continue without authentication
    // This allows public access while providing enhanced access to authenticated users
    req.user = null;
    next();
  }
};

/**
 * Middleware to check if pet viewing is allowed
 * Allows public viewing if pet.visibility.isPubliclyViewable is true
 * Always allows owner access
 */
const authPetViewing = async (req, res, next) => {
  try {
    const petId = req.params.id || req.params.petId;
    
    if (!petId) {
      return res.status(400).json({ error: 'Pet ID is required.' });
    }
    
    const pet = await Pet.findById(petId)
      .populate('ownerAccount', 'name email phone')
      .populate('themeId');
    if (!pet) {
      return res.status(404).json({ error: 'Pet profile not found.' });
    }
    
    // Check if user is the owner
    const isOwner = req.user && pet.ownerAccount && pet.ownerAccount._id.toString() === req.user.id;
    
    // Allow access if user is owner OR if pet allows public viewing
    if (isOwner || pet.visibility.isPubliclyViewable) {
      req.pet = pet;
      req.isOwner = isOwner;
      req.canEdit = isOwner; // Only owner can edit
      req.canViewContact = isOwner || pet.visibility.allowContactView;
      return next();
    }
    
    // If pet is not publicly viewable and user is not owner
    return res.status(403).json({ 
      error: 'This pet profile is private and can only be viewed by the owner.' 
    });
    
  } catch (error) {
    console.error('Pet viewing auth error:', error);
    res.status(500).json({ error: 'Authorization failed.' });
  }
};

module.exports = {
  authPetOwnerMiddleware,
  authPetOwnership,
  optionalAuthPetOwner,
  authPetViewing
}; 
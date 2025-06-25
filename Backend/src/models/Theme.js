// src/models/Theme.js
const mongoose = require('mongoose');

const ThemeSchema = new mongoose.Schema(
  {
    /* -------------------------------------------------- */
    /*  BASIC INFO                                        */
    /* -------------------------------------------------- */
    name       : { type: String, required: true, trim: true },
    
    // Legacy local storage (for migration)
    imageUrl   : { type: String, default: null },
    
    // New R2 storage
    image: {
      r2Key: { type: String, default: null }, // R2 object key
      bucket: { type: String, default: 'vnipet' }, // R2 bucket name
      publicUrl: { type: String, default: null }, // Direct access URL
      originalName: { type: String, default: null },
      mimetype: { type: String, default: null },
      size: { type: Number, default: null },
      uploadedAt: { type: Date, default: null },
    },
    
    description: { type: String, default: '' },

    /* -------------------------------------------------- */
    /*  RENDER PRESET                                     */
    /* -------------------------------------------------- */
    /**  Khóa slug khớp với thư mục / file preset front-end
     *   VD:  pet-card   ⇢ /src/theme-presets/pet-card/
     *        pet-card-2 ⇢ /src/theme-presets/pet-card-2/            */
    presetKey: {
      type    : String,
      required: true,
      trim    : true,
      unique  : true,
      lowercase: true,
      match   : /^[a-z0-9-]+$/,            // chỉ a-z, 0-9, dấu gạch
    },

    /* -------------------------------------------------- */
    /*  STORE / PRICING                                   */
    /* -------------------------------------------------- */
    isActive : { type: Boolean, default: true },
    isPremium: { type: Boolean, default: false },

    price: {
      type : Number,
      min  : 0,
      // giữ 0 cho theme free; đặt ở controller khi tạo / update
      default: 0,
    },

    inStore: { type: Boolean, default: true },

    /**  Sắp xếp trong Store – nhỏ trước  */
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

/* Nếu theme không premium → bảo đảm price = 0 */
ThemeSchema.pre('save', function (next) {
  if (!this.isPremium) this.price = 0;
  next();
});

/* INDEX - tìm theme đang bán + sắp xếp */
ThemeSchema.index({ isActive: 1, inStore: 1, order: 1 });

module.exports = mongoose.model('Theme', ThemeSchema);

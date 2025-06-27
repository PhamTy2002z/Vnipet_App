const mongoose = require('mongoose');

/**
 * ThemeOrder – hoá đơn mua theme (1 lần checkout = 1 order)
 * Lưu danh sách sản phẩm, tổng giá, ngày mua, mã giao dịch.
 */
const ThemeOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PetOwnerUser',
      required: true,
      index: true,
    },
    items: [
      {
        themeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Theme',
          required: true,
        },
        userThemeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'UserTheme',
          required: true,
        },
        price: { type: Number, default: 0 },
        name: { type: String, default: '' },
      },
    ],
    totalPrice: { type: Number, default: 0 },
    transactionId: { type: String, required: true, unique: true },
    purchaseDate: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

ThemeOrderSchema.index({ userId: 1, purchaseDate: -1 });

module.exports = mongoose.model('ThemeOrder', ThemeOrderSchema); 
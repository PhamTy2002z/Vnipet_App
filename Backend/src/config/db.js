// src/config/db.js
const mongoose = require('mongoose');

module.exports = async function() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✔️  MongoDB connected');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

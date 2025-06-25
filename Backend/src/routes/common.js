const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();
const { getAvatar } = require('../controllers/media/petImageController');

/* --- Stream avatar từ GridFS --- */
router.get('/avatar/:id', getAvatar);

/* --- Static theme images --- */
router.get('/theme-images/:filename', (req, res) => {
  const filename = path.basename(req.params.filename); // tránh traversal
  const imgPath  = path.join(process.cwd(), 'public', 'uploads', 'themes', filename);

  fs.access(imgPath, fs.constants.F_OK, (err) =>
    err ? res.status(404).send('Not found') : res.sendFile(imgPath)
  );
});

module.exports = router;

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const wrap    = require('../utils/asyncWrap');
const router  = express.Router();

const {
  getPetById,
  updatePet,
  updatePetOwnerEmail,
  updateAllergicInfo,
  updatePetDescription,
} = require('../controllers/user/userController');

const {
  getActiveThemes,
  getStoreThemes,
  getPurchasedThemes,
  purchaseTheme,
  applyPurchasedTheme,
} = require('../controllers/theme/themeController');

const { uploadAvatar, deleteAvatar } = require('../controllers/media/petImageController');
const { sendReminderEmail, testEmailConfig } = require('../utils/mail');

const {
  setPasscode,
  verifyPasscode,
  getSecurityStatus,
  resetPasscode
} = require('../controllers/auth/securityController');

// Import controllers
const userController = require('../controllers/user/userController');
const dashboardController = require('../controllers/user/dashboardController');
const petController = require('../controllers/pet/petController');
const petHealthController = require('../controllers/pet/petHealthController');
const themeController = require('../controllers/theme/themeController');

// Import middleware
const { authUserMiddleware } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authUserMiddleware);

/* ===== Middleware ghi log ===== */
router.use((req, _res, next) => {
  console.log(`[USER] ${req.method} ${req.originalUrl}`);
  next();
});

/* ===== User profile ===== */
router.get('/me', wrap(userController.getCurrentUser));
router.get('/profile', wrap(userController.getProfile));
router.put('/profile', wrap(userController.updateProfile));
router.get('/devices', wrap(userController.getUserDevices));
router.post('/devices/:deviceId/revoke', wrap(userController.revokeDevice));

/* ===== Dashboard ===== */
router.get('/dashboard', wrap(dashboardController.getDashboard));
router.get('/activity', wrap(dashboardController.getUserActivity));

/* ===== Pet management ===== */
router.get('/pets', wrap(petController.getUserPets));
router.get('/pets/:petId', wrap(petController.getPetDetails));
router.put('/pets/:petId', wrap(petController.updatePet));
router.post('/pets/scan-qr', wrap(petController.scanAndLinkQR));
router.delete('/pets/:petId/unlink', wrap(petController.unlinkPet));

/* ===== Pet health ===== */
router.post('/pets/:petId/vaccination', wrap(petHealthController.addVaccination));
router.put('/pets/:petId/vaccination/:vaccinationId', wrap(petHealthController.updateVaccination));
router.delete('/pets/:petId/vaccination/:vaccinationId', wrap(petHealthController.deleteVaccination));
router.post('/pets/:petId/re-examination', wrap(petHealthController.addReExamination));
router.put('/pets/:petId/re-examination/:reExaminationId', wrap(petHealthController.updateReExamination));
router.delete('/pets/:petId/re-examination/:reExaminationId', wrap(petHealthController.deleteReExamination));

/* ===== Theme management ===== */
router.get('/themes/store', wrap(themeController.getStoreThemes));
router.get('/themes/:themeId', wrap(themeController.getThemeDetails));
router.get('/themes/purchased', wrap(themeController.getPurchasedThemes));
router.post('/themes/:themeId/purchase', wrap(themeController.purchaseTheme));
router.post('/themes/:themeId/apply', wrap(themeController.applyThemeToPet));
router.post('/themes/:themeId/remove', wrap(themeController.removeThemeFromPet));

/* ===== Pet profile (public) ===== */
router.get('/pets/:id', wrap(getPetById));

/* ===== Security endpoints ===== */
router.get('/pets/:id/security/status', wrap(getSecurityStatus));
router.post('/pets/:id/security/set-passcode', wrap(setPasscode));
router.post('/pets/:id/security/verify-passcode', wrap(verifyPasscode));

/* ===== Pet owner actions (require token QR) =====
   TODO: gắn middleware authPet khi bạn triển khai QR-token
*/
router.post  ('/pets/:id/owner-email',     wrap(updatePetOwnerEmail));
router.put   ('/pets/:id/allergic-info',   wrap(updateAllergicInfo));
router.put   ('/pets/:id/description',     wrap(updatePetDescription));
router.post  ('/pets/:id/avatar',          uploadAvatar);
router.delete('/pets/:id/avatar',          wrap(deleteAvatar));

/* Back-compat legacy PUT /pet/:id/theme */
router.put('/pets/:id/theme', (req, res) => {
  req.body.petId = req.params.id;
  return themeController.applyThemeToPet(req, res);
});

/* ===== Theme store & purchasing ===== */
router.get ('/themes',                wrap(themeController.getActiveThemes));     // free + purchased

/* ===== Asset check (debug) ===== */
router.get('/theme-image-check/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const imgPath  = path.join(process.cwd(), 'public', 'uploads', 'themes', filename);
  fs.access(imgPath, fs.constants.F_OK, (err) =>
    err
      ? res.status(404).json({ exists: false })
      : res.json({ exists: true, path: `/uploads/themes/${filename}` })
  );
});

/* ===== Email helpers ===== */
router.post('/pets/:id/send-reminder', wrap(async (req, res) => {
  const { to, petName, revisitDate } = req.body;
  if (!to || !petName || !revisitDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  await sendReminderEmail(to, petName, revisitDate);
  res.json({ message: 'Reminder email sent' });
}));

router.get('/test-email-config', wrap(async (_req, res) => {
  (await testEmailConfig())
    ? res.json({ message: 'Email config OK' })
    : res.status(500).json({ message: 'Email config invalid' });
}));

router.post('/test-reminder', wrap(async (req, res) => {
  const { to, petName, appointmentDate, note } = req.body;
  if (!to || !petName || !appointmentDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const appointmentInfo = note
    ? `${new Date(appointmentDate).toLocaleDateString('vi-VN')} (Ghi chú: ${note})`
    : new Date(appointmentDate).toLocaleDateString('vi-VN');

  const result = await sendReminderEmail(to, petName, appointmentInfo);
  res.json({ message: 'Sent', messageId: result.messageId });
}));

module.exports = router;

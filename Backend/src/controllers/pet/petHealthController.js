/**
 * Pet Health Controller
 * Quản lý thông tin sức khỏe của thú cưng
 */

const Pet = require('../../models/Pet');

/**
 * Add vaccination record
 * POST /api/v1/pet/:petId/vaccination
 */
exports.addVaccination = async (req, res) => {
  try {
    const userId = req.user.id;
    const { petId } = req.params;
    const { name, date } = req.body;
    
    // Validate input
    if (!name || !date) {
      return res.status(400).json({
        success: false,
        error: 'Tên và ngày tiêm là bắt buộc'
      });
    }
    
    // Find pet and verify ownership
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thú cưng'
      });
    }
    
    if (!pet.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Bạn không sở hữu thú cưng này'
      });
    }
    
    // Add vaccination
    const newVaccination = {
      name,
      date: new Date(date)
    };
    
    pet.vaccinations.push(newVaccination);
    await pet.save();
    
    // Lấy vaccination vừa thêm với đầy đủ thông tin bao gồm _id
    const addedVaccination = pet.vaccinations[pet.vaccinations.length - 1];
    
    res.json({
      success: true,
      message: 'Đã thêm thông tin tiêm chủng thành công',
      data: {
        _id: addedVaccination._id,
        name: addedVaccination.name,
        date: addedVaccination.date
      }
    });
    
  } catch (error) {
    console.error('Add vaccination error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update vaccination record
 * PUT /api/v1/pet/:petId/vaccination/:vaccinationId
 */
exports.updateVaccination = async (req, res) => {
  try {
    const userId = req.user.id;
    const { petId, vaccinationId } = req.params;
    const { name, date } = req.body;
    
    // Find pet and verify ownership
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thú cưng'
      });
    }
    
    if (!pet.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Bạn không sở hữu thú cưng này'
      });
    }
    
    // Find vaccination
    const vaccination = pet.vaccinations.id(vaccinationId);
    if (!vaccination) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thông tin tiêm chủng'
      });
    }
    
    // Update vaccination
    if (name) vaccination.name = name;
    if (date) vaccination.date = new Date(date);
    
    await pet.save();
    
    res.json({
      success: true,
      message: 'Đã cập nhật thông tin tiêm chủng thành công',
      data: vaccination
    });
    
  } catch (error) {
    console.error('Update vaccination error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete vaccination record
 * DELETE /api/v1/pet/:petId/vaccination/:vaccinationId
 */
exports.deleteVaccination = async (req, res) => {
  try {
    const userId = req.user.id;
    const { petId, vaccinationId } = req.params;
    
    // Find pet and verify ownership
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thú cưng'
      });
    }
    
    if (!pet.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Bạn không sở hữu thú cưng này'
      });
    }
    
    // Remove vaccination (cách mới cho Mongoose 6+)
    const vaccinationToRemove = pet.vaccinations.id(vaccinationId);
    if (!vaccinationToRemove) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thông tin tiêm chủng'
      });
    }
    
    // Xóa vaccination bằng cách lọc ra subdocument cần xóa
    pet.vaccinations = pet.vaccinations.filter(
      v => v._id.toString() !== vaccinationId
    );
    
    await pet.save();
    
    res.json({
      success: true,
      message: 'Đã xóa thông tin tiêm chủng thành công'
    });
    
  } catch (error) {
    console.error('Delete vaccination error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Add re-examination record
 * POST /api/v1/pet/:petId/re-examination
 */
exports.addReExamination = async (req, res) => {
  try {
    const userId = req.user.id;
    const { petId } = req.params;
    const { date, note } = req.body;
    
    // Validate input
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Ngày tái khám là bắt buộc'
      });
    }
    
    // Find pet and verify ownership
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thú cưng'
      });
    }
    
    if (!pet.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Bạn không sở hữu thú cưng này'
      });
    }
    
    // Add re-examination
    const newReExamination = {
      date: new Date(date),
      note: note || '',
      reminderSent: false
    };
    
    pet.reExaminations.push(newReExamination);
    await pet.save();
    
    // Lấy re-examination vừa thêm với đầy đủ thông tin bao gồm _id
    const addedReExamination = pet.reExaminations[pet.reExaminations.length - 1];
    
    res.json({
      success: true,
      message: 'Đã thêm lịch tái khám thành công',
      data: {
        _id: addedReExamination._id,
        date: addedReExamination.date,
        note: addedReExamination.note,
        reminderSent: addedReExamination.reminderSent
      }
    });
    
  } catch (error) {
    console.error('Add re-examination error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update re-examination record
 * PUT /api/v1/pet/:petId/re-examination/:reExaminationId
 */
exports.updateReExamination = async (req, res) => {
  try {
    const userId = req.user.id;
    const { petId, reExaminationId } = req.params;
    const { date, note } = req.body;
    
    // Find pet and verify ownership
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thú cưng'
      });
    }
    
    if (!pet.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Bạn không sở hữu thú cưng này'
      });
    }
    
    // Find re-examination
    const reExamination = pet.reExaminations.id(reExaminationId);
    if (!reExamination) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy lịch tái khám'
      });
    }
    
    // Update re-examination
    if (date) reExamination.date = new Date(date);
    if (note !== undefined) reExamination.note = note;
    
    await pet.save();
    
    res.json({
      success: true,
      message: 'Đã cập nhật lịch tái khám thành công',
      data: reExamination
    });
    
  } catch (error) {
    console.error('Update re-examination error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete re-examination record
 * DELETE /api/v1/pet/:petId/re-examination/:reExaminationId
 */
exports.deleteReExamination = async (req, res) => {
  try {
    const userId = req.user.id;
    const { petId, reExaminationId } = req.params;
    
    // Find pet and verify ownership
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thú cưng'
      });
    }
    
    if (!pet.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Bạn không sở hữu thú cưng này'
      });
    }
    
    // Remove re-examination (cách mới cho Mongoose 6+)
    const reExaminationToRemove = pet.reExaminations.id(reExaminationId);
    if (!reExaminationToRemove) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy lịch tái khám'
      });
    }
    
    // Xóa re-examination bằng cách lọc ra subdocument cần xóa
    pet.reExaminations = pet.reExaminations.filter(
      re => re._id.toString() !== reExaminationId
    );
    
    await pet.save();
    
    res.json({
      success: true,
      message: 'Đã xóa lịch tái khám thành công'
    });
    
  } catch (error) {
    console.error('Delete re-examination error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Add allergic substance
 * POST /api/v1/pet/:petId/allergic-substances
 */
exports.addAllergicSubstance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { petId } = req.params;
    const { substance } = req.body;
    
    if (!substance) {
      return res.status(400).json({
        success: false,
        error: 'Tên chất gây dị ứng là bắt buộc'
      });
    }
    
    // Kiểm tra độ dài tên chất dị ứng
    if (substance.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Tên chất dị ứng không được quá 10 ký tự'
      });
    }
    
    // Kiểm tra định dạng chỉ chữ và khoảng trắng
    if (!/^[\p{L} ]+$/u.test(substance)) {
      return res.status(400).json({
        success: false,
        error: 'Tên chất dị ứng chỉ được chứa chữ và khoảng trắng'
      });
    }
    
    // Find pet and verify ownership
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thú cưng'
      });
    }
    
    if (!pet.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Bạn không sở hữu thú cưng này'
      });
    }
    
    // Check if substance already exists
    if (pet.allergicInfo.substances.includes(substance)) {
      return res.status(400).json({
        success: false,
        error: 'Chất dị ứng này đã được thêm trước đó'
      });
    }
    
    // Add substance to allergic info
    pet.allergicInfo.substances.push(substance);
    await pet.save();
    
    res.json({
      success: true,
      message: 'Đã thêm chất gây dị ứng thành công',
      data: pet.allergicInfo
    });
    
  } catch (error) {
    console.error('Add allergic substance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Remove allergic substance
 * DELETE /api/v1/pet/:petId/allergic-substances/:substance
 */
exports.removeAllergicSubstance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { petId, substance } = req.params;
    
    // Find pet and verify ownership
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thú cưng'
      });
    }
    
    if (!pet.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Bạn không sở hữu thú cưng này'
      });
    }
    
    // Check if substance exists
    const index = pet.allergicInfo.substances.indexOf(substance);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy chất dị ứng này'
      });
    }
    
    // Remove substance
    pet.allergicInfo.substances.splice(index, 1);
    await pet.save();
    
    res.json({
      success: true,
      message: 'Đã xóa chất gây dị ứng thành công',
      data: pet.allergicInfo
    });
    
  } catch (error) {
    console.error('Remove allergic substance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update allergic note
 * PUT /api/v1/pet/:petId/allergic-note
 */
exports.updateAllergicNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { petId } = req.params;
    const { note } = req.body;
    
    if (note === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Ghi chú dị ứng là bắt buộc'
      });
    }
    
    // Find pet and verify ownership
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thú cưng'
      });
    }
    
    if (!pet.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Bạn không sở hữu thú cưng này'
      });
    }
    
    // Update allergic note
    pet.allergicInfo.note = note;
    await pet.save();
    
    res.json({
      success: true,
      message: 'Đã cập nhật ghi chú dị ứng thành công',
      data: pet.allergicInfo
    });
    
  } catch (error) {
    console.error('Update allergic note error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update complete allergic info
 * PUT /api/v1/pet/:petId/allergic-info
 */
exports.updateAllergicInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const { petId } = req.params;
    const { substances, note } = req.body;
    
    // Find pet and verify ownership
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thú cưng'
      });
    }
    
    if (!pet.isOwnedBy(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Bạn không sở hữu thú cưng này'
      });
    }
    
    // Update allergic info
    if (substances !== undefined) {
      // Validate substances format
      const isValid = substances.every(
        (s) => typeof s === 'string' && /^[\p{L} ]{1,10}$/u.test(s)
      );
      
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Tên chất dị ứng không được quá 10 ký tự và chỉ chứa chữ cái và khoảng trắng'
        });
      }
      
      pet.allergicInfo.substances = substances;
    }
    
    if (note !== undefined) {
      pet.allergicInfo.note = note;
    }
    
    await pet.save();
    
    res.json({
      success: true,
      message: 'Đã cập nhật thông tin dị ứng thành công',
      data: pet.allergicInfo
    });
    
  } catch (error) {
    console.error('Update allergic info error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}; 
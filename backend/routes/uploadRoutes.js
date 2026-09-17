const express = require('express');
const router = express.Router();
const { upload, uploadToCloudinary } = require('../utils/upload');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

// @desc    Upload product image to Cloudinary
// @route   POST /api/upload
// @access  Private/Admin
router.post('/', protect, adminOnly, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const result = await uploadToCloudinary(req.file.buffer);
    
    res.status(200).json({
      message: 'Image uploaded successfully',
      imageUrl: result.secure_url,
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: 'Server error during file upload' });
  }
});

module.exports = router;

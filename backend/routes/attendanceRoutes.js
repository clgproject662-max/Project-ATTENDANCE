const express = require('express');
const router = express.Router();
const {
    getAttendance,
    markAttendance,
    uploadExcel
} = require('../controllers/attendanceController');


const { requireRole, enforceClassScope } = require('../middleware/roleMiddleware');

const { protect } = require('../middleware/authMiddleware');

// Multer setup for Excel uploads
const multer = require('multer');
const path = require('path');
const upload = multer({
  dest: path.join(__dirname, '../../uploads'),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') cb(null, true);
    else cb(new Error('Only .xlsx/.xls files allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.use(protect);

router.get('/', enforceClassScope, getAttendance);
router.post('/mark', enforceClassScope, markAttendance);
router.post('/upload', requireRole('staff'), upload.single('file'), uploadExcel);


module.exports = router;

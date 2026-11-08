const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    getStudents,
    addStudent,
    batchAddStudents,
    uploadExcel,
    deleteStudent,
    updateStudent
} = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole, enforceClassScope } = require('../middleware/roleMiddleware');

// Configure multer for in-memory file parsing
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel' ||
            file.originalname.match(/\.(xlsx|xls)$/i)
        ) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files (.xlsx, .xls) are permitted'), false);
        }
    }
});

router.use(protect);

router.get('/', enforceClassScope, getStudents);
router.post('/', requireRole('admin'), upload.single('photo'), addStudent);
router.post('/register', requireRole('admin'), addStudent);
router.post('/batch', enforceClassScope, batchAddStudents);
router.post('/upload', upload.single('file'), enforceClassScope, uploadExcel);
router.put('/:id', requireRole('admin', 'staff'), enforceClassScope, updateStudent);
router.delete('/:id', requireRole('admin','staff'), enforceClassScope, deleteStudent);

module.exports = router;

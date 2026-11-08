const express = require('express');
const router = express.Router();
const {
    getAttendanceReport,
    getClassStudents,
    deleteClassData,
    getClassSummary,
    getDailyReport
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole, enforceClassScope } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/attendance', enforceClassScope, getAttendanceReport);
router.get('/students', enforceClassScope, getClassStudents);
router.get('/class/summary', requireRole('admin'), getClassSummary);
router.delete('/class', requireRole('admin'), deleteClassData);
router.get('/daily', requireRole('admin'), getDailyReport);

module.exports = router;

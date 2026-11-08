const Attendance = require('../models/Attendance');
const Student = require('../models/Student');

/**
 * @desc    Get attendance records for a specific date and class
 * @route   GET /api/attendance
 * @access  Private
 */
const getAttendance = async (req, res) => {
    try {
        const { date, department, year } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Attendance date is required (YYYY-MM-DD)'
            });
        }

        const targetDept = (req.user.role === 'staff') ? req.user.department : (department || req.user.department);
        const targetYear = (req.user.role === 'staff' && req.user.year !== 'All') ? req.user.year : (year || '1');

        const records = await Attendance.find({
            date: date.trim(),
            department: targetDept,
            year: targetYear
        });

        res.status(200).json({
            success: true,
            date,
            department: targetDept,
            year: targetYear,
            count: records.length,
            records
        });
    } catch (error) {
        console.error('getAttendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve attendance records',
            error: error.message
        });
    }
};

/**
 * @desc    Mark or update attendance (batch or individual)
 * @route   POST /api/attendance/mark
 * @access  Private
 */
const markAttendance = async (req, res) => {
    try {
        const { date, department, year, records, studentId, status } = req.body;

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Attendance date is required (YYYY-MM-DD)'
            });
        }

        const targetDept = (req.user.role === 'staff') ? req.user.department : (department || req.user.department);
        const targetYear = (req.user.role === 'staff' && req.user.year !== 'All') ? req.user.year : (year || '1');

        // Case A: Batch save (array of records)
        if (Array.isArray(records)) {
            const bulkOps = records.map(rec => {
                const sId = String(rec.studentId || rec.id || '').trim().toUpperCase();
                const sStatus = rec.status === 'absent' ? 'absent' : 'present';
                return {
                    updateOne: {
                        filter: {
                            studentId: sId,
                            date: date.trim(),
                            department: targetDept,
                            year: targetYear
                        },
                        update: {
                            $set: {
                                status: sStatus,
                                studentName: rec.studentName || rec.name || '',
                                recordedBy: req.user._id
                            }
                        },
                        upsert: true
                    }
                };
            }).filter(op => op.updateOne.filter.studentId);

            if (bulkOps.length > 0) {
                await Attendance.bulkWrite(bulkOps);
            }

            return res.status(200).json({
                success: true,
                message: `Attendance saved for ${bulkOps.length} students on ${date}`,
                date,
                department: targetDept,
                year: targetYear
            });
        }

        // Case B: Single student mark/toggle
        if (studentId && status) {
            const normId = String(studentId).trim().toUpperCase();
            const normStatus = status === 'absent' ? 'absent' : 'present';

            const record = await Attendance.findOneAndUpdate(
                {
                    studentId: normId,
                    date: date.trim(),
                    department: targetDept,
                    year: targetYear
                },
                {
                    status: normStatus,
                    recordedBy: req.user._id
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            return res.status(200).json({
                success: true,
                message: `Attendance updated for ${normId}: ${normStatus}`,
                record
            });
        }

        return res.status(400).json({
            success: false,
            message: 'Provide either records array or studentId and status'
        });
    } catch (error) {
        console.error('markAttendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record attendance',
            error: error.message
        });
    }
};

/**
 * @desc    Upload Excel with student details and attendance
 * @route   POST /api/attendance/upload
 * @access  Private (staff only)
 */
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const uploadExcel = async (req, res) => {
    try {
        // Ensure a file was uploaded by multer
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No Excel file uploaded' });
        }
        const { department, year } = req.body;
        if (!department || !year) {
            return res.status(400).json({ success: false, message: 'Department and year are required' });
        }
        // Load workbook
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const sheet = workbook.worksheets[0];
        const rows = sheet.getRows(2, sheet.rowCount - 1) || [];
        let insertedStudents = 0;
        let updatedStudents = 0;
        let insertedAttendance = 0;
        for (const row of rows) {
            if (!row) continue;
            const values = row.values.slice(1); // drop first empty index
            // Expect columns: RegNo, Name, Date, Status, Notes (order may vary)
            const id = String(values[0] || '').trim();
            const name = String(values[1] || '').trim();
            const dateVal = values[2];
            const statusRaw = String(values[3] || '').trim().toLowerCase();
            const notes = String(values[4] || '').trim();
            if (!id) continue; // skip rows without an ID
            // ---- Student ----
            let student = await Student.findOne({ studentId: id, department, year });
            if (student) {
                if (name && student.studentName !== name) {
                    await Student.updateOne({ _id: student._id }, { studentName: name });
                    updatedStudents++;
                }
            } else {
                student = await Student.create({ studentId: id, studentName: name, department, year });
                insertedStudents++;
            }
            // ---- Attendance ----
            const attDate = dateVal instanceof Date ? dateVal : new Date(dateVal);
            const status = statusRaw === 'absent' ? 'absent' : 'present';
            await Attendance.create({
                studentId: student._id,
                department,
                year,
                date: attDate,
                status,
                notes,
                recordedBy: req.user._id,
            });
            insertedAttendance++;
        }
        // Clean up uploaded file
        fs.unlink(req.file.path, err => { if (err) console.warn('Failed to delete upload', err); });
        res.json({
            success: true,
            message: 'Excel processed',
            stats: { insertedStudents, updatedStudents, insertedAttendance }
        });
    } catch (err) {
        console.error('uploadExcel error:', err);
        res.status(500).json({ success: false, message: 'Failed to process Excel', error: err.message });
    }
};

module.exports = {
    getAttendance,
    markAttendance,
    uploadExcel
};
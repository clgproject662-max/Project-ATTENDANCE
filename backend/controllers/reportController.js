const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const { deleteFile } = require('../utils/gridFS');
const { sortStudentsByRollNumber } = require('../utils/rollNumberHelper');

/**
 * @desc    Generate daily attendance report across all departments and years
 * @route   GET /api/reports/daily
 * @access  Private (Admin only)
 */
const getDailyReport = async (req, res) => {
    try {
        const { date } = req.query;

        // Validate date parameter
        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Date is required (YYYY-MM-DD format)'
            });
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                message: 'Date must be in YYYY-MM-DD format'
            });
        }

        // Define departments and years (Information Technology, Tamil, and English removed for now)
        const departments = ['Computer Science'];
        const years = ['1', '2', '3'];

        const dailyReport = [];
        let serialNumber = 1;

        // Generate report for each department and year
        for (const department of departments) {
            for (const year of years) {
                // Get total enrolled students for this class
                const totalStudents = await Student.countDocuments({
                    department: department,
                    year: year,
                    status: 'active'
                });

                if (totalStudents === 0) {
                    // Skip classes with no enrolled students
                    continue;
                }

                // Get attendance records for this class on the specified date
                const attendanceRecords = await Attendance.find({
                    department: department,
                    year: year,
                    date: date
                });

                // Check if attendance has been recorded for this class on this date
                const hasAttendanceRecords = attendanceRecords.length > 0;

                if (!hasAttendanceRecords) {
                    // No attendance recorded - show as "No attendance recorded"
                    dailyReport.push({
                        serialNo: serialNumber++,
                        department: department,
                        classYear: `${year}${getYearSuffix(year)} Year`,
                        present: 'No attendance recorded',
                        absent: 'No attendance recorded',
                        percentage: 'No attendance recorded',
                        totalStudents: totalStudents
                    });
                } else {
                    // Calculate present and absent counts
                    const presentCount = attendanceRecords.filter(record => record.status === 'present').length;
                    const absentCount = attendanceRecords.filter(record => record.status === 'absent').length;
                    
                    // Calculate percentage based on total enrolled students
                    const percentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

                    dailyReport.push({
                        serialNo: serialNumber++,
                        department: department,
                        classYear: `${year}${getYearSuffix(year)} Year`,
                        present: presentCount,
                        absent: absentCount,
                        percentage: `${percentage}%`,
                        totalStudents: totalStudents
                    });
                }
            }
        }

        res.status(200).json({
            success: true,
            date: date,
            reportData: dailyReport,
            totalClasses: dailyReport.length
        });

    } catch (error) {
        console.error('getDailyReport error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate daily report',
            error: error.message
        });
    }
};

/**
 * Helper function to get year suffix (st, nd, rd, th)
 */
function getYearSuffix(year) {
    switch(year) {
        case '1': return 'st';
        case '2': return 'nd';
        case '3': return 'rd';
        default: return 'th';
    }
}

/**
 * @desc    Generate attendance summary report for class within date range
 * @route   GET /api/reports/attendance
 * @access  Private
 */
const getAttendanceReport = async (req, res) => {
    try {
        const { department, year, from, to } = req.query;

        const targetDept = (req.user.role === 'staff') ? req.user.department : department;
        const targetYear = (req.user.role === 'staff' && req.user.year !== 'All') ? req.user.year : year;

        if (!targetDept || !targetYear) {
            return res.status(400).json({
                success: false,
                message: 'Department and Year are required'
            });
        }

        if (!from || !to) {
            return res.status(400).json({
                success: false,
                message: 'Start date (from) and End date (to) are required (YYYY-MM-DD)'
            });
        }

        if (from > to) {
            return res.status(400).json({
                success: false,
                message: 'From date cannot be after To date'
            });
        }

        // 1. Fetch all enrolled active students in class
        const rawStudents = await Student.find({
            department: targetDept,
            year: targetYear,
            status: 'active'
        }).collation({ locale: 'en', numericOrdering: true }).sort({ studentId: 1 }).lean();

        const students = sortStudentsByRollNumber(rawStudents);

        if (students.length === 0) {
            return res.status(200).json({
                success: true,
                message: `No active students found for ${targetDept} Year ${targetYear}`,
                totalStudents: 0,
                totalRecordedDays: 0,
                report: []
            });
        }

        // 2. Fetch all attendance records in date range
        const attendanceRecords = await Attendance.find({
            department: targetDept,
            year: targetYear,
            date: { $gte: from.trim(), $lte: to.trim() }
        });

        // 3. Determine unique recorded dates
        const recordedDatesSet = new Set(attendanceRecords.map(r => r.date));
        let totalTrackedDays = recordedDatesSet.size;

        // Fallback: If no explicit attendance was recorded, calculate weekdays count
        if (totalTrackedDays === 0) {
            let count = 0;
            let cur = new Date(from);
            const end = new Date(to);
            while (cur <= end) {
                const day = cur.getDay();
                if (day !== 0 && day !== 6) count++;
                cur.setDate(cur.getDate() + 1);
            }
            totalTrackedDays = count > 0 ? count : 1;
        }

        // 4. Calculate individual student attendance metrics
        const report = students.map((s, idx) => {
            const sId = s.studentId.trim().toUpperCase();

            const studentRecords = attendanceRecords.filter(r =>
                r.studentId.trim().toUpperCase() === sId
            );

            // Explicit absent records
            const absentDays = studentRecords.filter(r => r.status === 'absent').length;

            const effectiveTotal = Math.max(totalTrackedDays, absentDays);
            const presentDays = Math.max(0, effectiveTotal - absentDays);

            const percentage = effectiveTotal > 0
                ? Math.round((presentDays / effectiveTotal) * 100)
                : 100;

            return {
                serial: idx + 1,
                studentId: s.studentId,
                studentName: s.studentName,
                totalDays: effectiveTotal,
                present: presentDays,
                absent: absentDays,
                percentage
            };
        });

        res.status(200).json({
            success: true,
            department: targetDept,
            year: targetYear,
            from,
            to,
            totalStudents: students.length,
            totalRecordedDays: totalTrackedDays,
            report
        });
    } catch (error) {
        console.error('getAttendanceReport error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate attendance report',
            error: error.message
        });
    }
};

/**
 * @desc    View all enrolled students for class (Student Data button in report)
 * @route   GET /api/reports/students
 * @access  Private
 */
const getClassStudents = async (req, res) => {
    try {
        const { department, year } = req.query;

        const targetDept = (req.user.role === 'staff') ? req.user.department : department;
        const targetYear = (req.user.role === 'staff' && req.user.year !== 'All') ? req.user.year : year;

        if (!targetDept || !targetYear) {
            return res.status(400).json({
                success: false,
                message: 'Department and Year are required'
            });
        }

        const rawStudents = await Student.find({
            department: targetDept,
            year: targetYear,
            status: 'active'
        }).collation({ locale: 'en', numericOrdering: true }).sort({ studentId: 1 }).lean();

        const students = sortStudentsByRollNumber(rawStudents);
        students.forEach((s, idx) => {
            s.serial = idx + 1;
        });

        res.status(200).json({
            success: true,
            department: targetDept,
            year: targetYear,
            count: students.length,
            students
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve class student data',
            error: error.message
        });
    }
};

/**
 * @desc    Count students and attendance records for a class (Admin Only)
 * @route   GET /api/reports/class/summary
 * @access  Private (Admin Only)
 */
const getClassSummary = async (req, res) => {
    try {
        const department = String(req.query.department || '').trim();
        const rawYear = String(req.query.year || '').trim();

        if (!department) {
            return res.status(400).json({
                success: false,
                message: 'Department is required'
            });
        }

        const filter = { department };
        if (rawYear && rawYear.toLowerCase() !== 'all') {
            filter.year = rawYear;
        }

        const [studentCount, attendanceCount] = await Promise.all([
            Student.countDocuments(filter),
            Attendance.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            department,
            year: filter.year || 'All',
            studentCount,
            attendanceCount
        });
    } catch (error) {
        console.error('getClassSummary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load class summary',
            error: error.message
        });
    }
};

/**
 * @desc    Delete all students and attendance for a class (Admin Only)
 * @route   DELETE /api/reports/class
 * @access  Private (Admin Only)
 */
const deleteClassData = async (req, res) => {
    try {
        const body = req.body || {};
        const department = String(body.department || '').trim();
        const rawYear = String(body.year || '').trim();

        if (!department) {
            return res.status(400).json({
                success: false,
                message: 'Department is required to delete class data'
            });
        }

        // A specific year deletes that class only; "All"/empty deletes the whole department.
        const deleteYear = rawYear && rawYear.toLowerCase() !== 'all' ? rawYear : null;

        const filter = { department };
        if (deleteYear) {
            filter.year = deleteYear;
        }

        // Collect stored photos so they can be removed from GridFS too
        const studentsToDelete = await Student.find(filter).select('photoId').lean();
        const photoIds = studentsToDelete.map(s => s.photoId).filter(Boolean);

        const studentDeleteResult = await Student.deleteMany(filter);
        const attendanceDeleteResult = await Attendance.deleteMany(filter);

        for (const photoId of photoIds) {
            try {
                await deleteFile(photoId);
            } catch (photoError) {
                console.warn('Could not delete student photo:', photoId.toString(), photoError.message);
            }
        }

        const scopeText = deleteYear ? `${department} Year ${deleteYear}` : `${department} (all years)`;

        res.status(200).json({
            success: true,
            message: `Deleted ${studentDeleteResult.deletedCount} students and ${attendanceDeleteResult.deletedCount} attendance records for ${scopeText}`,
            department,
            year: deleteYear || 'All',
            deletedStudents: studentDeleteResult.deletedCount,
            deletedAttendance: attendanceDeleteResult.deletedCount
        });
    } catch (error) {
        console.error('deleteClassData error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete class data',
            error: error.message
        });
    }
};

module.exports = {
    getAttendanceReport,
    getClassStudents,
    deleteClassData,
    getClassSummary,
    getDailyReport
};

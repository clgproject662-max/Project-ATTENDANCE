const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: false
        },
        studentId: {
            type: String,
            required: [true, 'Student register number is required'],
            trim: true,
            uppercase: true
        },
        studentName: {
            type: String,
            trim: true,
            default: ''
        },
        date: {
            type: String, // Format: YYYY-MM-DD
            required: [true, 'Attendance date is required'],
            match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD']
        },
        department: {
            type: String,
            required: [true, 'Department is required'],
            trim: true
        },
        year: {
            type: String,
            required: [true, 'Year is required'],
            trim: true
        },
        status: {
            type: String,
            enum: ['present', 'absent'],
            required: [true, 'Status must be present or absent']
        },
        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    {
        timestamps: true
    }
);

// Prevent duplicate attendance for the same student on the same date within a class
attendanceSchema.index({ studentId: 1, date: 1, department: 1, year: 1 }, { unique: true });

// Index for high-performance date-range report queries
attendanceSchema.index({ department: 1, year: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);

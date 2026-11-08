const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
    {
        studentName: {
            type: String,
            required: [true, 'Student name is required'],
            trim: true
        },
        studentId: {
            type: String,
            required: [true, 'Student register number/ID is required'],
            trim: true,
            uppercase: true
        },
        serial: {
            type: Number,
            default: 1
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
            enum: ['active', 'inactive'],
            default: 'active'
        },
        /** GridFS file reference for the student's photo */
        photoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "fs.files",
            default: null
        },
        email: {
            type: String,
            trim: true,
            lowercase: true
        },
        phone: {
            type: String,
            trim: true
        },
        dateOfBirth: {
            type: Date
        },
        address: {
            type: String,
            trim: true
        },
        parentName: {
            type: String,
            trim: true
        },
        parentPhone: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

// Prevent duplicate studentId in the same department and year
studentSchema.index({ studentId: 1, department: 1, year: 1 }, { unique: true });
// Optimize class queries sorted by roll number
studentSchema.index({ department: 1, year: 1, studentId: 1 });

module.exports = mongoose.model('Student', studentSchema);

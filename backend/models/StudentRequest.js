const mongoose = require('mongoose');

const studentRequestSchema = new mongoose.Schema(
    {
        staffId: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'User',
            default: null
        },
        studentRegisterNumber: {
            type: String,
            trim: true,
            uppercase: true
        },
        studentId: {
            type: String,
            trim: true,
            uppercase: true
        },
        studentName: {
            type: String,
            required: [true, 'Student name is required'],
            trim: true
        },
        department: {
            type: String,
            required: [true, 'Department is required'],
            trim: true
        },
        academicYear: {
            type: String,
            enum: ['1', '2', '3']
        },
        year: {
            type: String,
            enum: ['1', '2', '3']
        },
        classId: {
            type: String,
            trim: true
        },
        section: {
            type: String,
            trim: true,
            default: ''
        },
        phone: {
            type: String,
            trim: true,
            default: ''
        },
        parentPhone: {
            type: String,
            trim: true,
            default: ''
        },
        photo: {
            type: String,
            trim: true,
            default: ''
        },
        photoUrl: {
            type: String,
            trim: true,
            default: ''
        },
        reason: {
            type: String,
            trim: true,
            default: ''
        },
        requestedBy: {
            type: String,
            required: [true, 'Requester information is required'],
            trim: true
        },
        requestedByName: {
            type: String,
            required: [true, 'Requester name is required'],
            trim: true
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'completed'],
            default: 'pending',
            lowercase: true
        },
        rejectionReason: {
            type: String,
            trim: true,
            default: ''
        },
        adminRemarks: {
            type: String,
            trim: true,
            default: ''
        },
        reviewedBy: {
            type: String,
            trim: true,
            default: null
        },
        reviewedAt: {
            type: Date,
            default: null
        },
        approvedBy: {
            type: String,
            trim: true,
            default: null
        },
        approvedAt: {
            type: Date,
            default: null
        },
        rejectedBy: {
            type: String,
            trim: true,
            default: null
        },
        rejectedAt: {
            type: Date,
            default: null
        },
        completedStudentId: {
            type: mongoose.Schema.Types.Mixed,
            ref: 'Student',
            default: null
        },
        completedAt: {
            type: Date,
            default: null
        },
        isCompleted: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// Pre-save synchronization hook
studentRequestSchema.pre('save', function (next) {
    if (this.studentRegisterNumber && !this.studentId) {
        this.studentId = this.studentRegisterNumber;
    }
    if (this.studentId && !this.studentRegisterNumber) {
        this.studentRegisterNumber = this.studentId;
    }
    if (this.academicYear && !this.year) {
        this.year = this.academicYear;
    }
    if (this.year && !this.academicYear) {
        this.academicYear = this.year;
    }
    if (this.rejectionReason && !this.adminRemarks) {
        this.adminRemarks = this.rejectionReason;
    }
    if (this.adminRemarks && !this.rejectionReason) {
        this.rejectionReason = this.adminRemarks;
    }
    if (!this.classId && this.department && this.year) {
        const deptPrefix = this.department.toLowerCase().includes('computer') ? 'CS' :
                           this.department.toLowerCase().includes('information') ? 'IT' :
                           this.department.substring(0, 3).toUpperCase();
        this.classId = `${deptPrefix}${this.year}`;
    }
    next();
});

// Indexes for faster queries
studentRequestSchema.index({ requestedBy: 1, status: 1 });
studentRequestSchema.index({ staffId: 1, status: 1 });
studentRequestSchema.index({ studentId: 1, status: 1 });
studentRequestSchema.index({ studentRegisterNumber: 1, status: 1 });
studentRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('StudentRequest', studentRequestSchema);

const StudentRequest = require('../models/StudentRequest');
const Student = require('../models/Student');
const { resequenceClassSerials } = require('../utils/rollNumberHelper');

/**
 * Helper to derive class ID from department and year (e.g., CS1, CS2, CS3)
 */
function getClassId(department, year) {
    if (!department) return `Year${year}`;
    const deptLower = department.toLowerCase();
    if (deptLower.includes('computer')) return `CS${year}`;
    if (deptLower.includes('information')) return `IT${year}`;
    if (deptLower.includes('tamil')) return `TAM${year}`;
    if (deptLower.includes('english')) return `ENG${year}`;
    return `${department.substring(0, 3).toUpperCase()}${year}`;
}

/**
 * @desc    Submit a student registration request
 * @route   POST /api/student-requests or POST /api/student-registration-requests
 * @access  Private (Staff only)
 */
exports.submitRequest = async (req, res) => {
    try {
        const studentName = req.body.studentName || req.body.name;
        const studentId = req.body.studentRegisterNumber || req.body.studentId || req.body.regNo;
        const department = req.body.department;
        const year = String(req.body.academicYear || req.body.year || '').trim();
        const { section, phone, parentPhone, photo, photoUrl, reason } = req.body;

        // 1. Validation of required fields
        if (!studentName || !studentId || !department || !year) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided: Student Register Number, Student Name, Department, Academic Year'
            });
        }

        const normId = studentId.trim().toUpperCase();
        const normDept = department.trim();
        const targetClassId = getClassId(normDept, year);

        // 2. Validate that the requested class belongs to the logged-in Staff member
        if (req.user.role === 'staff') {
            const userDept = (req.user.department || '').trim().toLowerCase();
            const userYear = String(req.user.year || '').trim();

            if (normDept.toLowerCase() !== userDept) {
                return res.status(403).json({
                    success: false,
                    message: `Permission denied: You can only request students for your assigned department (${req.user.department})`
                });
            }

            if (userYear !== 'All' && year !== userYear) {
                return res.status(403).json({
                    success: false,
                    message: `Permission denied: You are assigned to Year ${userYear}. You cannot request registration for Year ${year}`
                });
            }
        }

        // 3. Prevent duplicate register numbers in the main Student collection
        const existingStudent = await Student.findOne({
            studentId: normId
        });

        if (existingStudent) {
            return res.status(400).json({
                success: false,
                message: `Student with Register Number '${normId}' already exists in ${existingStudent.department} (Year ${existingStudent.year})`
            });
        }

        // 4. Prevent duplicate pending requests for the same student and class
        const existingPending = await StudentRequest.findOne({
            $or: [
                { studentId: normId },
                { studentRegisterNumber: normId }
            ],
            status: 'pending'
        });

        if (existingPending) {
            return res.status(400).json({
                success: false,
                message: `A pending registration request for Register Number '${normId}' already exists and is awaiting Admin review.`
            });
        }

        // Check if there's an already approved (but not yet completed) request for this student
        const existingApproved = await StudentRequest.findOne({
            $or: [
                { studentId: normId },
                { studentRegisterNumber: normId }
            ],
            status: 'approved',
            isCompleted: false
        });

        if (existingApproved) {
            return res.status(400).json({
                success: false,
                message: `An approved request already exists for Register Number '${normId}'. Please complete the registration instead of submitting a new request.`
            });
        }

        // 5. Create new request with status 'pending'
        const newRequest = new StudentRequest({
            staffId: req.user._id || req.user.id,
            requestedBy: req.user.username || req.user.id,
            requestedByName: req.user.name || req.user.username,
            studentRegisterNumber: normId,
            studentId: normId,
            studentName: studentName.trim(),
            department: normDept,
            academicYear: year,
            year: year,
            classId: targetClassId,
            section: section ? section.trim() : '',
            phone: phone ? phone.trim() : '',
            parentPhone: parentPhone ? parentPhone.trim() : '',
            photo: photo ? photo.trim() : (photoUrl ? photoUrl.trim() : ''),
            photoUrl: photoUrl ? photoUrl.trim() : (photo ? photo.trim() : ''),
            reason: reason ? reason.trim() : '',
            status: 'pending'
        });

        await newRequest.save();

        res.status(201).json({
            success: true,
            message: 'Student registration request submitted successfully! Awaiting Admin approval.',
            request: newRequest
        });

    } catch (error) {
        console.error('Error submitting student request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit student registration request',
            error: error.message
        });
    }
};

/**
 * @desc    Get logged-in staff's own requests
 * @route   GET /api/student-requests/my-requests or GET /api/student-registration-requests/my
 * @access  Private (Staff)
 */
exports.getMyRequests = async (req, res) => {
    try {
        const username = req.user.username || req.user.id;
        const userId = req.user._id ? String(req.user._id) : String(req.user.id);

        let query = {
            $or: [
                { requestedBy: username },
                { staffId: req.user._id },
                { staffId: req.user.id },
                { staffId: userId }
            ]
        };

        // If staff, also allow matching their assigned department and year
        if (req.user.role === 'staff' && req.user.department) {
            query.$or.push({
                department: req.user.department,
                year: req.user.year
            });
        }

        const requests = await StudentRequest.find(query)
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: requests.length,
            requests
        });

    } catch (error) {
        console.error('Error fetching staff requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch your registration requests',
            error: error.message
        });
    }
};

/**
 * @desc    Get all requests with filters (Admin only)
 * @route   GET /api/student-requests/all or GET /api/student-registration-requests
 * @access  Private (Admin)
 */
exports.getAllRequests = async (req, res) => {
    try {
        const { status, department, year, academicYear, class: classFilter, classId } = req.query;

        let query = {};

        if (status) {
            query.status = status.toLowerCase();
        }

        if (department) {
            query.department = department;
        }

        const filterYear = year || academicYear;
        if (filterYear) {
            query.year = String(filterYear);
        }

        const targetClass = classFilter || classId;
        if (targetClass) {
            query.classId = new RegExp(targetClass, 'i');
        }

        const requests = await StudentRequest.find(query)
            .sort({ createdAt: -1 });

        // Get summary counts across all requests
        const totalRequests = await StudentRequest.countDocuments();
        const pendingRequests = await StudentRequest.countDocuments({ status: 'pending' });
        const approvedRequests = await StudentRequest.countDocuments({ status: 'approved' });
        const rejectedRequests = await StudentRequest.countDocuments({ status: 'rejected' });
        const completedRequests = await StudentRequest.countDocuments({
            $or: [{ status: 'completed' }, { isCompleted: true }]
        });

        res.status(200).json({
            success: true,
            count: requests.length,
            requests,
            summary: {
                total: totalRequests,
                pending: pendingRequests,
                approved: approvedRequests,
                rejected: rejectedRequests,
                completed: completedRequests
            }
        });

    } catch (error) {
        console.error('Error fetching all requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student requests',
            error: error.message
        });
    }
};

/**
 * @desc    Get pending requests (Admin only)
 * @route   GET /api/student-requests/pending
 * @access  Private (Admin)
 */
exports.getPendingRequests = async (req, res) => {
    try {
        const { department, year, classId } = req.query;

        let query = { status: 'pending' };

        if (department) query.department = department;
        if (year) query.year = String(year);
        if (classId) query.classId = classId;

        const requests = await StudentRequest.find(query).sort({ createdAt: -1 });

        const totalRequests = await StudentRequest.countDocuments();
        const pendingRequests = await StudentRequest.countDocuments({ status: 'pending' });
        const approvedRequests = await StudentRequest.countDocuments({ status: 'approved' });
        const rejectedRequests = await StudentRequest.countDocuments({ status: 'rejected' });

        res.status(200).json({
            success: true,
            count: requests.length,
            requests,
            summary: {
                total: totalRequests,
                pending: pendingRequests,
                approved: approvedRequests,
                rejected: rejectedRequests
            }
        });

    } catch (error) {
        console.error('Error fetching pending requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending requests',
            error: error.message
        });
    }
};

/**
 * @desc    Get single request details by ID
 * @route   GET /api/student-requests/:id
 * @access  Private
 */
exports.getRequestById = async (req, res) => {
    try {
        const request = await StudentRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Registration request not found'
            });
        }

        // Access check: Admin can view all; Staff can only view their own
        if (req.user.role === 'staff') {
            const isOwner = (request.requestedBy === req.user.username) ||
                            (String(request.staffId) === String(req.user._id || req.user.id)) ||
                            (request.department === req.user.department && String(request.year) === String(req.user.year));
            if (!isOwner) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: You cannot view requests submitted by other staff members'
                });
            }
        }

        res.status(200).json({
            success: true,
            request
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch request details',
            error: error.message
        });
    }
};

/**
 * @desc    Approve a student registration request (Admin only)
 *          IMPORTANT: Does NOT create the student record yet.
 *          Grants permission to the Staff member to complete registration.
 * @route   PATCH /api/student-requests/:id/approve or PATCH /api/student-registration-requests/:id/approve
 * @access  Private (Admin only)
 */
exports.approveRequest = async (req, res) => {
    try {
        const requestId = req.params.id;
        const { remarks } = req.body;

        const request = await StudentRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Registration request not found'
            });
        }

        // 1. Verify that the request status is pending
        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot approve request: Current status is already '${request.status}'`
            });
        }

        const adminIdentifier = req.user.username || req.user.name || req.user.id || 'Admin';
        const now = new Date();

        // 2. Change status to 'approved' and save reviewer metadata
        request.status = 'approved';
        request.approvedBy = adminIdentifier;
        request.approvedAt = now;
        request.reviewedBy = adminIdentifier;
        request.reviewedAt = now;
        request.adminRemarks = remarks || 'Approved by Admin. Ready for Staff to complete registration.';

        await request.save();

        res.status(200).json({
            success: true,
            message: 'Registration request approved successfully! Staff may now complete registration for their class.',
            request
        });

    } catch (error) {
        console.error('Error approving request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve registration request',
            error: error.message
        });
    }
};

/**
 * @desc    Reject a student registration request (Admin only)
 * @route   PATCH /api/student-requests/:id/reject or PATCH /api/student-registration-requests/:id/reject
 * @access  Private (Admin only)
 */
exports.rejectRequest = async (req, res) => {
    try {
        const requestId = req.params.id;
        const reason = req.body.reason || req.body.rejectionReason || req.body.adminRemarks;

        // Reason is required for rejection
        if (!reason || reason.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Please provide a reason for rejecting the request'
            });
        }

        const request = await StudentRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Registration request not found'
            });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot reject request: Current status is already '${request.status}'`
            });
        }

        const adminIdentifier = req.user.username || req.user.name || req.user.id || 'Admin';
        const now = new Date();

        request.status = 'rejected';
        request.rejectionReason = reason.trim();
        request.adminRemarks = reason.trim();
        request.rejectedBy = adminIdentifier;
        request.rejectedAt = now;
        request.reviewedBy = adminIdentifier;
        request.reviewedAt = now;

        await request.save();

        res.status(200).json({
            success: true,
            message: 'Registration request rejected successfully',
            request
        });

    } catch (error) {
        console.error('Error rejecting request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject registration request',
            error: error.message
        });
    }
};

/**
 * @desc    Complete student registration after Admin approval
 *          Staff can add the requested student to the main Students collection
 *          only after the Admin has approved the corresponding request.
 * @route   POST /api/student-requests/:id/complete-registration or POST /api/student-registration-requests/:id/complete-registration
 * @access  Private (Authorized Staff only)
 */
exports.completeRegistration = async (req, res) => {
    try {
        const requestId = req.params.id;
        const request = await StudentRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Registration request not found'
            });
        }

        // 1. Verify Staff member's identity and assigned class
        if (req.user.role === 'staff') {
            const userDept = (req.user.department || '').trim().toLowerCase();
            const userYear = String(req.user.year || '').trim();

            if (request.department.trim().toLowerCase() !== userDept) {
                return res.status(403).json({
                    success: false,
                    message: `Forbidden: You are only authorized for ${req.user.department}, not ${request.department}`
                });
            }

            if (userYear !== 'All' && String(request.year).trim() !== userYear) {
                return res.status(403).json({
                    success: false,
                    message: `Forbidden: You are only authorized for Year ${userYear}, not Year ${request.year}`
                });
            }

            // Do not let one staff complete another staff's request unless assigned to same class
            const isOwn = (request.requestedBy === req.user.username) ||
                          (String(request.staffId) === String(req.user._id || req.user.id)) ||
                          (request.department.toLowerCase() === userDept && String(request.year) === userYear);
            if (!isOwn) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: You cannot complete registration for another staff member\'s request'
                });
            }
        }

        // 2. Verify that the request is Approved
        if (request.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: `Cannot complete registration: Request status is '${request.status}'. Only 'Approved' requests can be registered.`
            });
        }

        // 3. Verify that the request has not already been used / completed
        if (request.isCompleted || request.completedStudentId) {
            return res.status(400).json({
                success: false,
                message: 'Registration has already been completed for this approved request.'
            });
        }

        const regNo = (req.body.studentRegisterNumber || req.body.studentId || request.studentRegisterNumber || request.studentId).trim().toUpperCase();
        const sName = (req.body.studentName || request.studentName).trim();
        const sDept = request.department;
        const sYear = request.year;

        // 4. Prevent duplicate register number in main Students collection
        const existingStudent = await Student.findOne({
            studentId: regNo,
            department: sDept,
            year: sYear
        });

        if (existingStudent) {
            // If already created, link and mark completed safely
            request.completedStudentId = existingStudent._id;
            request.completedAt = new Date();
            request.isCompleted = true;
            await request.save();

            return res.status(400).json({
                success: false,
                message: `Student with Register Number '${regNo}' is already registered in ${sDept} (Year ${sYear}).`
            });
        }

        const assignSerial = Number(req.body.serial) || 1;

        // 6. Create the student record in MongoDB
        const student = await Student.create({
            studentName: sName,
            studentId: regNo,
            serial: 1,
            department: sDept,
            year: sYear,
            section: req.body.section !== undefined ? req.body.section.trim() : request.section,
            phone: req.body.phone !== undefined ? req.body.phone.trim() : request.phone,
            parentPhone: req.body.parentPhone !== undefined ? req.body.parentPhone.trim() : request.parentPhone,
            photo: req.body.photo || request.photo || request.photoUrl || '',
            status: 'active'
        });

        // Re-sequence class serials so stored serials match the ascending roll number sequence
        await resequenceClassSerials(Student, sDept, sYear);

        // 7. Link the registered student to the original request & mark as completed
        request.completedStudentId = student._id;
        request.completedAt = new Date();
        request.isCompleted = true;
        await request.save();

        res.status(201).json({
            success: true,
            message: `Student '${student.studentName}' (${student.studentId}) successfully registered for ${sDept} Year ${sYear}!`,
            student,
            request
        });

    } catch (error) {
        console.error('Error completing student registration:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete student registration',
            error: error.message
        });
    }
};

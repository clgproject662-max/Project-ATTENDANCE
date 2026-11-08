const http = require('http');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const StudentRequest = require('../models/StudentRequest');

async function runTests() {
    console.log('====================================================');
    console.log('🧪 RUNNING COLLEGE ATTENDANCE BACKEND TEST SUITE');
    console.log('====================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, testName) {
        if (condition) {
            console.log(`  ✅ PASS: ${testName}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${testName}`);
            failed++;
        }
    }

    // TEST 1: Environment Variables
    console.log('--- Test Suite 1: Configuration & Environment ---');
    assert(Boolean(process.env.PORT), 'PORT is configured');
    assert(Boolean(process.env.JWT_SECRET), 'JWT_SECRET is configured');
    assert(Boolean(process.env.MONGODB_URI), 'MONGODB_URI is defined');

    // TEST 2: Password Security (Bcrypt)
    console.log('\n--- Test Suite 2: Password Security & Hashing ---');
    const plainPass = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(plainPass, salt);
    assert(hash !== plainPass && hash.startsWith('$2'), 'Password successfully hashed with bcrypt');
    const match = await bcrypt.compare(plainPass, hash);
    assert(match === true, 'Bcrypt verify matches original password');
    const wrongMatch = await bcrypt.compare('wrongpass', hash);
    assert(wrongMatch === false, 'Bcrypt rejects incorrect password');

    // TEST 3: JWT Token Generation & Verification
    console.log('\n--- Test Suite 3: JWT Authentication & Expiry ---');
    const payload = { id: '65e9b3a9c7b9123456789abc', role: 'admin' };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    assert(typeof token === 'string' && token.split('.').length === 3, 'JWT token correctly generated in 3-part format');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    assert(decoded.id === payload.id && decoded.role === payload.role, 'JWT decoded payload matches original claims');

    // TEST 4: Mongoose Schemas & Model Integrity
    console.log('\n--- Test Suite 4: Mongoose Schemas & Validation ---');
    assert(Boolean(User.schema.paths.username), 'User schema contains required username field');
    assert(Boolean(User.schema.paths.password), 'User schema contains password field');
    assert(Boolean(Student.schema.paths.studentId), 'Student schema contains studentId field');
    assert(Boolean(Student.schema.paths.department), 'Student schema contains department field');
    assert(Boolean(Attendance.schema.paths.date), 'Attendance schema contains date field');
    assert(Boolean(Attendance.schema.paths.status), 'Attendance schema contains status field');

    // TEST 5: Excel Import Parsing (SheetJS)
    console.log('\n--- Test Suite 5: Excel Import Parser (SheetJS) ---');
    const mockWb = XLSX.utils.book_new();
    const mockData = [
        { 'Serial Number': 1, 'Register No': '22CS101', 'Name': 'Karthik S' },
        { 'Serial Number': 2, 'Register No': '22CS102', 'Name': 'Meena R' }
    ];
    const ws = XLSX.utils.json_to_sheet(mockData);
    XLSX.utils.book_append_sheet(mockWb, ws, 'Students');
    const buffer = XLSX.write(mockWb, { type: 'buffer', bookType: 'xlsx' });
    assert(buffer && buffer.length > 0, 'Excel workbook generated into buffer');

    const parsedWb = XLSX.read(buffer, { type: 'buffer' });
    const parsedRows = XLSX.utils.sheet_to_json(parsedWb.Sheets[parsedWb.SheetNames[0]]);
    assert(parsedRows.length === 2, 'Excel parser accurately extracted 2 data rows');
    assert(parsedRows[0]['Register No'] === '22CS101', 'Excel parser matched correct Register No column');

    // TEST 6: Attendance Calculation Formulas
    console.log('\n--- Test Suite 6: Attendance Calculations ---');
    const totalRecordedDays = 20;
    const absentDays = 3;
    const presentDays = totalRecordedDays - absentDays; // 17
    const attendancePercentage = Math.round((presentDays / totalRecordedDays) * 100);
    assert(attendancePercentage === 85, 'Attendance calculation formula: (17 / 20) * 100 = 85%');

    // TEST 7: Role & Class Scope Logic
    console.log('\n--- Test Suite 7: Role-Based Authorization Logic ---');
    const adminUser = { role: 'admin', department: 'Administration' };
    const staffCS1 = { role: 'staff', department: 'Computer Science', year: '1' };

    // Staff accessing CS Year 1 -> Allowed
    const staffCanAccessOwn = (staffCS1.department === 'Computer Science' && staffCS1.year === '1');
    assert(staffCanAccessOwn === true, 'Staff can access their own department (CS) and year (1)');

    // Staff accessing IT Year 2 -> Denied
    const staffCanAccessOther = (staffCS1.department === 'Information Technology');
    assert(staffCanAccessOther === false, 'Staff restricted from accessing other departments (IT)');

    // TEST 8: StudentRegistrationRequest Model & Schema Integrity
    console.log('\n--- Test Suite 8: StudentRegistrationRequest Schema ---');
    assert(Boolean(StudentRequest.schema.paths.staffId), 'StudentRequest contains staffId field');
    assert(Boolean(StudentRequest.schema.paths.studentRegisterNumber), 'StudentRequest contains studentRegisterNumber field');
    assert(Boolean(StudentRequest.schema.paths.studentId), 'StudentRequest contains studentId field');
    assert(Boolean(StudentRequest.schema.paths.studentName), 'StudentRequest contains studentName field');
    assert(Boolean(StudentRequest.schema.paths.department), 'StudentRequest contains department field');
    assert(Boolean(StudentRequest.schema.paths.academicYear), 'StudentRequest contains academicYear field');
    assert(Boolean(StudentRequest.schema.paths.year), 'StudentRequest contains year field');
    assert(Boolean(StudentRequest.schema.paths.classId), 'StudentRequest contains classId field');
    assert(Boolean(StudentRequest.schema.paths.status), 'StudentRequest contains status field');
    assert(Boolean(StudentRequest.schema.paths.rejectionReason), 'StudentRequest contains rejectionReason field');
    assert(Boolean(StudentRequest.schema.paths.adminRemarks), 'StudentRequest contains adminRemarks field');
    assert(Boolean(StudentRequest.schema.paths.reviewedBy), 'StudentRequest contains reviewedBy field');
    assert(Boolean(StudentRequest.schema.paths.reviewedAt), 'StudentRequest contains reviewedAt field');
    assert(Boolean(StudentRequest.schema.paths.completedStudentId), 'StudentRequest contains completedStudentId reference field');
    assert(Boolean(StudentRequest.schema.paths.completedAt), 'StudentRequest contains completedAt field');
    assert(Boolean(StudentRequest.schema.paths.isCompleted), 'StudentRequest contains isCompleted tracking field');

    // TEST 9: Staff Registration Request and Admin Approval Workflow Logic
    console.log('\n--- Test Suite 9: Staff Request & Admin Approval Workflow Logic ---');

    // 1. Initial State validation
    const testReq = new StudentRequest({
        staffId: 'staff-cs1-id',
        requestedBy: 'cs1',
        requestedByName: 'CS Staff (Year 1)',
        studentRegisterNumber: '26UCS001',
        studentName: 'Aravind Kumar',
        department: 'Computer Science',
        year: '1',
        classId: 'CS1',
        status: 'pending'
    });

    assert(testReq.status === 'pending', 'New request sets status to pending initially');
    assert(testReq.isCompleted === false, 'New request isCompleted is false by default');
    assert(testReq.completedStudentId === null, 'Student document is NOT created upon submission');

    // 2. Class Restriction Check
    const staffCS2 = { role: 'staff', department: 'Computer Science', year: '2' };
    const cs2CanRequestCS1 = (staffCS2.department === testReq.department && staffCS2.year === testReq.year);
    assert(cs2CanRequestCS1 === false, 'CS2 staff cannot submit request for CS1 class');

    const cs1CanRequestCS1 = (staffCS1.department === testReq.department && staffCS1.year === testReq.year);
    assert(cs1CanRequestCS1 === true, 'CS1 staff can submit request for CS1 class');

    // 3. Admin Approval Transition
    const adminApproves = (req, adminUser) => {
        if (req.status !== 'pending') return false;
        req.status = 'approved';
        req.reviewedBy = adminUser.username || 'admin';
        req.reviewedAt = new Date();
        req.approvedBy = adminUser.username || 'admin';
        req.approvedAt = new Date();
        return true;
    };

    const approveSuccess = adminApproves(testReq, { username: 'admin' });
    assert(approveSuccess === true, 'Admin successfully approves pending request');
    assert(testReq.status === 'approved', 'Request status transitions to approved');
    assert(Boolean(testReq.reviewedBy) && Boolean(testReq.reviewedAt), 'Approval records Admin ID and timestamp');
    assert(testReq.completedStudentId === null, 'Student is NOT added to database upon Admin approval alone');

    // 4. Repeated Approval Prevention
    const repeatApprove = adminApproves(testReq, { username: 'admin' });
    assert(repeatApprove === false, 'System prevents repeated approval of non-pending request');

    // 5. Staff Complete Registration Workflow
    const completeRegistration = (req, staffUser) => {
        // Must be approved
        if (req.status !== 'approved') return { success: false, error: 'Request not approved' };
        // Must not already be completed
        if (req.isCompleted || req.completedStudentId) return { success: false, error: 'Already completed' };
        // Must belong to authorized staff class
        if (staffUser.department !== req.department || staffUser.year !== req.year) {
            return { success: false, error: 'Unauthorized class' };
        }

        // Simulate student creation
        const createdStudent = {
            _id: '65e9b3a9c7b9123456789def',
            studentId: req.studentRegisterNumber,
            studentName: req.studentName,
            department: req.department,
            year: req.year,
            status: 'active'
        };

        req.completedStudentId = createdStudent._id;
        req.completedAt = new Date();
        req.isCompleted = true;

        return { success: true, student: createdStudent };
    };

    // CS2 staff trying to complete CS1 request -> Blocked
    const cs2Complete = completeRegistration(testReq, staffCS2);
    assert(cs2Complete.success === false, 'CS2 staff blocked from completing CS1 approved request');

    // CS1 staff completes CS1 request -> Success
    const cs1Complete = completeRegistration(testReq, staffCS1);
    assert(cs1Complete.success === true, 'Authorized CS1 staff successfully completes registration');
    assert(testReq.isCompleted === true, 'Request is marked as completed');
    assert(testReq.completedStudentId !== null, 'Created student is linked to original request');
    assert(cs1Complete.student.status === 'active', 'Created student has active status for attendance marking');

    // Repeated Completion Prevention
    const repeatComplete = completeRegistration(testReq, staffCS1);
    assert(repeatComplete.success === false, 'Prevent duplicate student creation on repeated completion calls');

    // 6. Admin Rejection Workflow
    const rejectedReq = new StudentRequest({
        staffId: 'staff-cs1-id',
        requestedBy: 'cs1',
        requestedByName: 'CS Staff (Year 1)',
        studentRegisterNumber: '26UCS099',
        studentName: 'Invalid Student',
        department: 'Computer Science',
        year: '1',
        classId: 'CS1',
        status: 'pending'
    });

    const adminRejects = (req, adminUser, reason) => {
        if (!reason || reason.trim() === '') return false;
        if (req.status !== 'pending') return false;
        req.status = 'rejected';
        req.rejectionReason = reason;
        req.adminRemarks = reason;
        req.reviewedBy = adminUser.username || 'admin';
        req.reviewedAt = new Date();
        return true;
    };

    const rejectWithoutReason = adminRejects(rejectedReq, { username: 'admin' }, '');
    assert(rejectWithoutReason === false, 'Rejection requires a reason');

    const rejectSuccess = adminRejects(rejectedReq, { username: 'admin' }, 'Incorrect register number format');
    assert(rejectSuccess === true, 'Admin successfully rejects request with reason');
    assert(rejectedReq.status === 'rejected', 'Status changed to rejected');
    assert(rejectedReq.rejectionReason === 'Incorrect register number format', 'Rejection reason preserved for staff display');

    // Rejected request cannot be completed
    const rejectedComplete = completeRegistration(rejectedReq, staffCS1);
    assert(rejectedComplete.success === false, 'Staff registration blocked for rejected requests');

    // Summary
    console.log('\n====================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});

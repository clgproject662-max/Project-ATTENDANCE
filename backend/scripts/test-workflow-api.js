const express = require('express');
const studentRequestRoutes = require('../routes/studentRequestRoutes');
const StudentRequest = require('../models/StudentRequest');
const Student = require('../models/Student');

async function testWorkflowEndpoints() {
    console.log('====================================================');
    console.log('🧪 TESTING EXPRESS ROUTE CONTROLLERS & WORKFLOW');
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

    // Mock Express app
    const app = express();
    app.use(express.json());
    app.use('/api/student-requests', studentRequestRoutes);

    // Mock in-memory store
    const mockDb = {
        requests: [],
        students: []
    };

    // Override Mongoose methods for testing
    StudentRequest.findOne = async (query) => {
        if (query.studentId || (query.$or && query.$or.some(c => c.studentId))) {
            const id = query.studentId || query.$or.find(c => c.studentId).studentId;
            return mockDb.requests.find(r => (r.studentId === id || r.studentRegisterNumber === id) && (!query.status || r.status === query.status)) || null;
        }
        return null;
    };

    StudentRequest.find = (query = {}) => {
        return {
            sort: () => {
                let res = [...mockDb.requests];
                if (query.status) {
                    res = res.filter(r => r.status === query.status);
                }
                if (query.$or) {
                    res = res.filter(r => {
                        return query.$or.some(cond => {
                            if (cond.requestedBy && r.requestedBy === cond.requestedBy) return true;
                            if (cond.staffId && r.staffId === cond.staffId) return true;
                            if (cond.department && r.department === cond.department && String(r.year) === String(cond.year)) return true;
                            return false;
                        });
                    });
                }
                return Promise.resolve(res);
            }
        };
    };

    StudentRequest.countDocuments = async (query = {}) => {
        if (!query.status) return mockDb.requests.length;
        return mockDb.requests.filter(r => r.status === query.status).length;
    };

    StudentRequest.findById = async (id) => {
        return mockDb.requests.find(r => r._id === id) || null;
    };

    Student.findOne = async (query) => {
        return mockDb.students.find(s => s.studentId === query.studentId) || null;
    };

    Student.countDocuments = async (query) => {
        return mockDb.students.filter(s => s.department === query.department && s.year === query.year).length;
    };

    Student.create = async (doc) => {
        const student = { ...doc, _id: 'stu_' + (mockDb.students.length + 1) };
        mockDb.students.push(student);
        return student;
    };

    // Test controller directly or via simulated req/res
    const controller = require('../controllers/studentRequestController');

    // 1. Staff CS1 submits request for 26UCS001
    const req1 = {
        user: { role: 'staff', username: 'cs1', name: 'CS Staff (Year 1)', department: 'Computer Science', year: '1', id: 'cs1-id' },
        body: {
            studentRegisterNumber: '26UCS001',
            studentName: 'Aravind Kumar',
            department: 'Computer Science',
            academicYear: '1',
            reason: 'New admissions list'
        }
    };
    let resData1 = null;
    let resStatus1 = 200;
    const res1 = {
        status: (c) => { resStatus1 = c; return res1; },
        json: (d) => { resData1 = d; return res1; }
    };

    // Inject mock saving into prototype
    StudentRequest.prototype.save = async function() {
        if (!this._id) this._id = 'req_' + (mockDb.requests.length + 1);
        const idx = mockDb.requests.findIndex(r => r._id === this._id);
        if (idx >= 0) mockDb.requests[idx] = this;
        else mockDb.requests.push(this);
        return this;
    };

    await controller.submitRequest(req1, res1);
    assert(resStatus1 === 201 && resData1.success === true, 'Staff CS1 submits request successfully (201)');
    assert(mockDb.requests.length === 1, 'Request saved in requests collection');
    assert(mockDb.students.length === 0, 'Student NOT added to main student collection on request submission');

    const createdReq = mockDb.requests[0];
    assert(createdReq.status === 'pending', 'Request status is pending');
    assert(createdReq.classId === 'CS1', 'ClassId computed as CS1');

    // 2. Staff CS1 tries to submit duplicate pending request
    let resStatusDup = 200;
    let resDataDup = null;
    const resDup = {
        status: (c) => { resStatusDup = c; return resDup; },
        json: (d) => { resDataDup = d; return resDup; }
    };
    await controller.submitRequest(req1, resDup);
    assert(resStatusDup === 400 && resDataDup.success === false, 'Duplicate pending request is rejected with 400');

    // 3. Staff CS2 tries to request for CS1 class
    const reqCS2Cross = {
        user: { role: 'staff', username: 'cs2', name: 'CS Staff (Year 2)', department: 'Computer Science', year: '2', id: 'cs2-id' },
        body: {
            studentRegisterNumber: '26UCS002',
            studentName: 'Bhavani',
            department: 'Computer Science',
            academicYear: '1'
        }
    };
    let resStatusCross = 200;
    const resCross = {
        status: (c) => { resStatusCross = c; return resCross; },
        json: () => resCross
    };
    await controller.submitRequest(reqCS2Cross, resCross);
    assert(resStatusCross === 403, 'Cross-class request from CS2 staff for Year 1 is rejected with 403');

    // 4. Staff views their own requests
    const reqGetMy = {
        user: { role: 'staff', username: 'cs1', department: 'Computer Science', year: '1', id: 'cs1-id' }
    };
    let myRequestsData = null;
    const resGetMy = {
        status: () => resGetMy,
        json: (d) => { myRequestsData = d; }
    };
    await controller.getMyRequests(reqGetMy, resGetMy);
    assert(myRequestsData.requests.length === 1, 'Staff gets their own submitted request');

    // 5. Admin views all requests
    const reqAdminAll = {
        user: { role: 'admin', username: 'admin' },
        query: {}
    };
    let adminAllData = null;
    const resAdminAll = {
        status: () => resAdminAll,
        json: (d) => { adminAllData = d; }
    };
    await controller.getAllRequests(reqAdminAll, resAdminAll);
    assert(adminAllData.summary.pending === 1, 'Admin summary shows 1 pending request');

    // 6. Admin Approves request
    const reqApprove = {
        user: { role: 'admin', username: 'admin', name: 'System Admin' },
        params: { id: createdReq._id },
        body: { remarks: 'Approved by admin' }
    };
    let approveData = null;
    const resApprove = {
        status: () => resApprove,
        json: (d) => { approveData = d; }
    };
    await controller.approveRequest(reqApprove, resApprove);
    assert(approveData.success === true, 'Admin successfully approves request');
    assert(createdReq.status === 'approved', 'Request status is approved in database');
    assert(mockDb.students.length === 0, 'Student STILL NOT added upon admin approval alone');

    // 7. Staff Completes Registration after approval
    const reqComplete = {
        user: { role: 'staff', username: 'cs1', department: 'Computer Science', year: '1', id: 'cs1-id' },
        params: { id: createdReq._id },
        body: {
            studentName: 'Aravind Kumar S',
            section: 'A'
        }
    };
    let completeData = null;
    let completeStatus = 200;
    const resComplete = {
        status: (c) => { completeStatus = c; return resComplete; },
        json: (d) => { completeData = d; }
    };
    await controller.completeRegistration(reqComplete, resComplete);
    assert(completeStatus === 201 && completeData.success === true, 'Authorized staff completes registration (201)');
    assert(mockDb.students.length === 1, 'Student successfully created in main Students collection!');
    assert(mockDb.students[0].studentId === '26UCS001', 'Created student has correct register number');
    assert(mockDb.students[0].status === 'active', 'Student is active and ready for attendance');
    assert(createdReq.isCompleted === true, 'Request marked as completed');
    assert(createdReq.completedStudentId === mockDb.students[0]._id, 'Request is linked to created student');

    // 8. Staff attempts to complete registration twice
    let resStatusTwice = 200;
    const resTwice = {
        status: (c) => { resStatusTwice = c; return resTwice; },
        json: () => {}
    };
    await controller.completeRegistration(reqComplete, resTwice);
    assert(resStatusTwice === 400, 'Prevent duplicate student registration on repeated call (400)');

    // 9. Admin Rejection Workflow
    const req2 = {
        user: { role: 'staff', username: 'cs1', department: 'Computer Science', year: '1', id: 'cs1-id' },
        body: {
            studentRegisterNumber: '26UCS099',
            studentName: 'Invalid Candidate',
            department: 'Computer Science',
            academicYear: '1'
        }
    };
    await controller.submitRequest(req2, res1);
    const reqToReject = mockDb.requests.find(r => r.studentRegisterNumber === '26UCS099');

    const reqReject = {
        user: { role: 'admin', username: 'admin' },
        params: { id: reqToReject._id },
        body: { reason: 'Eligibility criteria not met' }
    };
    let rejectData = null;
    const resReject = {
        status: () => resReject,
        json: (d) => { rejectData = d; }
    };
    await controller.rejectRequest(reqReject, resReject);
    assert(rejectData.success === true, 'Admin rejects request with reason');
    assert(reqToReject.status === 'rejected', 'Request status is rejected');
    assert(reqToReject.rejectionReason === 'Eligibility criteria not met', 'Rejection reason saved');

    // Staff tries to complete registration for rejected request
    const reqCompleteRejected = {
        user: { role: 'staff', username: 'cs1', department: 'Computer Science', year: '1', id: 'cs1-id' },
        params: { id: reqToReject._id },
        body: {}
    };
    let statusCompleteRejected = 200;
    const resCompleteRejected = {
        status: (c) => { statusCompleteRejected = c; return resCompleteRejected; },
        json: () => {}
    };
    await controller.completeRegistration(reqCompleteRejected, resCompleteRejected);
    assert(statusCompleteRejected === 400, 'Staff blocked from completing rejected request (400)');

    // Summary
    console.log('\n====================================================');
    console.log(`📊 WORKFLOW ENDPOINT TESTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
}

testWorkflowEndpoints().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});

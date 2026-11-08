/* ========================================================
   deletedata.js - JavaScript for deletedata.html
   ======================================================== */

let currentUser = null;
const BASE_URL = 'http://localhost:5000/api';
let students = [];
let attendance = [];

/**
 * Check authentication and load user info
 */
function checkAuth() {
    currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if (!currentUser || currentUser.role !== "admin") {
        alert("Access denied. Admin privileges required.");
        window.location.href = "index.html";
        return false;
    }

    return true;
}



/**
 * Load and display admin info
 */
function loadAdminInfo() {
    if (!checkAuth()) return;

    const userInfoElem = document.getElementById("userInfo");
    if (userInfoElem) {
        const username = currentUser.name || currentUser.username || "admin";
        userInfoElem.innerText = `Admin: ${username}`;
    }
}

/**
 * Load the latest class data from MongoDB (fallback to localStorage)
 */
async function loadData() {
    const token = localStorage.getItem("token");
    let fromBackend = false;

    if (token) {
        try {
            const [studentsRes, attendanceRes] = await Promise.all([
                fetch(`${BASE_URL}/students`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${BASE_URL}/attendance`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (studentsRes.ok) {
                const data = await studentsRes.json();
                if (Array.isArray(data.students)) {
                    students = data.students;
                    localStorage.setItem("students", JSON.stringify(students));
                    fromBackend = true;
                }
            }

            if (attendanceRes.ok) {
                const aData = await attendanceRes.json();
                if (Array.isArray(aData.records)) {
                    attendance = aData.records;
                }
            }
        } catch (e) {
            console.warn('Unable to load data from backend, using local cache');
        }
    }

    if (!fromBackend) {
        students = JSON.parse(localStorage.getItem("students")) || [];
    }

    if (!Array.isArray(attendance) || attendance.length === 0) {
        attendance = JSON.parse(localStorage.getItem("attendance")) || [];
    }
}

/**
 * Save data to localStorage
 */
function saveData() {
    localStorage.setItem("students", JSON.stringify(students));
    localStorage.setItem("attendance", JSON.stringify(attendance));
}

/**
 * Preview students that will be deleted
 */
async function previewStudents() {
    const deptSelect = document.getElementById("deleteDepartment");
    const yearSelect = document.getElementById("deleteYear");
    const previewSection = document.getElementById("previewSection");
    const previewDiv = document.getElementById("studentPreview");
    const statsDiv = document.getElementById("previewStats");
    const messageArea = document.getElementById("messageArea");

    const selectedDept = deptSelect.value.trim();
    const selectedYear = yearSelect.value.trim();

    // Clear previous messages
    messageArea.innerHTML = "";

    if (!selectedDept) {
        messageArea.innerHTML = '<span style="color: red;">Please select a department.</span>';
        deptSelect.focus();
        return;
    }

    if (!selectedYear) {
        messageArea.innerHTML = '<span style="color: red;">Please select a year.</span>';
        yearSelect.focus();
        return;
    }

    await loadData();

    // Filter students by department and year
    const filteredStudents = students.filter(s =>
        s.department && s.department.trim().toLowerCase() === selectedDept.toLowerCase() &&
        String(s.year).trim() === String(selectedYear)
    );

    if (filteredStudents.length === 0) {
        previewDiv.innerHTML = `<p style="color: orange;">No students found for ${selectedDept} - Year ${selectedYear}.</p>`;
        statsDiv.innerHTML = "";
        previewSection.style.display = "block";
        return;
    }

    // Sort students strictly by roll number ascending
    filteredStudents.sort((a, b) => {
        const idA = String(a.studentId || a.id || '').trim().toUpperCase();
        const idB = String(b.studentId || b.id || '').trim().toUpperCase();
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' }) || idA.localeCompare(idB);
    });

    // Display student list
    let html = "<ul style='margin: 0; padding-left: 20px;'>";
    filteredStudents.forEach((student) => {
        const regNo = student.studentId || student.id || "N/A";
        const fullName = student.studentName || student.name || "Unknown";
        html += `<li><strong>${fullName}</strong> (ID: ${regNo}) - ${student.department} Year ${student.year}</li>`;
    });
    html += "</ul>";

    previewDiv.innerHTML = html;

    // Count attendance records that belong to this class
    let attendanceCount = attendance.filter(a =>
        String(a.department || "").trim().toLowerCase() === selectedDept.toLowerCase() &&
        String(a.year || "").trim() === String(selectedYear)
    ).length;

    // The attendance API is per-date, so use the MongoDB summary when available
    try {
        const token = localStorage.getItem("token");
        if (token) {
            const summaryRes = await fetch(
                `${BASE_URL}/reports/class/summary?department=${encodeURIComponent(selectedDept)}&year=${encodeURIComponent(selectedYear)}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (summaryRes.ok) {
                const summary = await summaryRes.json();
                if (summary.success && Number.isFinite(summary.attendanceCount)) {
                    attendanceCount = summary.attendanceCount;
                }
            }
        }
    } catch (e) {
        console.warn('Unable to load class summary from backend');
    }

    statsDiv.innerHTML = `
        <span style="color: #dc3545;">⚠️ ${filteredStudents.length} students will be deleted</span><br>
        <span style="color: #dc3545;">⚠️ ${attendanceCount} attendance records will be deleted</span>
    `;

    previewSection.style.display = "block";
}

/**
 * Delete selected data after confirmation
 */
async function deleteSelectedData() {
    const deptSelect = document.getElementById("deleteDepartment");
    const yearSelect = document.getElementById("deleteYear");
    const messageArea = document.getElementById("messageArea");

    const selectedDept = deptSelect.value.trim();
    const selectedYear = yearSelect.value.trim();

    // Clear previous messages
    messageArea.innerHTML = "";

    if (!selectedDept) {
        messageArea.innerHTML = '<span style="color: red;">Please select a department first.</span>';
        return;
    }

    if (!selectedYear) {
        messageArea.innerHTML = '<span style="color: red;">Please select a year first.</span>';
        return;
    }

    await loadData();

    // Filter students to be deleted
    const studentsToDelete = students.filter(s =>
        s.department && s.department.trim().toLowerCase() === selectedDept.toLowerCase() &&
        String(s.year).trim() === String(selectedYear)
    );

    if (studentsToDelete.length === 0) {
        messageArea.innerHTML = '<span style="color: orange;">No students found to delete.</span>';
        return;
    }

    // First confirmation
    const confirmMsg1 = `⚠️ WARNING: You are about to permanently delete:\n\n` +
        `• Department: ${selectedDept}\n` +
        `• Year: ${selectedYear}\n` +
        `• Total Students: ${studentsToDelete.length}\n\n` +
        `This will remove all student records and their attendance history.\n\n` +
        `Do you want to continue?`;

    if (!confirm(confirmMsg1)) {
        return;
    }

    // Second confirmation
    const confirmMsg2 = `FINAL CONFIRMATION:\n\n` +
        `Are you absolutely sure you want to permanently delete all ${studentsToDelete.length} students from ${selectedDept} Year ${selectedYear}?\n\n` +
        `This action CANNOT be undone!`;

    if (!confirm(confirmMsg2)) {
        return;
    }

    let deletedStudents = 0;
    let deletedAttendance = 0;

    // Permanently delete the class from MongoDB through the backend
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            messageArea.innerHTML = '<span style="color: red;">Authentication required. Please log in again.</span>';
            return;
        }

        const response = await fetch(`${BASE_URL}/reports/class`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ department: selectedDept, year: selectedYear })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            messageArea.innerHTML = `<span style="color: red;">❌ ${data.message || 'Failed to delete class data from the database.'}</span>`;
            return;
        }

        deletedStudents = Number.isFinite(data.deletedStudents) ? data.deletedStudents : studentsToDelete.length;
        deletedAttendance = Number.isFinite(data.deletedAttendance) ? data.deletedAttendance : 0;

        // Keep the local cache in sync with MongoDB
        students = students.filter(s =>
            !(s.department && s.department.trim().toLowerCase() === selectedDept.toLowerCase() &&
              String(s.year).trim() === String(selectedYear))
        );
        attendance = attendance.filter(a =>
            !(String(a.department || "").trim().toLowerCase() === selectedDept.toLowerCase() &&
              String(a.year || "").trim() === String(selectedYear))
        );
        saveData();
    } catch (err) {
        messageArea.innerHTML = `<span style="color: red;">❌ Network error: ${err.message}</span>`;
        return;
    }

    // Show success message
    messageArea.innerHTML = `
        <div style="color: green; font-weight: bold;">
            ✅ Successfully deleted:<br>
            • ${deletedStudents} students from ${selectedDept} Year ${selectedYear}<br>
            • ${deletedAttendance} attendance records
        </div>
    `;

    // Clear form and preview
    deptSelect.value = "";
    yearSelect.value = "";
    document.getElementById("previewSection").style.display = "none";

    // Show success alert
    alert(`Deletion completed successfully!\n\n` +
          `• Students deleted: ${deletedStudents}\n` +
          `• Attendance records deleted: ${deletedAttendance}`);
}

/**
 * Go back to admin panel
 */
function goBackToAdmin() {
    window.location.href = "admin.html";
}

/**
 * Initialize page when DOM is loaded
 */
document.addEventListener("DOMContentLoaded", async function() {
    loadAdminInfo();
    await loadData();
});

/**
 * Handle logout (inherited from admin functionality)
 */
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("token");
        window.location.href = "index.html";
    }
}
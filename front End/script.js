/* ==========================================================================
/* ========================================================
   script.js - College Attendance System (Local & API Support)
   Handles Login, Home Dashboard, Attendance Entry, and Reports locally
   Default Staff: cs3 / cs123 -> Computer Science, Year 3
   ========================================================================== */

const BASE_URL = 'http://localhost:5000/api';

// Pre-configured local accounts
const LOCAL_USERS = [
    {
        username: "cs",
        password: "cs123",
        name: "CS Staff",
        role: "staff",
        department: "Computer Science",
        year: "All"
    },
    {
        username: "cs3",
        password: "cs123",
        name: "CS Staff (Year 3)",
        role: "staff",
        department: "Computer Science",
        year: "3"
    },
    {
        username: "cs1",
        password: "cs123",
        name: "CS Staff (Year 1)",
        role: "staff",
        department: "Computer Science",
        year: "1"
    },
    {
        username: "cs2",
        password: "cs123",
        name: "CS Staff (Year 2)",
        role: "staff",
        department: "Computer Science",
        year: "2"
    },
    {
        username: "admin",
        password: "admin123",
        name: "System Administrator",
        role: "admin",
        department: "Administration",
        year: "All"
    }
];

// Initial default students for Computer Science Year 3 (cs3's class)
const DEFAULT_CS3_STUDENTS = [
    { serial: 1, id: "21CS001", studentId: "21CS001", name: "Aravind Kumar", studentName: "Aravind Kumar", department: "Computer Science", year: "3" },
    { serial: 2, id: "21CS002", studentId: "21CS002", name: "Bhavani S", studentName: "Bhavani S", department: "Computer Science", year: "3" },
    { serial: 3, id: "21CS003", studentId: "21CS003", name: "Chandran M", studentName: "Chandran M", department: "Computer Science", year: "3" },
    { serial: 4, id: "21CS004", studentId: "21CS004", name: "Divya R", studentName: "Divya R", department: "Computer Science", year: "3" },
    { serial: 5, id: "21CS005", studentId: "21CS005", name: "Ganesh P", studentName: "Ganesh P", department: "Computer Science", year: "3" },
    { serial: 6, id: "21CS006", studentId: "21CS006", name: "Harini K", studentName: "Harini K", department: "Computer Science", year: "3" },
    { serial: 7, id: "21CS007", studentId: "21CS007", name: "Karthik V", studentName: "Karthik V", department: "Computer Science", year: "3" },
    { serial: 8, id: "21CS008", studentId: "21CS008", name: "Meena R", studentName: "Meena R", department: "Computer Science", year: "3" },
    { serial: 9, id: "21CS009", studentId: "21CS009", name: "Naveen S", studentName: "Naveen S", department: "Computer Science", year: "3" },
    { serial: 10, id: "21CS010", studentId: "21CS010", name: "Priya M", studentName: "Priya M", department: "Computer Science", year: "3" }
];

/**
 * Initialize default local students in localStorage if none exist
 */
function initializeLocalStudents() {
    // When signed in through the backend, MongoDB is the source of truth.
    // Seeding demo students here would bring deleted students back into the UI.
    const token = localStorage.getItem("token");
    if (token && !token.startsWith("local-token-")) {
        return;
    }

    let students = JSON.parse(localStorage.getItem("students")) || [];
    const cs3Exists = students.some(s => s.department === "Computer Science" && String(s.year) === "3");

    if (!cs3Exists) {
        students = students.concat(DEFAULT_CS3_STUDENTS);
        localStorage.setItem("students", JSON.stringify(students));
    }
}

/**
 * Load students from backend API for current user's department and year
 */
async function loadStudentsFromBackend() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const res = await fetch(`${BASE_URL}/students`, {
            headers: { Authorization: "Bearer " + token }
        });
        if (res.ok) {
            const data = await res.json();
            // Replace the cache even when empty so deleted students disappear
            if (Array.isArray(data.students)) {
                localStorage.setItem("students", JSON.stringify(data.students));
            }
        }
    } catch (e) {
        console.error("Failed to load students from backend:", e);
    }
}

/**
 * Natural (numeric-aware) roll number comparator.
 * Correctly sorts 24UCS010 before 24UCS020 before 24UCS100.
 */
function compareRollNumbers(a, b) {
    const strA = String(a || '').trim().toUpperCase();
    const strB = String(b || '').trim().toUpperCase();
    const chunksA = strA.match(/(\d+|[^\d]+)/g) || [strA];
    const chunksB = strB.match(/(\d+|[^\d]+)/g) || [strB];
    const len = Math.max(chunksA.length, chunksB.length);
    for (let i = 0; i < len; i++) {
        const ca = chunksA[i] || '';
        const cb = chunksB[i] || '';
        if (/^\d+$/.test(ca) && /^\d+$/.test(cb)) {
            const diff = parseInt(ca, 10) - parseInt(cb, 10);
            if (diff !== 0) return diff;
        } else {
            if (ca < cb) return -1;
            if (ca > cb) return 1;
        }
    }
    return 0;
}

function sortStudentsByRollNumber(arr) {
    if (!Array.isArray(arr)) return [];
    return [...arr].sort((a, b) =>
        compareRollNumbers(a.studentId || a.id || '', b.studentId || b.id || '')
    );
}

/**
 * Universal Session Helper
 */
function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("currentUser")) || null;
    } catch (e) {
        return null;
    }
}

/**
 * Global Logout Handler
 */
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("token");
        localStorage.removeItem("department");
        localStorage.removeItem("year");
        window.location.href = "index.html";
    }
}

// ==========================================================================
// 1. LOGIN LOGIC (index.html)
// ==========================================================================
async function login() {
    const userField = document.getElementById("loginUser");
    const passField = document.getElementById("loginPass");
    const msgEl = document.getElementById("loginMsg");

    if (!userField || !passField) return;

    const username = userField.value.trim();
    const password = passField.value.trim();

    if (!username || !password) {
        if (msgEl) {
            msgEl.style.color = "#fca5a5";
            msgEl.innerText = "Please enter Username and Password";
        }
        return;
    }

    if (msgEl) {
        msgEl.style.color = "#ffffff";
        msgEl.innerText = "Authenticating...";
    }

    // Try backend authentication first if available
    let backendSuccess = false;
    try {
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success && result.token) {
                backendSuccess = true;
                localStorage.setItem("token", result.token);
                localStorage.setItem("currentUser", JSON.stringify(result.user));
                localStorage.setItem("department", result.user.department || "");
                localStorage.setItem("year", result.user.year || "");

                // The common staff account must choose CS1 / CS2 / CS3 first
                const needsClassSelection = result.user.role === "staff" &&
                    (!result.user.year || result.user.year === "All");

                if (needsClassSelection) {
                    // Avoid leaking a previous class roster into the selection page
                    localStorage.removeItem("students");
                } else {
                    // Load students from backend for this user's department and year
                    initializeLocalStudents();
                    await loadStudentsFromBackend();
                }

                if (msgEl) {
                    msgEl.style.color = "#86efac";
                    msgEl.innerText = "Login successful! Redirecting...";
                }

                setTimeout(() => {
                    if (result.user.role === "admin") {
                        window.location.href = "admin.html";
                    } else if (needsClassSelection) {
                        window.location.href = "class-selection.html";
                    } else {
                        window.location.href = "home.html";
                    }
                }, 300);
                return;
            }
        }
    } catch (err) {
        // Backend offline or unreachable - seamlessly fallback to local auth
        console.info("Backend offline. Falling back to local offline authentication.");
    }

    // Local Authentication Fallback
    const normalizedUser = username.toLowerCase();
    const localUser = LOCAL_USERS.find(
        u => u.username.toLowerCase() === normalizedUser && u.password === password
    );

    if (localUser) {
        const userObj = {
            id: "local_" + localUser.username,
            name: localUser.name,
            username: localUser.username,
            role: localUser.role,
            department: localUser.department,
            year: localUser.year
        };

        localStorage.setItem("token", "local-token-" + localUser.username);
        localStorage.setItem("currentUser", JSON.stringify(userObj));
        localStorage.setItem("department", userObj.department);
        localStorage.setItem("year", userObj.year);

        const needsClassSelection = userObj.role === "staff" &&
            (!userObj.year || userObj.year === "All");

        if (needsClassSelection) {
            localStorage.removeItem("students");
        } else {
            // Load students from backend if available
            initializeLocalStudents();
            await loadStudentsFromBackend();
        }

        if (msgEl) {
            msgEl.style.color = "#86efac";
            msgEl.innerText = `Login successful! Welcome, ${userObj.name}`;
        }

        setTimeout(() => {
            if (userObj.role === "admin") {
                window.location.href = "admin.html";
            } else if (needsClassSelection) {
                window.location.href = "class-selection.html";
            } else {
                window.location.href = "home.html";
            }
        }, 300);
    } else {
        if (msgEl) {
            msgEl.style.color = "#fca5a5";
            msgEl.innerText = "Invalid username or password. (Staff: cs3 / cs123, Admin: admin / admin123)";
        }
    }
}

// ==========================================================================
// 2. STAFF DASHBOARD LOGIC (home.html)
// ==========================================================================
function loadHomeDashboard() {
    const user = getCurrentUser();
    const userInfoEl = document.getElementById("userInfo");

    if (!user) {
        window.location.href = "index.html";
        return;
    }

    // Role Guard: Admin users belong in admin.html, staff belong in home.html
    if (user.role === "admin") {
        window.location.href = "admin.html";
        return;
    }

    // Common staff account has no class yet
    if (user.role === "staff" && (!user.year || user.year === "All")) {
        window.location.href = "class-selection.html";
        return;
    }

    if (userInfoEl) {
        const dept = user.department || "Computer Science";
        const year = user.year || "3";
        userInfoEl.innerHTML = `
            Welcome, <strong>${dept} - Year ${year}</strong><br>
        `;
    }
}

// ==========================================================================
// 3. ATTENDANCE ENTRY LOGIC (attendance.html)
//    Restricted strictly to the staff's single assigned class
// ==========================================================================
let currentStudents = [];
let attendanceMap = {}; // studentId -> 'present' | 'absent'

/**
 * Retrieve students for current staff's single assigned class
 */
function getStudentsForCurrentStaff() {
    const user = getCurrentUser();
    if (!user) return [];

    initializeLocalStudents();
    const allStudents = JSON.parse(localStorage.getItem("students")) || [];

    // Filter strictly for this staff's assigned department and year
    const targetDept = (user.department || "Computer Science").trim().toLowerCase();
    const targetYear = String(user.year || "3").trim();

    const filtered = allStudents.filter(s => {
        const sDept = (s.department || "").trim().toLowerCase();
        const sYear = String(s.year || "").trim();
        return sDept === targetDept && sYear === targetYear;
    });
    return sortStudentsByRollNumber(filtered);
}

/**
 * Render attendance roster for selected date
 */
async function renderAttendance() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    if (user.role === "staff" && (!user.year || user.year === "All")) {
        window.location.href = "class-selection.html";
        return;
    }

    // Display assigned class banner if container exists
    let classBanner = document.getElementById("classBanner");
    if (!classBanner) {
        const titleEl = document.querySelector(".container h3");
        if (titleEl) {
            classBanner = document.createElement("div");
            classBanner.id = "classBanner";
            classBanner.style.textAlign = "center";
            classBanner.style.marginBottom = "15px";
            classBanner.style.fontSize = "16px";
            classBanner.style.fontWeight = "600";
            classBanner.style.color = "#e2e8f0";
            titleEl.parentNode.insertBefore(classBanner, titleEl.nextSibling);
        }
    }
    if (classBanner) {
        classBanner.innerHTML = `Class: <span style="color: #67e8f9;">${user.department || "Computer Science"} - Year ${user.year || "3"}</span> &nbsp;|&nbsp; Staff: <span style="color: #fde047;">${user.username}</span>`;
    }

    const dateInput = document.getElementById("attendanceDate");
    if (!dateInput) return;

    // Restrict date input for staff - only admin can change dates
    if (user.role === 'staff') {
        dateInput.disabled = true;
        dateInput.title = "Date is fixed for staff - only admin can change dates";
    } else {
        dateInput.disabled = false;
    }

    let date = dateInput.value;
    if (!date) {
        date = new Date().toISOString().split("T")[0];
        dateInput.value = date;
    }

    const tbody = document.getElementById("attendanceBody");
    if (!tbody) return;

    // 1. Load students strictly for this staff's class
    currentStudents = getStudentsForCurrentStaff();

    // If local student list was empty, try backend API or reload defaults
    if (currentStudents.length === 0) {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${BASE_URL}/students`, {
                headers: { Authorization: "Bearer " + token }
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.students) && data.students.length > 0) {
                    currentStudents = data.students;
                }
            }
        } catch (e) {}
    }

    if (currentStudents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="padding: 24px; color: #fca5a5;">
                    No students found for ${user.department} - Year ${user.year}.
                </td>
            </tr>`;
        updateAttendanceStats();
        return;
    }

    // 2. Load saved attendance for this date & class
    attendanceMap = {};
    const storageKey = `att_${user.department}_${user.year}_${date}`;
    const savedLocal = localStorage.getItem(storageKey);

    if (savedLocal) {
        try {
            const records = JSON.parse(savedLocal);
            records.forEach(r => {
                const id = String(r.studentId || r.id).trim().toUpperCase();
                attendanceMap[id] = r.status;
            });
        } catch (e) {}
    } else {
        // Try backend
        try {
            const token = localStorage.getItem("token");
            const attRes = await fetch(`${BASE_URL}/attendance?date=${encodeURIComponent(date)}`, {
                headers: { Authorization: "Bearer " + token }
            });
            if (attRes.ok) {
                const data = await attRes.json();
                if (Array.isArray(data.records)) {
                    data.records.forEach(r => {
                        const id = String(r.studentId || r.id).trim().toUpperCase();
                        attendanceMap[id] = r.status;
                    });
                }
            }
        } catch (e) {}
    }

    // 3. Render student roster table
    tbody.innerHTML = "";

    currentStudents.forEach((s, idx) => {
        const rawId = s.studentId || s.id || `STU${idx + 1}`;
        const rawName = s.studentName || s.name || "Unknown";
        const sId = String(rawId).trim().toUpperCase();

        // Default to 'present' unless saved as 'absent'
        const currentStatus = attendanceMap[sId] || "present";
        const isAbsent = (currentStatus === "absent");

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${idx + 1}</td>
            <td>${rawId}</td>
            <td>${rawName}</td>
            <td>
                <label class="att-ball-label" title="Click to toggle Present / Absent">
                    <input type="checkbox"
                           class="att-ball-check"
                           id="att_check_${rawId}"
                           ${isAbsent ? "checked" : ""}
                           onchange="toggleAttendance('${rawId}', this.checked)">
                    <span class="att-ball ${isAbsent ? 'is-absent' : ''}" id="att_ball_${rawId}"></span>
                    <span class="att-text ${isAbsent ? 'text-absent' : 'text-present'}" id="att_text_${rawId}">
                        ${isAbsent ? 'Absent' : 'Present'}
                    </span>
                </label>
            </td>
        `;
        tbody.appendChild(row);
    });

    updateAttendanceStats();
}

/**
 * Toggle attendance for a student (single-ball interactive control)
 */
function toggleAttendance(studentId, isAbsent) {
    const sId = String(studentId).trim().toUpperCase();
    attendanceMap[sId] = isAbsent ? 'absent' : 'present';

    const ball = document.getElementById("att_ball_" + studentId);
    const text = document.getElementById("att_text_" + studentId);

    if (ball) {
        if (isAbsent) {
            ball.classList.add("is-absent");
        } else {
            ball.classList.remove("is-absent");
        }
    }

    if (text) {
        text.textContent = isAbsent ? "Absent" : "Present";
        text.className = "att-text " + (isAbsent ? "text-absent" : "text-present");
    }

    updateAttendanceStats();
}

/**
 * Live Stats Counter (Total, Present, Absent)
 */
function updateAttendanceStats() {
    const statsEl = document.getElementById("attendanceStats");
    if (!statsEl) return;

    const total = currentStudents.length;
    let absentCount = 0;

    currentStudents.forEach(s => {
        const rawId = s.studentId || s.id;
        const sId = String(rawId).trim().toUpperCase();
        if (attendanceMap[sId] === 'absent') {
            absentCount++;
        }
    });

    const presentCount = total - absentCount;

    statsEl.innerHTML = `
        <div class="attendance-stats-bar">
            <span class="stat-item">Total: <strong>${total}</strong></span>
            <span class="stat-item stat-present">● Present: <strong>${presentCount}</strong></span>
            <span class="stat-item stat-absent">● Absent: <strong>${absentCount}</strong></span>
        </div>
    `;
}

/**
 * Submit Attendance (Saves locally to localStorage & attempts backend sync)
 */
async function submitAttendance() {
    const user = getCurrentUser();
    if (!user) {
        alert("Session expired. Please log in again.");
        window.location.href = "index.html";
        return;
    }

    const dateInput = document.getElementById("attendanceDate");
    const date = dateInput ? dateInput.value : "";

    if (!date) {
        alert("Please select a date first.");
        return;
    }

    if (currentStudents.length === 0) {
        alert("No students in this class to record attendance.");
        return;
    }

    const records = currentStudents.map(s => {
        const rawId = s.studentId || s.id;
        const rawName = s.studentName || s.name;
        const sId = String(rawId).trim().toUpperCase();
        return {
            studentId: rawId,
            studentName: rawName,
            status: attendanceMap[sId] === 'absent' ? 'absent' : 'present'
        };
    });

    // 1. Save locally in localStorage
    const storageKey = `att_${user.department}_${user.year}_${date}`;
    localStorage.setItem(storageKey, JSON.stringify(records));

    // Save in cumulative attendance ledger for reports
    let allLedger = JSON.parse(localStorage.getItem("all_attendance_ledger")) || [];
    // Remove previous entry for same dept, year, date
    allLedger = allLedger.filter(entry =>
        !(entry.date === date && entry.department === user.department && String(entry.year) === String(user.year))
    );
    allLedger.push({
        date: date,
        department: user.department,
        year: user.year,
        records: records
    });
    localStorage.setItem("all_attendance_ledger", JSON.stringify(allLedger));

    // 2. Try syncing to backend if online
    try {
        const token = localStorage.getItem("token");
        await fetch(`${BASE_URL}/attendance/mark`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                date: date,
                department: user.department,
                year: user.year,
                records: records
            })
        });
    } catch (e) {
        // Backend offline, local save is sufficient
    }

    alert(`✅ Attendance submitted successfully for ${user.department} - Year ${user.year} (${date})!`);
}

// ==========================================================================
// 4. REPORT LOGIC (report.html)
// ==========================================================================
function initReport() {
    const user = getCurrentUser();

    if (user && user.role === "staff" && (!user.year || user.year === "All")) {
        window.location.href = "class-selection.html";
        return;
    }

    const deptEl = document.getElementById("reportDepartment");
    const yearEl = document.getElementById("reportYear");

    // If staff user (like cs3), lock dropdowns strictly to their assigned class
    if (user && user.role === 'staff') {
        if (deptEl) {
            deptEl.value = user.department || "Computer Science";
            deptEl.disabled = true;
        }
        if (yearEl) {
            yearEl.value = user.year || "3";
            yearEl.disabled = true;
        }
    }
}

function generateReport() {
    const user = getCurrentUser();
    const deptEl = document.getElementById("reportDepartment");
    const yearEl = document.getElementById("reportYear");
    const fromEl = document.getElementById("fromDate");
    const toEl = document.getElementById("toDate");
    const tbody = document.getElementById("reportBody");
    const summaryEl = document.getElementById("reportSummary");

    const department = (deptEl && deptEl.value) || (user && user.department) || "Computer Science";
    const year = (yearEl && yearEl.value) || (user && user.year) || "3";
    const fromDate = fromEl ? fromEl.value : "";
    const toDate = toEl ? toEl.value : "";

    if (!department || !year) {
        alert("Please select Department and Year");
        return;
    }

    initializeLocalStudents();
    const allStudents = JSON.parse(localStorage.getItem("students")) || [];
    const classStudents = sortStudentsByRollNumber(
        allStudents.filter(
            s => (s.department || "").toLowerCase() === department.toLowerCase() && String(s.year) === String(year)
        )
    );

    const allLedger = JSON.parse(localStorage.getItem("all_attendance_ledger")) || [];
    const relevantEntries = allLedger.filter(entry => {
        const matchDept = (entry.department || "").toLowerCase() === department.toLowerCase();
        const matchYear = String(entry.year) === String(year);
        let matchDate = true;
        if (fromDate && entry.date < fromDate) matchDate = false;
        if (toDate && entry.date > toDate) matchDate = false;
        return matchDept && matchYear && matchDate;
    });

    const totalDays = relevantEntries.length;

    if (tbody) tbody.innerHTML = "";

    classStudents.forEach((s, idx) => {
        const rawId = s.studentId || s.id;
        const rawName = s.studentName || s.name;
        const sId = String(rawId).trim().toUpperCase();

        let presentDays = 0;
        relevantEntries.forEach(entry => {
            const rec = (entry.records || []).find(r => String(r.studentId || r.id).trim().toUpperCase() === sId);
            if (rec && rec.status === 'present') {
                presentDays++;
            }
        });

        const absentDays = totalDays > 0 ? (totalDays - presentDays) : 0;
        const pct = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : "100.0";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${idx + 1}</td>
            <td>${rawId}</td>
            <td>${rawName}</td>
            <td>${totalDays}</td>
            <td style="color: #86efac; font-weight: 600;">${presentDays}</td>
            <td style="color: #fca5a5; font-weight: 600;">${absentDays}</td>
            <td style="font-weight: 600;">${pct}%</td>
        `;
        if (tbody) tbody.appendChild(row);
    });

    if (summaryEl) {
        summaryEl.innerHTML = `Showing report for <strong>${department} - Year ${year}</strong> (${totalDays} dates recorded)`;
    }
}

function viewStudentData() {
    const deptEl = document.getElementById("reportDepartment");
    const yearEl = document.getElementById("reportYear");
    const tbody = document.getElementById("reportBody");
    const thead = document.getElementById("reportHead");
    const summaryEl = document.getElementById("reportSummary");

    const department = deptEl ? deptEl.value : "Computer Science";
    const year = yearEl ? yearEl.value : "3";

    initializeLocalStudents();
    const allStudents = JSON.parse(localStorage.getItem("students")) || [];
    const classStudents = sortStudentsByRollNumber(
        allStudents.filter(
            s => (s.department || "").toLowerCase() === department.toLowerCase() && String(s.year) === String(year)
        )
    );

    if (thead) {
        thead.innerHTML = `
            <tr>
                <th>Serial</th>
                <th>Register No</th>
                <th>Name</th>
                <th>Department</th>
                <th>Year</th>
            </tr>
        `;
    }

    if (tbody) {
        tbody.innerHTML = "";
        if (classStudents.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="padding: 20px; color: #fca5a5;">No students found for ${department} - Year ${year}</td></tr>`;
            return;
        }

        classStudents.forEach((s, idx) => {
            const rawId = s.studentId || s.id;
            const rawName = s.studentName || s.name;
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${idx + 1}</td>
                <td>${rawId}</td>
                <td>${rawName}</td>
                <td>${s.department}</td>
                <td>Year ${s.year}</td>
            `;
            tbody.appendChild(row);
        });
    }

    if (summaryEl) {
        summaryEl.innerHTML = `Total Registered Students for <strong>${department} - Year ${year}</strong>: ${classStudents.length}`;
    }
}

function downloadReport() {
    if (typeof XLSX === 'undefined') {
        alert("XLSX library not loaded. Ensure internet connection or xlsx.full.min.js.");
        return;
    }

    const table = document.querySelector("table");
    if (!table) {
        alert("No table data to export.");
        return;
    }

    const wb = XLSX.utils.table_to_book(table, { sheet: "Attendance_Report" });
    const user = getCurrentUser();
    const fileName = `Attendance_Report_${(user && user.department) || "CS"}_Year_${(user && user.year) || "3"}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// ==========================================================================
// 5. DOM CONTENT LOADED - PAGE ROUTER
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
    initializeLocalStudents();

    // If on index.html
    const userField = document.getElementById("loginUser");
    const passField = document.getElementById("loginPass");
    if (userField && passField) {
        [userField, passField].forEach(f => {
            f.addEventListener("keypress", (e) => {
                if (e.key === "Enter") login();
            });
        });
    }

    // If on home.html
    if (document.getElementById("userInfo") && !document.getElementById("btnDeleteClass")) {
        loadHomeDashboard();
    }

    // If on attendance.html
    if (document.getElementById("attendanceBody") && document.getElementById("attendanceDate")) {
        const dateInput = document.getElementById("attendanceDate");
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split("T")[0];
        }
        // Refresh from MongoDB first so deleted students never remain on screen
        await loadStudentsFromBackend();
        renderAttendance();
    }

    // If on report.html
    if (document.getElementById("reportDepartment") && document.getElementById("reportYear")) {
        await loadStudentsFromBackend();
        initReport();
    }
});

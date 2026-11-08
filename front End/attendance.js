const BASE_URL = 'http://localhost:5000/api';
const token = localStorage.getItem("token");

let attendanceData = [];

// =============================
// LOAD STUDENTS
// =============================
async function loadStudents() {
    const tbody = document.getElementById("attendanceBody");
    if (!tbody) return;

    try {
        const res = await fetch(`${BASE_URL}/students`, {
            headers: { Authorization: "Bearer " + token }
        });

        if (!res.ok) throw new Error("Failed to fetch students");

        const resData = await res.json();
        const rawList = Array.isArray(resData) ? resData : (resData.students || []);
        const students = [...rawList].sort((a, b) => {
            const idA = String(a.studentId || a.id || '').trim().toUpperCase();
            const idB = String(b.studentId || b.id || '').trim().toUpperCase();
            return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' }) || idA.localeCompare(idB);
        });

        tbody.innerHTML = "";
        attendanceData = [];

        students.forEach((student, index) => {
            attendanceData.push({
                student: student._id,
                status: "absent" // Default is absent if they don't tick the box
            });

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${student.studentId}</td>
                <td>${student.studentName}</td>
                <td>
                    <input type="checkbox"
                           title="Tick if Present"
                           style="width: 20px; height: 20px; cursor: pointer;"
                           onclick="setStatus('${student._id}', this.checked ? 'present' : 'absent')">
                </td>
            `;
            tbody.appendChild(row);
        });

    } catch (err) {
        console.error(err);
        alert("Failed to load students: " + err.message);
    }
}

// =============================
// SET STATUS
// =============================
function setStatus(studentId, status) {
    const existing = attendanceData.find(r => r.student === studentId);
    if (existing) existing.status = status;
}

// =============================
// SAVE ATTENDANCE
// =============================
async function saveAttendance() {
    const date = document.getElementById("attendanceDate").value;

    if (!date) {
        alert("Please select a date");
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/attendance/mark`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
            },
            body: JSON.stringify({
                date: date,
                records: attendanceData
            })
        });

        const data = await res.json();

        if (res.ok) {
            alert("Attendance saved successfully");
        } else {
            alert(data.message || "Error saving attendance");
        }

    } catch (err) {
        console.error(err);
        alert("Server error: " + err.message);
    }
}

// =============================
// CALCULATE WORKING DAYS (Mon-Fri)
// =============================
function getWorkingDays(start, end) {
    let count = 0;
    let cur = new Date(start);
    let endDate = new Date(end);
    while (cur <= endDate) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6) count++;
        cur.setDate(cur.getDate() + 1);
    }
    return count;
}

// Load students on page load
document.addEventListener("DOMContentLoaded", () => {
    loadStudents();
});

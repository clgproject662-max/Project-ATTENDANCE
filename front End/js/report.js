/* ==========================================================================
   report.js - Attendance Report & Student List Logic (report.html)
   ========================================================================== */

let currentReportMode = "attendance"; // "attendance" or "students"

/**
 * Initialize page controls and role permissions
 */
function initReportPage() {
    const user = getCurrentUser();

    const deptEl = document.getElementById("reportDepartment");
    const yearEl = document.getElementById("reportYear");

    // If staff user, pre-fill and restrict dropdowns to their assigned department & year
    if (user && user.role === 'staff') {
        if (deptEl && user.department) {
            deptEl.value = user.department;
            deptEl.disabled = true;
        }
        if (yearEl && user.year && user.year !== 'All') {
            yearEl.value = user.year;
            yearEl.disabled = true;
        }
    }

    const body = document.getElementById("reportBody");
    if (body) body.innerHTML = "";

    const summaryEl = document.getElementById("reportSummary");
    if (summaryEl) summaryEl.innerHTML = "";

    // Show delete button only for admin
    const delBtn = document.getElementById("btnDeleteClass");
    if (delBtn) {
        if (user && user.role === "staff") {
            delBtn.style.display = "none";
        } else {
            delBtn.style.display = "inline-block";
        }
    }
}

/**
 * View enrolled student list for selected class from database
 */
async function viewStudentData() {
    const deptEl = document.getElementById("reportDepartment");
    const yearEl = document.getElementById("reportYear");

    const selectedDept = deptEl ? deptEl.value.trim() : "";
    const selectedYear = yearEl ? yearEl.value.trim() : "";

    if (!selectedDept) {
        alert("Please select a Department to view student data.");
        if (deptEl) deptEl.focus();
        return;
    }

    if (!selectedYear) {
        alert("Please select a Year to view student data.");
        if (yearEl) yearEl.focus();
        return;
    }

    const body = document.getElementById("reportBody");
    const summaryEl = document.getElementById("reportSummary");
    if (body) body.innerHTML = `<tr><td colspan="6" style="padding:20px;">Fetching student data from database...</td></tr>`;

    const res = await apiFetch(`/reports/students?department=${encodeURIComponent(selectedDept)}&year=${encodeURIComponent(selectedYear)}`);

    currentReportMode = "students";
    const user = getCurrentUser();
    const isAdmin = (!user || user.role === "admin");

    const thead = document.getElementById("reportHead");
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th>Serial</th>
                <th>Register No</th>
                <th>Name</th>
                <th>Department</th>
                <th>Year</th>
                ${isAdmin ? '<th>Action</th>' : ''}
            </tr>`;
    }

    if (!res.ok || !Array.isArray(res.students) || res.students.length === 0) {
        if (summaryEl) {
            summaryEl.innerHTML = `<span style="color:#fca5a5;">⚠️ No students found for ${selectedDept} - Year ${selectedYear}.</span>`;
        }
        if (body) {
            body.innerHTML = `<tr><td colspan="${isAdmin ? 6 : 5}" style="text-align:center;padding:25px;color:#fca5a5;">No uploaded students found for ${selectedDept} - Year ${selectedYear}.</td></tr>`;
        }
        return;
    }

    if (summaryEl) {
        summaryEl.innerHTML = `Showing Enrolled Students for: <strong>${selectedDept} - Year ${selectedYear}</strong> (Total: <strong>${res.students.length}</strong> students)`;
    }

    if (body) {
        body.innerHTML = "";
        const sortedStudents = [...res.students].sort((a, b) => {
            const idA = String(a.studentId || a.id || '').trim().toUpperCase();
            const idB = String(b.studentId || b.id || '').trim().toUpperCase();
            return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' }) || idA.localeCompare(idB);
        });
        sortedStudents.forEach((s, idx) => {
            const displaySerial = idx + 1;
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${displaySerial}</td>
                <td>${s.studentId}</td>
                <td>${s.studentName}</td>
                <td>${s.department}</td>
                <td>Year ${s.year}</td>
                ${isAdmin ? `<td><button class="red" style="padding:4px 12px;font-size:12px;margin:0;" onclick="deleteStudent('${s._id || s.studentId}', '${s.studentName}')">Delete</button></td>` : ''}
            `;
            body.appendChild(row);
        });
    }
}

/**
 * Delete a single student record from MongoDB (Admin Only)
 */
async function deleteStudent(studentId, studentName) {
    const user = getCurrentUser();
    if (!user || user.role !== "admin") {
        alert("Only Administrators are authorized to delete student records.");
        return;
    }

    if (!confirm(`Are you sure you want to permanently delete student ${studentName || ''} (${studentId}) from the database?`)) {
        return;
    }

    const res = await apiFetch(`/students/${encodeURIComponent(studentId)}`, {
        method: 'DELETE'
    });

    if (res.ok) {
        alert(res.message || "Student removed successfully");
        viewStudentData(); // Refresh table
    } else {
        alert(`❌ Delete failed: ${res.message}`);
    }
}

/**
 * Generate attendance percentage calculations from MongoDB records
 */
async function generateReport() {
    const deptEl = document.getElementById("reportDepartment");
    const yearEl = document.getElementById("reportYear");
    const fromInput = document.getElementById("fromDate");
    const toInput = document.getElementById("toDate");

    const selectedDept = deptEl ? deptEl.value.trim() : "";
    const selectedYear = yearEl ? yearEl.value.trim() : "";
    const from = fromInput ? fromInput.value : "";
    const to = toInput ? toInput.value : "";

    if (!selectedDept) {
        alert("Please select a Department.");
        if (deptEl) deptEl.focus();
        return;
    }

    if (!selectedYear) {
        alert("Please select a Year.");
        if (yearEl) yearEl.focus();
        return;
    }

    if (!from) {
        alert("Please select From date.");
        if (fromInput) fromInput.focus();
        return;
    }

    if (!to) {
        alert("Please select To date.");
        if (toInput) toInput.focus();
        return;
    }

    if (from > to) {
        alert("From date cannot be after To date.");
        return;
    }

    currentReportMode = "attendance";

    const thead = document.getElementById("reportHead");
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th>Serial</th>
                <th>Register No</th>
                <th>Name</th>
                <th>Total Days</th>
                <th>Present</th>
                <th>Absent</th>
                <th>%</th>
            </tr>`;
    }

    const body = document.getElementById("reportBody");
    const summaryEl = document.getElementById("reportSummary");
    if (body) body.innerHTML = `<tr><td colspan="7" style="padding:20px;">Calculating report metrics from database...</td></tr>`;

    const res = await apiFetch(`/reports/attendance?department=${encodeURIComponent(selectedDept)}&year=${encodeURIComponent(selectedYear)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);

    if (!res.ok || !Array.isArray(res.report) || res.report.length === 0) {
        if (summaryEl) {
            summaryEl.innerHTML = `<span style="color:#fca5a5;">⚠️ No student records found for ${selectedDept} - Year ${selectedYear}.</span>`;
        }
        if (body) {
            body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:25px;color:#fca5a5;">No records found for ${selectedDept} - Year ${selectedYear}. Please upload students or record attendance first.</td></tr>`;
        }
        return;
    }

    if (summaryEl) {
        summaryEl.innerHTML = `Showing report for: <strong>${selectedDept} - Year ${selectedYear}</strong> (${res.totalStudents} students) | Working/Tracked Days: <strong>${res.totalRecordedDays}</strong>`;
    }

    if (body) {
        body.innerHTML = "";
        const sortedReport = [...res.report].sort((a, b) => {
            const idA = String(a.studentId || a.id || '').trim().toUpperCase();
            const idB = String(b.studentId || b.id || '').trim().toUpperCase();
            return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' }) || idA.localeCompare(idB);
        });
        sortedReport.forEach((item, idx) => {
            const badgeColor = item.percentage >= 75 ? "#4ade80" : item.percentage >= 50 ? "#facc15" : "#f87171";
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${idx + 1}</td>
                <td>${item.studentId}</td>
                <td>${item.studentName}</td>
                <td>${item.totalDays}</td>
                <td>${item.present}</td>
                <td>${item.absent}</td>
                <td style="font-weight:bold; color:${badgeColor};">${item.percentage}%</td>
            `;
            body.appendChild(row);
        });
    }
}

/**
 * Export table to Excel (XLSX via SheetJS or CSV fallback)
 */
function downloadReport() {
    const deptEl = document.getElementById("reportDepartment");
    const yearEl = document.getElementById("reportYear");

    const selectedDept = deptEl ? deptEl.value.trim() : "";
    const selectedYear = yearEl ? yearEl.value.trim() : "";

    const table = document.querySelector("table");
    const body = document.getElementById("reportBody");

    if (!selectedDept || !selectedYear) {
        alert("Please select Department and Year first.");
        return;
    }

    if (!table || !body || body.children.length === 0 || body.innerText.includes("No records found") || body.innerText.includes("No uploaded students found")) {
        alert("No data available to download. Please click Generate or Student Data first.");
        return;
    }

    const deptName = selectedDept.replace(/\s+/g, "_");
    const yearName = `Year_${selectedYear}`;
    let filename = "";

    if (currentReportMode === "students") {
        filename = `Student_Data_${deptName}_${yearName}.xlsx`;
    } else {
        const fromInput = document.getElementById("fromDate");
        const toInput = document.getElementById("toDate");
        const from = fromInput ? fromInput.value : "";
        const to = toInput ? toInput.value : "";
        filename = `Attendance_Report_${deptName}_${yearName}_${from || "from"}_to_${to || "to"}.xlsx`;
    }

    // 1. SheetJS XLSX
    if (typeof XLSX !== "undefined") {
        try {
            const sheetTitle = (currentReportMode === "students") ? "Student Data" : "Attendance Report";
            const wb = XLSX.utils.table_to_book(table, { sheet: sheetTitle });
            XLSX.writeFile(wb, filename);
            return;
        } catch (err) {
            console.error("XLSX export failed, falling back to CSV:", err);
        }
    }

    // 2. CSV fallback
    try {
        const csv = [];
        const rows = table.querySelectorAll("tr");
        rows.forEach(row => {
            const cols = row.querySelectorAll("th, td");
            const rowData = [];
            cols.forEach(col => {
                const text = col.innerText.replace(/"/g, '""').trim();
                if (text === "Delete") return;
                rowData.push(`"${text}"`);
            });
            csv.push(rowData.join(","));
        });

        const csvString = "\uFEFF" + csv.join("\r\n");
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename.replace(/\.xlsx$/, ".csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (csvErr) {
        console.error("CSV download error:", csvErr);
        alert("Failed to download report: " + csvErr.message);
    }
}

/**
 * Permanently delete entire class data from MongoDB (Admin Only)
 */
async function deleteClassData() {
    const user = getCurrentUser();
    if (!user || user.role !== "admin") {
        alert("Only Admin is authorized to delete class student data.");
        return;
    }

    const deptEl = document.getElementById("reportDepartment");
    const yearEl = document.getElementById("reportYear");

    const selectedDept = deptEl ? deptEl.value.trim() : "";
    const selectedYear = yearEl ? yearEl.value.trim() : "";

    if (!selectedDept || !selectedYear) {
        alert("Please select both Department and Year to delete.");
        return;
    }

    const warningMsg = `⚠️ WARNING: You are about to permanently delete all student and attendance data from the database for:\n\n` +
        `• Department: ${selectedDept}\n` +
        `• Year: ${selectedYear}\n\n` +
        `This will delete all enrolled students and their attendance history in MongoDB Atlas. Do you want to proceed?`;

    if (!confirm(warningMsg)) return;
    if (!confirm(`FINAL CONFIRMATION: Permanently delete class data for ${selectedDept} Year ${selectedYear}?`)) return;

    const res = await apiFetch('/reports/class', {
        method: 'DELETE',
        body: {
            department: selectedDept,
            year: selectedYear
        }
    });

    if (res.ok) {
        alert(`✅ ${res.message}`);
        const body = document.getElementById("reportBody");
        if (body) body.innerHTML = "";
        const summaryEl = document.getElementById("reportSummary");
        if (summaryEl) {
            summaryEl.innerHTML = `<span style="color:#ef4444;font-weight:bold;">🗑️ Class data for ${selectedDept} - Year ${selectedYear} has been removed from database.</span>`;
        }
    } else {
        alert(`❌ Delete failed: ${res.message}`);
    }
}

/**
 * Return to appropriate dashboard based on user role
 */
function goBack() {
    const user = getCurrentUser();
    if (user && user.role === "staff") {
        window.location.href = "home.html";
    } else {
        window.location.href = "admin.html";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initReportPage();
});

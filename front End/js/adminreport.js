/* ========================================================
   adminreport.js - JavaScript for adminreport.html
   ======================================================== */

let currentUser = null;
let students = [];
let attendance = [];

// Department configurations (Information Technology, Tamil, and English removed for now)
const departments = {
    "Computer Science": { icon: "💻", name: "Computer Science" }
};

const years = ["1", "2", "3"];

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
 * Load data from localStorage
 */
function loadData() {
    students = JSON.parse(localStorage.getItem("students")) || [];
    attendance = JSON.parse(localStorage.getItem("attendance")) || [];
}

/**
 * Set default date range
 */
function setDefaultDates() {
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);

    const fromDateInput = document.getElementById("reportFromDate");
    const toDateInput = document.getElementById("reportToDate");

    if (fromDateInput) fromDateInput.value = oneWeekAgo.toISOString().split('T')[0];
    if (toDateInput) toDateInput.value = today.toISOString().split('T')[0];
}

/**
 * Calculate attendance statistics for a specific department and year
 */
function calculateAttendanceStats(department, year, fromDate, toDate) {
    // Get students for this department and year
    const classStudents = students.filter(s =>
        s.department && s.department.trim().toLowerCase() === department.toLowerCase() &&
        String(s.year).trim() === String(year)
    );

    if (classStudents.length === 0) {
        return {
            totalStudents: 0,
            totalDays: 0,
            totalPresent: 0,
            totalAbsent: 0,
            percentage: 0
        };
    }

    // Get attendance records for date range
    const dateRangeAttendance = attendance.filter(a => 
        a.date >= fromDate && a.date <= toDate
    );

    // Get unique dates in the range that have attendance records
    const attendanceDates = new Set();
    dateRangeAttendance.forEach(a => attendanceDates.add(a.date));

    // If no attendance dates, calculate working days in range
    let totalDays = attendanceDates.size;
    if (totalDays === 0) {
        totalDays = calculateWorkingDays(fromDate, toDate);
    }

    // Calculate total possible attendance (students × days)
    const totalPossibleAttendance = classStudents.length * totalDays;

    // Calculate absent count for this class
    let totalAbsent = 0;
    classStudents.forEach(student => {
        const studentAbsent = dateRangeAttendance.filter(a => 
            String(a.id).trim().toLowerCase() === String(student.id).trim().toLowerCase()
        ).length;
        totalAbsent += studentAbsent;
    });

    const totalPresent = Math.max(0, totalPossibleAttendance - totalAbsent);
    const percentage = totalPossibleAttendance > 0 
        ? Math.round((totalPresent / totalPossibleAttendance) * 100) 
        : 100;

    return {
        totalStudents: classStudents.length,
        totalDays: totalDays,
        totalPresent: totalPresent,
        totalAbsent: totalAbsent,
        percentage: percentage,
        totalPossible: totalPossibleAttendance
    };
}

/**
 * Calculate working days between two dates (excluding weekends)
 */
function calculateWorkingDays(fromDate, toDate) {
    if (!fromDate || !toDate) return 1;
    
    let count = 0;
    let current = new Date(fromDate);
    const end = new Date(toDate);
    
    while (current <= end) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) { // Exclude Sunday (0) and Saturday (6)
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    
    return Math.max(count, 1);
}

/**
 * Generate comprehensive admin report
 */
function generateAdminReport() {
    const fromDateInput = document.getElementById("reportFromDate");
    const toDateInput = document.getElementById("reportToDate");
    const messageArea = document.getElementById("messageArea");

    const fromDate = fromDateInput.value;
    const toDate = toDateInput.value;

    // Clear previous messages
    messageArea.innerHTML = "";

    // Validate dates
    if (!fromDate) {
        messageArea.innerHTML = '<span style="color: #ff6b6b;">Please select From date.</span>';
        fromDateInput.focus();
        return;
    }

    if (!toDate) {
        messageArea.innerHTML = '<span style="color: #ff6b6b;">Please select To date.</span>';
        toDateInput.focus();
        return;
    }

    if (fromDate > toDate) {
        messageArea.innerHTML = '<span style="color: #ff6b6b;">From date cannot be after To date.</span>';
        return;
    }

    loadData();

    const departmentReportsContainer = document.getElementById("departmentReports");
    departmentReportsContainer.innerHTML = "";

    let overallStats = {
        totalDepartments: 0,
        totalClasses: 0,
        totalStudents: 0,
        totalPresent: 0,
        totalPossible: 0
    };

    // Generate reports for each department
    Object.keys(departments).forEach(deptKey => {
        const dept = departments[deptKey];
        const deptStats = [];
        let deptHasData = false;

        // Check each year for this department
        years.forEach(year => {
            const stats = calculateAttendanceStats(deptKey, year, fromDate, toDate);
            deptStats.push({ year, stats });
            
            if (stats.totalStudents > 0) {
                deptHasData = true;
                overallStats.totalClasses++;
                overallStats.totalStudents += stats.totalStudents;
                overallStats.totalPresent += stats.totalPresent;
                overallStats.totalPossible += stats.totalPossible;
            }
        });

        if (deptHasData) {
            overallStats.totalDepartments++;
            createDepartmentSection(dept, deptStats, departmentReportsContainer);
        }
    });

    // Update summary statistics
    updateSummaryStats(overallStats, fromDate, toDate);
    
    // Show summary section
    document.getElementById("summarySection").style.display = "block";

    messageArea.innerHTML = '<span style="color: #51cf66;">✅ Admin report generated successfully!</span>';
}

/**
 * Create department section HTML
 */
function createDepartmentSection(dept, deptStats, container) {
    const deptSection = document.createElement("div");
    deptSection.className = "department-section";
    
    deptSection.innerHTML = `
        <div class="department-title">${dept.icon} ${dept.name} Department</div>
        <div class="years-grid" id="years-${dept.name.replace(/\s+/g, '')}">
            <!-- Year cards will be added here -->
        </div>
    `;
    
    container.appendChild(deptSection);
    
    const yearsGrid = deptSection.querySelector(".years-grid");
    
    deptStats.forEach(({ year, stats }) => {
        if (stats.totalStudents > 0) {
            const yearCard = document.createElement("div");
            yearCard.className = "year-card";
            
            yearCard.innerHTML = `
                <div class="year-title">Year ${year}</div>
                <div class="stats-row">
                    <span class="stat-label">Total Students:</span>
                    <span class="stat-value stat-total">${stats.totalStudents}</span>
                </div>
                <div class="stats-row">
                    <span class="stat-label">Working Days:</span>
                    <span class="stat-value stat-total">${stats.totalDays}</span>
                </div>
                <div class="stats-row">
                    <span class="stat-label">Present:</span>
                    <span class="stat-value stat-present">${stats.totalPresent}</span>
                </div>
                <div class="stats-row">
                    <span class="stat-label">Absent:</span>
                    <span class="stat-value stat-absent">${stats.totalAbsent}</span>
                </div>
                <div class="stats-row">
                    <span class="stat-label">Attendance:</span>
                    <span class="stat-value stat-percentage">${stats.percentage}%</span>
                </div>
            `;
            
            yearsGrid.appendChild(yearCard);
        }
    });
}

/**
 * Update summary statistics
 */
function updateSummaryStats(overallStats, fromDate, toDate) {
    document.getElementById("totalDepartments").textContent = overallStats.totalDepartments;
    document.getElementById("totalClasses").textContent = overallStats.totalClasses;
    document.getElementById("totalStudents").textContent = overallStats.totalStudents;
    
    const overallPercentage = overallStats.totalPossible > 0 
        ? Math.round((overallStats.totalPresent / overallStats.totalPossible) * 100)
        : 0;
    document.getElementById("overallPercentage").textContent = overallPercentage + "%";
}

/**
 * Download admin report as Excel
 */
function downloadAdminReport() {
    const fromDate = document.getElementById("reportFromDate").value;
    const toDate = document.getElementById("reportToDate").value;
    const messageArea = document.getElementById("messageArea");

    if (!fromDate || !toDate) {
        messageArea.innerHTML = '<span style="color: #ff6b6b;">Please generate report first by selecting dates and clicking Generate Report.</span>';
        return;
    }

    if (document.getElementById("summarySection").style.display === "none") {
        messageArea.innerHTML = '<span style="color: #ff6b6b;">Please generate report first.</span>';
        return;
    }

    try {
        // Create Excel workbook
        const wb = XLSX.utils.book_new();
        
        // Create summary sheet
        const summaryData = [
            ["Admin Attendance Report Summary"],
            ["Date Range", `${fromDate} to ${toDate}`],
            [""],
            ["Metric", "Value"],
            ["Total Departments", document.getElementById("totalDepartments").textContent],
            ["Total Classes", document.getElementById("totalClasses").textContent],
            ["Total Students", document.getElementById("totalStudents").textContent],
            ["Overall Attendance", document.getElementById("overallPercentage").textContent]
        ];

        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

        // Create detailed sheet
        const detailedData = [["Department", "Year", "Total Students", "Working Days", "Present", "Absent", "Percentage"]];

        Object.keys(departments).forEach(deptKey => {
            years.forEach(year => {
                const stats = calculateAttendanceStats(deptKey, year, fromDate, toDate);
                if (stats.totalStudents > 0) {
                    detailedData.push([
                        deptKey,
                        `Year ${year}`,
                        stats.totalStudents,
                        stats.totalDays,
                        stats.totalPresent,
                        stats.totalAbsent,
                        `${stats.percentage}%`
                    ]);
                }
            });
        });

        const detailedWs = XLSX.utils.aoa_to_sheet(detailedData);
        XLSX.utils.book_append_sheet(wb, detailedWs, "Detailed Report");

        // Generate filename
        const filename = `Admin_Attendance_Report_${fromDate}_to_${toDate}.xlsx`;
        
        // Download file
        XLSX.writeFile(wb, filename);
        
        messageArea.innerHTML = '<span style="color: #51cf66;">✅ Admin report downloaded successfully!</span>';

    } catch (error) {
        console.error("Download error:", error);
        messageArea.innerHTML = '<span style="color: #ff6b6b;">❌ Failed to download report: ' + error.message + '</span>';
    }
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
document.addEventListener("DOMContentLoaded", function() {
    loadAdminInfo();
    loadData();
    setDefaultDates();
});

/**
 * Handle logout
 */
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("token");
        window.location.href = "index.html";
    }
}
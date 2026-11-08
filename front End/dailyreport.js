/* ========================================================
   dailyreport.js - Daily College Attendance Report - FIXED
   ======================================================== */

let currentUser = null;
let currentReportData = null;
let selectedDate = null;

// Base URL for API calls - will fallback to localStorage if backend unavailable
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api' 
    : 'https://attendancesystem-ln29.onrender.com/api';

/**
 * Check authentication and load user info
 */
function checkAuth() {
    try {
        currentUser = JSON.parse(localStorage.getItem("currentUser"));
        
        if (!currentUser) {
            alert("Please login first.");
            window.location.href = "index.html";
            return false;
        }
        
        if (currentUser.role !== "admin") {
            alert("Access denied. Admin privileges required.");
            window.location.href = "index.html";
            return false;
        }
        
        return true;
    } catch (error) {
        console.error("Authentication check failed:", error);
        alert("Authentication error. Please login again.");
        window.location.href = "index.html";
        return false;
    }
}

/**
 * Load and display admin info
 */
function loadAdminInfo() {
    if (!checkAuth()) return;

    const userInfoElem = document.getElementById("userInfo");
    if (userInfoElem && currentUser) {
        const username = currentUser.name || currentUser.username || "admin";
        userInfoElem.innerText = `Admin: ${username}`;
    }
}

/**
 * Set default date to today
 */
function setDefaultDate() {
    const today = new Date();
    const dateInput = document.getElementById("reportDate");
    if (dateInput) {
        dateInput.value = today.toISOString().split('T')[0];
    }
}
/**
 * Show loading state
 */
function showLoading() {
    hideAllMessages();
    const loadingEl = document.getElementById("loadingMessage");
    if (loadingEl) {
        loadingEl.style.display = "block";
    }
    const tableEl = document.getElementById("reportTable");
    if (tableEl) {
        tableEl.style.display = "none";
    }
}

/**
 * Show error message
 */
function showError(message) {
    hideAllMessages();
    const errorEl = document.getElementById("errorMessage");
    if (errorEl) {
        errorEl.style.display = "block";
        errorEl.textContent = message;
    }
    const tableEl = document.getElementById("reportTable");
    if (tableEl) {
        tableEl.style.display = "none";
    }
}

/**
 * Show no data message
 */
function showNoData(message) {
    hideAllMessages();
    const noDataEl = document.getElementById("noDataMessage");
    if (noDataEl) {
        noDataEl.style.display = "block";
        noDataEl.textContent = message;
    }
    const tableEl = document.getElementById("reportTable");
    if (tableEl) {
        tableEl.style.display = "none";
    }
}

/**
 * Hide all status messages
 */
function hideAllMessages() {
    const elements = ['loadingMessage', 'errorMessage', 'noDataMessage'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = "none";
        }
    });
}

/**
 * Helper function to get year suffix (st, nd, rd, th)
 */
function getYearSuffix(year) {
    switch(year) {
        case '1': return 'st';
        case '2': return 'nd';
        case '3': return 'rd';
        default: return 'th';
    }
}
/**
 * Generate report data from localStorage
 */
function getLocalStorageReportData(selectedDate) {
    try {
        // Get submitted attendance data from localStorage
        const allLedger = JSON.parse(localStorage.getItem("all_attendance_ledger")) || [];
        const students = JSON.parse(localStorage.getItem("students")) || [];
        
        // Check if there are any submitted records for this date
        const dateRecords = allLedger.filter(entry => entry.date === selectedDate);
        
        // Departments for daily report (Information Technology, Tamil, and English removed for now)
        const departments = ['Computer Science'];
        const years = ['1', '2', '3'];
        const reportData = [];
        let serialNumber = 1;

        // Generate report for each department and year
        for (const department of departments) {
            for (const year of years) {
                // Get total enrolled students for this class from localStorage
                const totalStudents = students.filter(s =>
                    s.department && s.department.trim().toLowerCase() === department.toLowerCase() &&
                    String(s.year).trim() === String(year)
                ).length;

                if (totalStudents === 0) {
                    // Skip classes with no enrolled students
                    continue;
                }

                // Find submitted attendance for this class on this date
                const submittedRecord = dateRecords.find(entry =>
                    entry.department && entry.department.trim().toLowerCase() === department.toLowerCase() &&
                    String(entry.year).trim() === String(year)
                );

                const yearSuffix = getYearSuffix(year);
                
                if (!submittedRecord || !submittedRecord.records) {
                    // No attendance recorded
                    reportData.push({
                        serialNo: serialNumber++,
                        department: department,
                        classYear: `${year}${yearSuffix} Year`,
                        present: 'No attendance recorded',
                        absent: 'No attendance recorded',
                        percentage: 'No attendance recorded',
                        totalStudents: totalStudents
                    });
                } else {
                    // Calculate from actual submitted records
                    const records = submittedRecord.records;
                    const presentCount = records.filter(r => r.status === 'present').length;
                    const absentCount = records.filter(r => r.status === 'absent').length;
                    const percentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

                    reportData.push({
                        serialNo: serialNumber++,
                        department: department,
                        classYear: `${year}${yearSuffix} Year`,
                        present: presentCount,
                        absent: absentCount,
                        percentage: `${percentage}%`,
                        totalStudents: totalStudents
                    });
                }
            }
        }

        return reportData;
    } catch (error) {
        console.error('Error getting localStorage data:', error);
        return [];
    }
}
/**
 * Generate daily attendance report
 */
async function generateDailyReport() {
    const dateInput = document.getElementById("reportDate");
    const messageArea = document.getElementById("messageArea");
    
    if (!dateInput) {
        console.error("Date input element not found");
        return;
    }
    
    selectedDate = dateInput.value;

    // Clear previous messages
    if (messageArea) {
        messageArea.innerHTML = "";
    }

    // Validate date
    if (!selectedDate) {
        if (messageArea) {
            messageArea.innerHTML = '<span style="color: #ff6b6b;">Please select a date.</span>';
        }
        dateInput.focus();
        return;
    }

    showLoading();

    try {
        // Get report data (try localStorage first - more reliable)
        const reportData = getLocalStorageReportData(selectedDate);
        
        currentReportData = {
            success: true,
            date: selectedDate,
            reportData: reportData
        };
        
        displayReportTable(currentReportData);
        
        if (messageArea) {
            messageArea.innerHTML = '<span style="color: #51cf66;">✅ Daily report generated successfully!</span>';
        }

    } catch (error) {
        console.error('Error generating daily report:', error);
        showError(`Failed to generate report: ${error.message}`);
        if (messageArea) {
            messageArea.innerHTML = '<span style="color: #ff6b6b;">❌ Failed to generate daily report. Please check if students and attendance data exist.</span>';
        }
    }
}
/**
 * Display the report data in table format
 */
function displayReportTable(data) {
    const reportData = data.reportData || [];
    
    if (reportData.length === 0) {
        showNoData(`No classes found for ${selectedDate}. Please check if students are enrolled in classes.`);
        return;
    }

    // Group data by department for proper table display
    const departmentGroups = groupByDepartment(reportData);
    
    const tableBody = document.getElementById("reportTableBody");
    if (!tableBody) {
        showError("Report table not found. Please refresh the page.");
        return;
    }
    
    tableBody.innerHTML = "";

    let hasAnyData = false;

    Object.keys(departmentGroups).forEach((department) => {
        const classes = departmentGroups[department];
        
        classes.forEach((classData, classIndex) => {
            const row = document.createElement("tr");
            
            // Serial Number
            const serialCell = document.createElement("td");
            serialCell.textContent = classData.serialNo;
            row.appendChild(serialCell);

            // Department (merge cells for same department)
            if (classIndex === 0) {
                const deptCell = document.createElement("td");
                deptCell.textContent = department;
                deptCell.className = "dept-cell";
                deptCell.rowSpan = classes.length;
                row.appendChild(deptCell);
            }

            // Class Year
            const classCell = document.createElement("td");
            classCell.textContent = classData.classYear;
            classCell.className = "class-cell";
            row.appendChild(classCell);

            // Strength (Total Students)
            const strengthCell = document.createElement("td");
            strengthCell.textContent = classData.totalStudents;
            strengthCell.style.fontWeight = "bold";
            strengthCell.style.color = "#67e8f9";
            row.appendChild(strengthCell);

            // Present
            const presentCell = document.createElement("td");
            presentCell.textContent = classData.present;
            if (typeof classData.present === 'number' || (typeof classData.present === 'string' && !isNaN(classData.present))) {
                hasAnyData = true;
            }
            row.appendChild(presentCell);

            // Absent
            const absentCell = document.createElement("td");
            absentCell.textContent = classData.absent;
            row.appendChild(absentCell);

            // Percentage
            const percentageCell = document.createElement("td");
            percentageCell.textContent = classData.percentage;
            percentageCell.className = "percentage-cell";
            
            // Add color coding for percentages
            if (typeof classData.percentage === 'string' && classData.percentage.includes('%')) {
                const percentValue = parseInt(classData.percentage.replace('%', ''));
                if (!isNaN(percentValue)) {
                    if (percentValue >= 85) {
                        percentageCell.className += " percentage-high";
                    } else if (percentValue >= 70) {
                        percentageCell.className += " percentage-medium";
                    } else {
                        percentageCell.className += " percentage-low";
                    }
                }
            } else {
                percentageCell.className += " no-data";
            }
            
            row.appendChild(percentageCell);

            // Add no-data class to entire row if no attendance recorded
            if (classData.present === 'No attendance recorded' || classData.present === 'No data available') {
                row.className = "no-data";
            }

            tableBody.appendChild(row);
        });
    });

    hideAllMessages();
    const table = document.getElementById("reportTable");
    if (table) {
        table.style.display = "table";
    }

    if (!hasAnyData) {
        const messageArea = document.getElementById("messageArea");
        if (messageArea) {
            messageArea.innerHTML = '<span style="color: #ffc107;">⚠️ No attendance has been submitted for this date. Please ask staff to submit attendance first.</span>';
        }
    }
}
/**
 * Group report data by department
 */
function groupByDepartment(reportData) {
    const groups = {};
    
    reportData.forEach(item => {
        if (!groups[item.department]) {
            groups[item.department] = [];
        }
        groups[item.department].push(item);
    });
    
    return groups;
}

/**
 * Download PDF report
 */
async function downloadPDFReport() {
    const messageArea = document.getElementById("messageArea");
    
    if (!selectedDate) {
        if (messageArea) {
            messageArea.innerHTML = '<span style="color: #ff6b6b;">Please select a date and generate report first.</span>';
        }
        return;
    }

    if (!currentReportData || !currentReportData.reportData) {
        if (messageArea) {
            messageArea.innerHTML = '<span style="color: #ff6b6b;">Please generate the report first before downloading.</span>';
        }
        return;
    }

    try {
        // Check if jsPDF library is available
        if (typeof window.jspdf === 'undefined') {
            throw new Error('PDF library not loaded. Please refresh the page and try again.');
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const reportData = currentReportData.reportData;
        
        // Add title
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('Daily College Attendance Report', 14, 15);
        
        // Add date
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`Date: ${selectedDate}`, 14, 25);
        
        // Prepare table data
        const tableData = reportData.map(item => [
            item.serialNo,
            item.department,
            item.classYear,
            item.totalStudents,
            item.present,
            item.absent,
            item.percentage
        ]);
        
        // Add table using autoTable plugin
        doc.autoTable({
            startY: 35,
            head: [['S.No', 'Department', 'Classes', 'Strength', 'Present', 'Absent', 'Percentage']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [0, 123, 255],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 10,
                cellPadding: 3,
                halign: 'center'
            },
            columnStyles: {
                1: { halign: 'left' },  // Department left-aligned
                2: { halign: 'left' }   // Classes left-aligned
            },
            didParseCell: function(data) {
                // Color code percentages
                if (data.column.index === 6 && data.section === 'body') {
                    const value = data.cell.raw;
                    if (typeof value === 'string' && value.includes('%')) {
                        const percentValue = parseInt(value.replace('%', ''));
                        if (!isNaN(percentValue)) {
                            if (percentValue >= 85) {
                                data.cell.styles.textColor = [0, 128, 0]; // Green
                            } else if (percentValue >= 70) {
                                data.cell.styles.textColor = [255, 165, 0]; // Orange
                            } else {
                                data.cell.styles.textColor = [255, 0, 0]; // Red
                            }
                        }
                    }
                }
            }
        });
        
        // Add footer with generation time
        const pageCount = doc.internal.getNumberOfPages();
        const pageHeight = doc.internal.pageSize.height;
        
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont(undefined, 'normal');
            doc.text(
                `Generated on: ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`,
                14,
                pageHeight - 10
            );
        }
        
        // Generate filename
        const filename = `Daily_Attendance_Report_${selectedDate}.pdf`;
        
        // Download file
        doc.save(filename);
        
        if (messageArea) {
            messageArea.innerHTML = '<span style="color: #51cf66;">✅ PDF report downloaded successfully!</span>';
        }

    } catch (error) {
        console.error('PDF download error:', error);
        if (messageArea) {
            messageArea.innerHTML = '<span style="color: #ff6b6b;">❌ Failed to download PDF report: ' + error.message + '</span>';
        }
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
    try {
        loadAdminInfo();
        setDefaultDate();
        console.log('Daily Report page initialized successfully');
    } catch (error) {
        console.error('Error initializing daily report page:', error);
    }
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

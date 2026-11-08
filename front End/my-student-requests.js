/* ==========================================================================
   my-student-requests.js - Staff View My Requests Logic
   ========================================================================== */

const BASE_URL = 'http://localhost:5000/api';

document.addEventListener("DOMContentLoaded", function() {
    const currentUser = getCurrentUser();
    
    // Check if staff is logged in
    if (!currentUser) {
        alert("Please login first.");
        window.location.href = "index.html";
        return;
    }

    // Role check - only staff can view this page
    if (currentUser.role !== 'staff') {
        alert("Access denied. This page is for staff only.");
        window.location.href = "index.html";
        return;
    }

    const tableContainer = document.getElementById("tableContainer");
    if (!tableContainer) return;

    loadRequests();
});

/**
 * Load student requests from backend
 */
async function loadRequests() {
    const currentUser = getCurrentUser();
    const tableContainer = document.getElementById("tableContainer");

    if (!currentUser || !tableContainer) return;

    tableContainer.innerHTML = '<div class="loading-message">Loading your requests...</div>';

    try {
        const token = localStorage.getItem("token");
        
        const response = await fetch(`${BASE_URL}/student-requests/my-requests`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            displayRequests(data.requests || []);
        } else {
            tableContainer.innerHTML = `<div class="error-message">❌ ${data.message || 'Failed to load requests'}</div>`;
        }

    } catch (error) {
        console.error("Error loading requests:", error);
        tableContainer.innerHTML = '<div class="error-message">❌ Network error. Please check your connection.</div>';
    }
}

/**
 * Display requests in table
 */
function displayRequests(requests) {
    const tableContainer = document.getElementById("tableContainer");

    if (!requests || requests.length === 0) {
        tableContainer.innerHTML = `
            <div class="empty-state">
                <h3>📋 No Requests Found</h3>
                <p>You haven't submitted any student registration requests yet.</p>
                <p style="margin-top: 10px;"><a href="request-student.html" style="color: #0d6efd;">Submit a request &rarr;</a></p>
            </div>
        `;
        return;
    }

    let tableHTML = `
        <table class="requests-table">
            <thead>
                <tr>
                    <th>S.No</th>
                    <th>Student Name</th>
                    <th>Register No</th>
                    <th>Department</th>
                    <th>Year</th>
                    <th>Request Date</th>
                    <th>Status</th>
                    <th>Admin Remarks</th>
                </tr>
            </thead>
            <tbody>
    `;

    requests.forEach((request, index) => {
        const requestDate = new Date(request.createdAt).toLocaleDateString();
        const statusClass = `status-${request.status}`;
        const statusText = request.status.charAt(0).toUpperCase() + request.status.slice(1);

        tableHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${request.studentName}</td>
                <td><strong>${request.studentId}</strong></td>
                <td>${request.department}</td>
                <td>${request.year}${getYearSuffix(request.year)} Year</td>
                <td>${requestDate}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${request.adminRemarks || ''}">
                    ${request.adminRemarks || '-'}
                </td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    tableContainer.innerHTML = tableHTML;
}

/**
 * Helper function for year suffix
 */
function getYearSuffix(year) {
    if (year === '1') return 'st';
    if (year === '2') return 'nd';
    if (year === '3') return 'rd';
    return 'th';
}

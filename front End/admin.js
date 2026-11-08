/* ========================================================
   admin.js - JavaScript for admin.html
   ======================================================== */

const BASE_URL = 'http://localhost:5000/api';

/**
 * Check if user is authenticated and has admin privileges.
 * Redirects staff users to home.html and unauthenticated users to index.html.
 */
function checkAuth() {
    let currentUser = null;
    try {
        currentUser = JSON.parse(localStorage.getItem("currentUser"));
    } catch (e) {
        currentUser = null;
    }

    if (!currentUser) {
        window.location.href = "index.html";
        return null;
    }

    if (currentUser.role !== "admin") {
        alert("Access denied. Admin privileges required.");
        window.location.href = "home.html";
        return null;
    }

    return currentUser;
}

/**
 * Display admin username inside <h2 id="userInfo"></h2>
 */
function loadAdminInfo() {
    const currentUser = checkAuth();
    if (!currentUser) return;

    const userInfoElem = document.getElementById("userInfo");
    if (!userInfoElem) return;

    const username = currentUser.name || currentUser.username || "admin";
    userInfoElem.innerText = `Admin: ${username}`;
}

/**
 * Fetch and display total number of Pending requests on Admin dashboard
 */
async function loadPendingRequestsCount() {
    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${BASE_URL}/student-requests/pending`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            const count = (data.summary && data.summary.pending !== undefined)
                ? data.summary.pending
                : (data.count !== undefined ? data.count : (data.requests ? data.requests.length : 0));

            const badge = document.getElementById("pendingBadge");
            if (badge) {
                badge.textContent = `${count} Pending`;
                badge.style.display = count > 0 ? "inline-block" : "none";
            }
        }
    } catch (e) {
        console.error("Failed to load pending requests count:", e);
    }
}

/**
 * Delete student data for a specified Department and Year
 */
async function deleteClassData() {
    const dept = prompt("Enter Department to delete students from (e.g. Computer Science):");
    if (!dept) return;
    const year = prompt("Enter Year to delete (1, 2, or 3):");
    if (!year) return;

    if (confirm(`Are you sure you want to delete all students for ${dept} - Year ${year}?`)) {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${BASE_URL}/reports/class`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ department: dept.trim(), year: year.trim() })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                alert(`✅ Successfully deleted all students for ${dept} - Year ${year}.`);
            } else {
                alert(`❌ Failed to delete: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Delete class data error:", error);
            alert(`❌ Network error. Please check your connection. ${error.message}`);
        }
    }
}

/**
 * Logout: clear session and redirect to index.html.
 */
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        try {
            fetch(`${BASE_URL}/auth/logout`, { method: "POST" }).catch(() => {});
        } catch (e) {}

        localStorage.removeItem("currentUser");
        localStorage.removeItem("token");
        localStorage.removeItem("department");
        localStorage.removeItem("year");

        window.location.href = "index.html";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadAdminInfo();
    loadPendingRequestsCount();
});

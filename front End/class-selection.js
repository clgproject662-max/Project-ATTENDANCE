/* ==========================================================================
   class-selection.js - Choose CS1 / CS2 / CS3 after the common staff login
   ========================================================================== */

const BASE_URL = 'http://localhost:5000/api';

const CLASS_INFO = {
    CS1: { year: '1' },
    CS2: { year: '2' },
    CS3: { year: '3' }
};

let selecting = false;

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("currentUser")) || null;
    } catch (e) {
        return null;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const user = getStoredUser();

    if (!token || !user) {
        window.location.href = "index.html";
        return;
    }

    if (user.role === "admin") {
        window.location.href = "admin.html";
        return;
    }

    // A class is already active for this session
    if (user.role === "staff" && user.year && user.year !== "All") {
        window.location.href = "home.html";
        return;
    }

    const staffNameEl = document.getElementById("staffName");
    if (staffNameEl) {
        staffNameEl.innerText = `Logged in as ${user.name || user.username || "CS Staff"}`;
    }
});

async function selectClass(classId) {
    const info = CLASS_INFO[classId];
    const msgEl = document.getElementById("selectionMsg");

    if (!info || selecting) return;

    const token = localStorage.getItem("token");
    const user = getStoredUser();

    if (!token || !user) {
        window.location.href = "index.html";
        return;
    }

    selecting = true;

    if (msgEl) {
        msgEl.style.color = "#ffffff";
        msgEl.innerText = `Opening ${classId}...`;
    }

    // Offline mode: keep the local demo working without the backend
    if (token.startsWith("local-token-")) {
        const selectedUser = {
            ...user,
            name: `CS Staff (Year ${info.year})`,
            year: info.year,
            classId: classId,
            selectedClass: classId
        };

        localStorage.setItem("token", `local-token-cs${info.year}`);
        localStorage.setItem("currentUser", JSON.stringify(selectedUser));
        localStorage.setItem("department", selectedUser.department || "Computer Science");
        localStorage.setItem("year", info.year);
        localStorage.removeItem("students");

        window.location.href = "home.html";
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/auth/select-class`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ classId })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.token) {
            if (msgEl) {
                msgEl.style.color = "#fca5a5";
                msgEl.innerText = data.message || "Unable to select class. Please try again.";
            }
            selecting = false;
            return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("currentUser", JSON.stringify({ ...data.user, selectedClass: classId }));
        localStorage.setItem("department", data.user.department || "Computer Science");
        localStorage.setItem("year", String(data.user.year));
        localStorage.removeItem("students");

        // Cache only this class's roster so other classes never leak into the UI
        try {
            const studentsRes = await fetch(`${BASE_URL}/students`, {
                headers: { 'Authorization': `Bearer ${data.token}` }
            });
            if (studentsRes.ok) {
                const studentsData = await studentsRes.json();
                if (Array.isArray(studentsData.students)) {
                    localStorage.setItem("students", JSON.stringify(studentsData.students));
                }
            }
        } catch (e) {
            // The dashboard will sync again when the page opens
        }

        window.location.href = "home.html";
    } catch (error) {
        console.error("Select class failed:", error);
        if (msgEl) {
            msgEl.style.color = "#fca5a5";
            msgEl.innerText = "Cannot connect to server. Ensure the backend is running on port 5000.";
        }
        selecting = false;
    }
}

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("token");
        localStorage.removeItem("department");
        localStorage.removeItem("year");
        window.location.href = "index.html";
    }
}

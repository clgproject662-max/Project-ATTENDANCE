/* ==========================================================================
   common.js - Shared utilities, API client & session management
   ========================================================================== */

const BASE_URL = 'http://localhost:5000/api';

const departments = {
    cs: "Computer Science",
    it: "Information Technology",
    tam: "Tamil",
    eng: "English"
};

/**
 * Universal API Fetch Wrapper with JWT authorization and error handling
 */
async function apiFetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const token = localStorage.getItem("token");

    const headers = {
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        ...options.headers
    };

    // If body is object and not FormData, stringify and add application/json
    let body = options.body;
    if (body && typeof body === 'object' && !(body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            body
        });

        // Handle expired or unauthorized token
        if (response.status === 401) {
            console.warn("Session expired or unauthorized. Redirecting to login.");
            localStorage.removeItem("token");
            localStorage.removeItem("currentUser");
            if (!window.location.href.includes("index.html")) {
                window.location.href = "index.html";
            }
            return { ok: false, status: 401, message: "Session expired" };
        }

        const data = await response.json().catch(() => ({}));
        return {
            ok: response.ok,
            status: response.status,
            ...data
        };
    } catch (error) {
        console.error(`API Fetch Error (${endpoint}):`, error);
        return {
            ok: false,
            status: 0,
            message: "Unable to connect to backend server. Make sure server is running on port 5000."
        };
    }
}

/**
 * Retrieve current user session from localStorage
 */
function getCurrentUser() {
    return JSON.parse(localStorage.getItem("currentUser")) || null;
}

/**
 * Global logout function
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

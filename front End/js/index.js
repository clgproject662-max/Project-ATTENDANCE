/* ==========================================================================
   index.js - Login Page Logic (index.html)
   ========================================================================== */

async function login() {
    const userField = document.getElementById("loginUser");
    const passField = document.getElementById("loginPass");
    const msgEl = document.getElementById("loginMsg");

    if (!userField || !passField) return;

    const username = userField.value.trim();
    const password = passField.value.trim();

    if (!username || !password) {
        if (msgEl) msgEl.innerText = "Please enter Username and Password";
        return;
    }

    if (msgEl) {
        msgEl.style.color = "#ffffff";
        msgEl.innerText = "Authenticating with server...";
    }

    try {
        const result = await apiFetch('/auth/login', {
            method: 'POST',
            body: {
                username,
                password
            }
        });

        if (result.ok && result.token) {
            // Save authenticated token and user profile
            localStorage.setItem("token", result.token);
            localStorage.setItem("currentUser", JSON.stringify(result.user));
            localStorage.setItem("department", result.user.department || "");
            localStorage.setItem("year", result.user.year || "");

            if (msgEl) {
                msgEl.style.color = "#86efac";
                msgEl.innerText = "Login successful! Redirecting...";
            }

            setTimeout(() => {
                if (result.user.role === "admin") {
                    window.location.href = "admin.html";
                } else {
                    window.location.href = "home.html";
                }
            }, 300);
            return;
        }

        // If backend returned error message
        if (msgEl) {
            msgEl.style.color = "#fca5a5";
            msgEl.innerText = result.message || "Invalid username or password";
        }
    } catch (error) {
        console.error("Login request failed:", error);
        if (msgEl) {
            msgEl.style.color = "#fca5a5";
            msgEl.innerText = "Cannot connect to server. Ensure backend is running (port 5000).";
        }
    }
}

// Allow Enter key to trigger login
document.addEventListener("DOMContentLoaded", () => {
    const passField = document.getElementById("loginPass");
    const userField = document.getElementById("loginUser");

    [passField, userField].forEach(field => {
        if (field) {
            field.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    login();
                }
            });
        }
    });
});

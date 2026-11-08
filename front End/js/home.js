/* ==========================================================================
   home.js - Staff Dashboard Logic (home.html)
   ========================================================================== */

async function loadUser() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    const userInfoEl = document.getElementById("userInfo");
    if (userInfoEl) userInfoEl.innerText = "Loading profile...";

    const res = await apiFetch('/auth/me');

    if (res.ok && res.user) {
        const user = res.user;
        localStorage.setItem("currentUser", JSON.stringify(user));
        localStorage.setItem("department", user.department || "");
        localStorage.setItem("year", user.year || "");

        if (userInfoEl) {
            const dept = user.department ? `${user.department}` : "";
            const year = user.year && user.year !== "All" ? ` - Year ${user.year}` : "";
            userInfoEl.innerText = `Welcome, ${user.name || user.username} (${dept}${year})`;
        }
    } else {
        // Fallback to cached profile if server offline
        const user = JSON.parse(localStorage.getItem("currentUser"));
        if (user && userInfoEl) {
            userInfoEl.innerText = `Welcome, ${user.name || user.username} (${user.department} - Year ${user.year})`;
        } else {
            window.location.href = "index.html";
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadUser();
});

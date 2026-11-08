/* ==========================================================================
   register.js - Student Registration Logic (register.html)
   ========================================================================== */

/**
 * Register a student manually by Name and ID in MongoDB backend
 */
async function addStudent() {
    const nameInput = document.getElementById("studentName");
    const idInput = document.getElementById("studentId");
    const resultEl = document.getElementById("result");

    const studentName = nameInput ? nameInput.value.trim() : "";
    const studentId = idInput ? idInput.value.trim() : "";

    if (!studentName || !studentId) {
        alert("Please enter both Student Name and Student ID / Register Number.");
        return;
    }

    const user = getCurrentUser();
    const department = (user && user.department && user.department !== 'Administration')
        ? user.department
        : 'Computer Science';
    const year = (user && user.year && user.year !== 'All') ? user.year : '1';

    if (resultEl) resultEl.innerHTML = "<span>Registering student in database...</span>";

    const res = await apiFetch('/students', {
        method: 'POST',
        body: {
            studentName,
            studentId,
            department,
            year
        }
    });

    if (res.ok) {
        alert(`✅ Student "${studentName}" (${studentId}) registered successfully in MongoDB!`);
        if (nameInput) nameInput.value = "";
        if (idInput) idInput.value = "";
        if (resultEl) {
            resultEl.innerHTML = `<span style="color:#86efac;font-weight:bold;">✅ Student ${studentName} (${studentId}) registered successfully!</span>`;
        }
    } else {
        alert(`❌ Registration failed: ${res.message || 'Server error'}`);
        if (resultEl) {
            resultEl.innerHTML = `<span style="color:#fca5a5;">❌ ${res.message || 'Registration failed'}</span>`;
        }
    }
}

// Setup Excel Upload Form on register page
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("uploadForm");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const fileInput = document.getElementById("file");
        const resultEl = document.getElementById("result");
        const file = fileInput ? fileInput.files[0] : null;

        if (!file) {
            if (resultEl) resultEl.innerHTML = "<span style='color:#fca5a5;'>Please select an Excel file</span>";
            return;
        }

        const user = getCurrentUser();
        const department = (user && user.department && user.department !== 'Administration')
            ? user.department
            : 'Computer Science';
        const year = (user && user.year && user.year !== 'All') ? user.year : '1';

        const formData = new FormData();
        formData.append("file", file);
        formData.append("department", department);
        formData.append("year", year);

        if (resultEl) resultEl.innerHTML = "<span>Uploading file to server...</span>";

        const res = await apiFetch('/students/upload', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            if (resultEl) {
                resultEl.innerHTML = `<span style="color:#86efac;font-weight:bold;">✅ Upload Successful — ${res.count || 'all'} students saved into MongoDB!</span>`;
            }
            if (fileInput) fileInput.value = "";
        } else {
            if (resultEl) {
                resultEl.innerHTML = `<span style="color:#fca5a5;">❌ Upload failed: ${res.message || 'Server error'}</span>`;
            }
        }
    });
});

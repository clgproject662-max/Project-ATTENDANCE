/* ==========================================================================
   student-request-form.js - Staff Request Student Form Logic
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function() {
    const currentUser = getCurrentUser();
    
    // Check if staff is logged in
    if (!currentUser || currentUser.role !== 'staff') {
        alert("Please login first.");
        window.location.href = "index.html";
        return;
    }

    const form = document.getElementById("requestForm");
    const errorMsg = document.getElementById("errorMsg");
    const successMsg = document.getElementById("successMsg");

    if (!form) return;

    form.addEventListener("submit", function(e) {
        e.preventDefault();

        // Clear messages
        if (errorMsg) errorMsg.style.display = "none";
        if (successMsg) successMsg.style.display = "none";

        // Get form values
        const studentName = document.getElementById("studentName").value.trim();
        const studentId = document.getElementById("studentId").value.trim().toUpperCase();
        const department = document.getElementById("department").value;
        const year = document.getElementById("year").value;
        const phone = document.getElementById("phone").value.trim();
        const parentPhone = document.getElementById("parentPhone").value.trim();

        // Validation
        if (!studentName) {
            showError("Student name is required.");
            return;
        }
        if (!studentId) {
            showError("Roll No / Register No is required.");
            return;
        }
        if (!department) {
            showError("Department is required.");
            return;
        }
        if (!year) {
            showError("Year is required.");
            return;
        }

        // Check if student already exists
        if (studentAlreadyExists(studentId, department, year)) {
            showError("Student with this Roll No already exists in this department/year.");
            return;
        }

        // Create request object
        const request = {
            id: Date.now().toString(),
            studentName: studentName,
            studentId: studentId,
            department: department,
            year: year,
            phone: phone,
            parentPhone: parentPhone,
            staffUsername: currentUser.username,
            staffName: currentUser.name,
            status: "pending",
            submittedAt: new Date().toISOString()
        };

        // Save request to localStorage
        let requests = JSON.parse(localStorage.getItem("studentRequests")) || [];
        requests.push(request);
        localStorage.setItem("studentRequests", JSON.stringify(requests));

        // Show success
        if (successMsg) {
            successMsg.innerText = "✅ Request submitted successfully! Admin will review it.";
            successMsg.style.display = "block";
            
            // Clear form
            form.reset();
            
            // Redirect after delay
            setTimeout(() => {
                window.location.href = "my-student-requests.html";
            }, 1500);
        }
    });
});

/**
 * Check if student already exists
 */
function studentAlreadyExists(studentId, department, year) {
    const students = JSON.parse(localStorage.getItem("students")) || [];
    return students.some(s => 
        (s.studentId || s.id).toUpperCase() === studentId &&
        (s.department || "").toLowerCase() === department.toLowerCase() &&
        String(s.year) === String(year)
    );
}

/**
 * Show error message
 */
function showError(message) {
    const errorMsg = document.getElementById("errorMsg");
    if (errorMsg) {
        errorMsg.innerText = "⚠️ " + message;
        errorMsg.style.display = "block";
        setTimeout(() => {
            errorMsg.style.display = "none";
        }, 3000);
    }
}
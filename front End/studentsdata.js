/* ========================================================
   studentsdata.js - JavaScript for studentsdata.html
   ======================================================== */

let currentUser = null;
const BASE_URL = 'http://localhost:5000/api';
let students = [];
let attendance = [];
let selectedDepartment = "";
let filteredStudents = [];

/**
 * Natural (numeric-aware) roll number comparator.
 * Correctly sorts 24UCS010 before 24UCS020 before 24UCS100.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareRollNumbers(a, b) {
    const strA = String(a || '').trim().toUpperCase();
    const strB = String(b || '').trim().toUpperCase();
    const chunksA = strA.match(/(\d+|[^\d]+)/g) || [strA];
    const chunksB = strB.match(/(\d+|[^\d]+)/g) || [strB];
    const len = Math.max(chunksA.length, chunksB.length);
    for (let i = 0; i < len; i++) {
        const ca = chunksA[i] || '';
        const cb = chunksB[i] || '';
        if (/^\d+$/.test(ca) && /^\d+$/.test(cb)) {
            const diff = parseInt(ca, 10) - parseInt(cb, 10);
            if (diff !== 0) return diff;
        } else {
            if (ca < cb) return -1;
            if (ca > cb) return 1;
        }
    }
    return 0;
}

/**
 * Sort students array by roll number (studentId) in ascending numeric order.
 * Returns a new sorted array; does not mutate the original.
 * @param {Array} arr
 * @returns {Array}
 */
function sortStudentsByRollNumber(arr) {
    if (!Array.isArray(arr)) return [];
    return [...arr].sort((a, b) =>
        compareRollNumbers(a.studentId || a.id || '', b.studentId || b.id || '')
    );
}

// Department data with icons
const departments = {
    "Computer Science": { icon: "", name: "Computer Science" },
    "Information Technology": { icon: "🌐", name: "Information Technology" },
    "Tamil": { icon: "", name: "Tamil" },
    "English": { icon: "", name: "English" }
};

/**
 * Check authentication and load user info
 * Allows both Admin and Staff users
 */
function checkAuth() {
    currentUser = JSON.parse(localStorage.getItem("currentUser"));

    // Allow admin and staff users
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "staff")) {
        alert("Access denied. Admin or Staff privileges required.");
        window.location.href = "index.html";
        return false;
    }

    return true;
}

/**
 * Check if current user has permission to edit student data.
 * Rule: ONLY CS1 Staff can edit or delete students. Admin and others have view-only access.
 */
function canEditStudents() {
    return currentUser && currentUser.role === "staff" && currentUser.username === "cs1";
}

/**
 * CS1 staff can delete a single student from their own class.
 */
function canDeleteStudents() {
    return currentUser && currentUser.role === "staff" && currentUser.username === "cs1";
}

/**
 * Admin removes students in bulk (whole class) instead of one by one.
 */
function canBulkDeleteStudents() {
    return currentUser && currentUser.role === "admin";
}

/**
 * Load and display user info
 */
function loadUserInfo() {
    if (!checkAuth()) return;

    const userInfoElem = document.getElementById("userInfo");
    if (userInfoElem) {
        const username = currentUser.name || currentUser.username || "user";
        const role = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
        userInfoElem.innerText = `${role}: ${username}`;
    }
    
    // Set page title and access indicator based on user role
    const pageTitle = document.getElementById("pageTitle");
    const backToAdminBtns = document.querySelectorAll('button[onclick="goBackToAdmin()"]');
    const departmentSelectionTitle = document.querySelector('#departmentSelection h4');
    
    if (canEditStudents()) {
        if (pageTitle) {
            pageTitle.innerHTML = `Manage Students Data <span style="display: inline-block; font-size: 13px; font-weight: 600; background: #198754; color: white; padding: 4px 12px; border-radius: 12px; margin-left: 8px;">✏️ CS1 Staff (Edit Mode)</span>`;
        }
        backToAdminBtns.forEach(btn => btn.textContent = "Back to Dashboard");
        if (departmentSelectionTitle) departmentSelectionTitle.textContent = "Select Department to View & Edit Students:";
    } else if (currentUser && currentUser.role === "admin") {
        if (pageTitle) {
            pageTitle.innerHTML = `Students Data <span style="display: inline-block; font-size: 13px; font-weight: 600; background: #0284c7; color: white; padding: 4px 12px; border-radius: 12px; margin-left: 8px;">🛠️ Admin (Delete Whole Class)</span>`;
        }
        backToAdminBtns.forEach(btn => btn.textContent = "Back to Admin Panel");
        if (departmentSelectionTitle) departmentSelectionTitle.textContent = "Select Department to View & Delete Students:";
    } else {
        if (pageTitle) {
            pageTitle.innerHTML = `Students Data <span style="display: inline-block; font-size: 13px; font-weight: 600; background: #64748b; color: white; padding: 4px 12px; border-radius: 12px; margin-left: 8px;">👁️ View Only</span>`;
        }
        backToAdminBtns.forEach(btn => btn.textContent = "Back to Dashboard");
        if (departmentSelectionTitle) departmentSelectionTitle.textContent = "Select Department to View Students:";
    }

    const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");
    if (bulkDeleteBtn) {
        bulkDeleteBtn.style.display = canBulkDeleteStudents() ? "inline-block" : "none";
    }
}

/**
 * Load data from localStorage
 */
async function loadData() {
    // Fetch latest data from backend if authenticated, otherwise fallback to localStorage
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const [studentsRes, attendanceRes] = await Promise.all([
                fetch(`${BASE_URL}/students`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${BASE_URL}/attendance`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);
            const studentsData = await studentsRes.json();
            const attendanceData = await attendanceRes.json();
            if (studentsData.success && Array.isArray(studentsData.students)) {
                students = studentsData.students;
            } else {
                console.warn('Failed to fetch students from API, using localStorage');
                students = JSON.parse(localStorage.getItem('students')) || [];
            }
            if (attendanceData.success && Array.isArray(attendanceData.records)) {
                attendance = attendanceData.records;
            } else {
                console.warn('Failed to fetch attendance from API, using localStorage');
                attendance = JSON.parse(localStorage.getItem('attendance')) || [];
            }
        } catch (err) {
            console.error('Error fetching data from API:', err);
            students = JSON.parse(localStorage.getItem('students')) || [];
            attendance = JSON.parse(localStorage.getItem('attendance')) || [];
        }
    } else {
        // No token – fall back to localStorage (e.g., during development)
        students = JSON.parse(localStorage.getItem('students')) || [];
        attendance = JSON.parse(localStorage.getItem('attendance')) || [];
    }
}

/**
 * Save data to localStorage
 */
function saveData() {
    localStorage.setItem("students", JSON.stringify(students));
    localStorage.setItem("attendance", JSON.stringify(attendance));
}

/**
 * Generate department dropdown options
 */
function generateDepartmentCards() {
    const departmentDropdown = document.getElementById("departmentDropdown");
    departmentDropdown.innerHTML = "";

    Object.keys(departments).forEach(deptKey => {
        const dept = departments[deptKey];
        
        // Count students in this department
        const deptStudents = students.filter(s => 
            s.department && s.department.trim().toLowerCase() === deptKey.toLowerCase()
        );

        const dropdownItem = document.createElement("div");
        dropdownItem.className = "dropdown-item";
        dropdownItem.onclick = () => selectDepartmentFromDropdown(deptKey);
        
        dropdownItem.innerHTML = `
            <div class="dropdown-dept-info">
                <span class="dropdown-icon">${dept.icon}</span>
                <span class="dropdown-dept-name">${dept.name}</span>
            </div>
            <div class="dropdown-student-count">${deptStudents.length} Students</div>
        `;

        departmentDropdown.appendChild(dropdownItem);
    });
}

/**
 * Toggle dropdown open/close
 */
function toggleDropdown() {
    const dropdown = document.getElementById("departmentDropdown");
    const arrow = document.querySelector(".dropdown-arrow");
    
    dropdown.classList.toggle("open");
    arrow.classList.toggle("rotated");
}

/**
 * Close dropdown when clicking outside
 */
document.addEventListener('click', function(event) {
    const dropdownContainer = document.querySelector('.dropdown-container');
    if (!dropdownContainer.contains(event.target)) {
        const dropdown = document.getElementById("departmentDropdown");
        const arrow = document.querySelector(".dropdown-arrow");
        
        dropdown.classList.remove("open");
        arrow.classList.remove("rotated");
    }
});

/**
 * Select department from dropdown
 */
function selectDepartmentFromDropdown(department) {
    // Close dropdown
    const dropdown = document.getElementById("departmentDropdown");
    const arrow = document.querySelector(".dropdown-arrow");
    dropdown.classList.remove("open");
    arrow.classList.remove("rotated");
    
    // Update selected text
    const selectedText = document.getElementById("selectedDeptText");
    selectedText.textContent = departments[department].icon + " " + departments[department].name;
    
    // Proceed with selection
    selectDepartment(department);
}

/**
 * Select a department and show students
 */
function selectDepartment(department) {
    selectedDepartment = department;
    
    // Hide department selection and show students view
    document.getElementById("departmentSelection").style.display = "none";
    document.getElementById("studentsDataView").style.display = "block";
    
    // Update selected department info
    document.getElementById("selectedDeptInfo").innerHTML = `
        ${departments[department].icon} ${departments[department].name} Department
    `;
    
    // Reset year filter
    document.getElementById("dataYear").value = "";
    
    // Load students for this department
    loadStudentsForDepartment();
}

/**
 * Load students for selected department
 */
function loadStudentsForDepartment() {
    const yearFilter = document.getElementById("dataYear").value.trim();
    
    // Filter students by department
    filteredStudents = students.filter(s =>
        s.department && s.department.trim().toLowerCase() === selectedDepartment.toLowerCase()
    );

    // Apply year filter if selected
    if (yearFilter) {
        filteredStudents = filteredStudents.filter(s =>
            String(s.year).trim() === String(yearFilter)
        );
    }

    // Sort by roll number in ascending numeric order
    filteredStudents = sortStudentsByRollNumber(filteredStudents);

    displayStudentsTable();
}

/**
 * Apply year filter
 */
function applyYearFilter() {
    loadStudentsForDepartment();
}

/**
 * Display students in table
 */
function displayStudentsTable() {
    const tbody = document.getElementById("studentsBody");
    const statsDiv = document.getElementById("studentsStats");
    const messageArea = document.getElementById("messageArea");
    const yearFilter = document.getElementById("dataYear").value.trim();

    tbody.innerHTML = "";
    messageArea.innerHTML = "";

    if (filteredStudents.length === 0) {
        const yearText = yearFilter ? ` - Year ${yearFilter}` : "";
        statsDiv.innerHTML = `<span style="color: #ffeb3b;">⚠️ No students found for ${selectedDepartment}${yearText}</span>`;
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 25px; color: #ffeb3b;">No student records found. Please upload or register students first.</td></tr>`;
        return;
    }

    // Display statistics
    const yearText = yearFilter ? ` - Year ${yearFilter}` : "";
    statsDiv.innerHTML = `Showing Students: <strong>${selectedDepartment}${yearText}</strong> (Total: <strong>${filteredStudents.length}</strong> students)`;

    // Display students in table
    filteredStudents.forEach((student, index) => {
        const displaySerial = index + 1; // Position in roll-number sorted order
        const studentId = student.studentId || student.id;
        const studentName = student.studentName || student.name;
        
        // Get initials for placeholder
        const initials = getInitials(studentName);
        
        // Photo cell HTML
        let photoHTML = '';
        if (student.photo) {
            photoHTML = `<img src="${student.photo}" alt="${studentName}" class="student-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';">
                        <div class="student-photo-placeholder" style="display:none;">${initials}</div>`;
        } else {
            photoHTML = `<div class="student-photo-placeholder">${initials}</div>`;
        }

        const isEditable = canEditStudents();
        const isDeletable = canDeleteStudents();
        let actionCellHTML = "";

        if (isEditable || isDeletable) {
            const editButton = isEditable ? `
                    <button style="background-color: #f59e0b; color: white; padding: 5px 12px; font-size: 12px; font-weight: 600; border: none; border-radius: 4px; cursor: pointer;" onclick='openEditStudentModal(${JSON.stringify(student).replace(/'/g, "&#39;")})'>
                        ✏️ Edit
                    </button>` : '';
            const deleteButton = isDeletable ? `
                    <button class="red" style="padding: 5px 10px; font-size: 12px; font-weight: 600; border: none; border-radius: 4px; cursor: pointer;" onclick="deleteSingleStudent('${studentId}', '${studentName}', '${student.department}', '${student.year}')">
                        🗑️ Delete
                    </button>` : '';

            actionCellHTML = `
                <div style="display: flex; gap: 6px; justify-content: center; align-items: center; flex-wrap: wrap;">
                    ${editButton}
                    ${deleteButton}
                </div>
            `;
        } else if (canBulkDeleteStudents()) {
            actionCellHTML = `
                <span style="color: #fecaca; font-size: 12px; font-style: italic; background: rgba(220,38,38,0.25); padding: 4px 10px; border-radius: 4px; display: inline-block;">
                    Use “Delete All Students” above
                </span>
            `;
        } else {
            actionCellHTML = `
                <span style="color: #cbd5e1; font-size: 12px; font-style: italic; background: rgba(255,255,255,0.12); padding: 4px 10px; border-radius: 4px; display: inline-block;">
                    👁️ Read Only
                </span>
            `;
        }

        tbody.innerHTML += `
            <tr>
                <td>${displaySerial}</td>
                <td style="text-align: center;">${photoHTML}</td>
                <td><strong>${studentId}</strong></td>
                <td>${studentName}</td>
                <td>${student.department}</td>
                <td>Year ${student.year}</td>
                <td style="text-align: center;">
                    <button class="view-details-btn" onclick='viewStudentDetails(${JSON.stringify(student).replace(/'/g, "&#39;")})'>
                        View Details
                    </button>
                </td>
                <td style="text-align: center;">
                    ${actionCellHTML}
                </td>
            </tr>
        `;
    });

    messageArea.innerHTML = '<span style="color: #51cf66;">✅ Students data loaded successfully.</span>';
}

/**
 * Get initials from name
 */
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * View full student details in modal
 */
function viewStudentDetails(student) {
    const modal = document.getElementById('studentDetailsModal');
    const detailsContainer = document.getElementById('modalStudentDetails');
    
    const studentId = student.studentId || student.id;
    const studentName = student.studentName || student.name;
    const initials = getInitials(studentName);
    
    // Photo HTML for modal
    let photoHTML = '';
    if (student.photo) {
        photoHTML = `<img src="${student.photo}" alt="${studentName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="placeholder-large" style="display:none;">${initials}</div>`;
    } else {
        photoHTML = `<div class="placeholder-large">${initials}</div>`;
    }
    
    // Format date if available
    const formatDate = (dateString) => {
        if (!dateString) return 'Not provided';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    
    detailsContainer.innerHTML = `
        <div class="student-photo-large">
            ${photoHTML}
        </div>
        <div class="student-info-details">
            <div class="detail-row">
                <div class="detail-label">📝 Register Number</div>
                <div class="detail-value">${studentId || 'N/A'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">👤 Student Name</div>
                <div class="detail-value">${studentName || 'N/A'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">🏢 Department</div>
                <div class="detail-value">${student.department || 'N/A'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">📅 Year</div>
                <div class="detail-value">Year ${student.year || 'N/A'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">📧 Email</div>
                <div class="detail-value">${student.email || 'Not provided'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">📱 Phone</div>
                <div class="detail-value">${student.phone || 'Not provided'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">🎂 Date of Birth</div>
                <div class="detail-value">${formatDate(student.dateOfBirth)}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">🏠 Address</div>
                <div class="detail-value">${student.address || 'Not provided'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">👨‍👩‍👦 Parent Name</div>
                <div class="detail-value">${student.parentName || 'Not provided'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">☎️ Parent Phone</div>
                <div class="detail-value">${student.parentPhone || 'Not provided'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">✅ Status</div>
                <div class="detail-value" style="color: ${student.status === 'active' ? '#51cf66' : '#ff6b6b'};">
                    ${student.status ? student.status.toUpperCase() : 'ACTIVE'}
                </div>
            </div>
        </div>
    `;
    
    // Add action buttons based on permission
    if (canEditStudents()) {
        detailsContainer.innerHTML += `
            <div style="width:100%; margin-top:25px; text-align:center; border-top:1px solid rgba(255,255,255,0.25); padding-top:15px;">
                <button onclick="openEditStudentModal(${JSON.stringify(student).replace(/'/g, "&#39;")});" style="background-color:#f59e0b;color:white;padding:8px 16px;margin-right:8px;border:none;border-radius:4px;cursor:pointer;">✏️ Edit</button>
                <button onclick="deleteSingleStudent('${studentId}', '${studentName}', '${student.department}', '${student.year}');" style="background-color:#dc2626;color:white;padding:8px 16px;border:none;border-radius:4px;cursor:pointer;">🗑️ Delete</button>
            </div>
        `;
    } else if (canBulkDeleteStudents()) {
        detailsContainer.innerHTML += `
            <div style="width:100%; margin-top:25px; text-align:center; border-top:1px solid rgba(255,255,255,0.25); padding-top:15px;">
                <div style="color:#fecaca; font-size:13px; font-style:italic;">Admin deletes a whole class at once. Close this window and use the “Delete All Students” button above.</div>
            </div>
        `;
    } else {
        detailsContainer.innerHTML += `
            <div style="width:100%; margin-top:20px; text-align:center; color:#cbd5e1; font-size:13px; font-style:italic; border-top:1px solid rgba(255,255,255,0.2); padding-top:15px;">
                👁️ View Only Access: Only Admin and CS1 staff can delete student records.
            </div>
        `;
    }
    
    modal.style.display = 'block';
}

/**
 * Close student details modal
 */
function closeStudentModal() {
    const modal = document.getElementById('studentDetailsModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Open edit modal for student (CS1 Staff Only)
 */
function openEditStudentModal(student) {
    if (!canEditStudents()) {
        alert("Access denied: Admin has view-only access. Only CS1 staff is authorized to edit student records.");
        return;
    }

    const studentId = student.studentId || student.id || "";
    const studentName = student.studentName || student.name || "";

    document.getElementById("editOriginalId").value = studentId;
    document.getElementById("editStudentId").value = studentId;
    document.getElementById("editStudentName").value = studentName;
    document.getElementById("editDepartment").value = student.department || selectedDepartment || "Computer Science";
    document.getElementById("editYear").value = String(student.year || "1");
    document.getElementById("editEmail").value = student.email || "";
    document.getElementById("editPhone").value = student.phone || "";
    document.getElementById("editDob").value = student.dateOfBirth ? String(student.dateOfBirth).split("T")[0] : "";
    document.getElementById("editStatus").value = student.status || "active";
    document.getElementById("editParentName").value = student.parentName || "";
    document.getElementById("editParentPhone").value = student.parentPhone || "";
    document.getElementById("editPhoto").value = student.photo || "";
    document.getElementById("editAddress").value = student.address || "";

    const fileInput = document.getElementById("editPhotoFile");
    if (fileInput) fileInput.value = "";

    if (student.photo) {
        setPhotoPreview(student.photo, "Current Photo");
    } else {
        setPhotoPreview(null);
    }

    const modal = document.getElementById("editStudentModal");
    if (modal) modal.style.display = 'block';
}

/**
 * Handle image file selection from the system/computer
 * Compresses and converts to Base64 data URL for storage and preview
 */
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert("Please select a valid image file (JPG, PNG, WEBP, GIF)");
        return;
    }

    const statusText = document.getElementById('photoStatusText');
    if (statusText) statusText.textContent = `Loading ${file.name}...`;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Resize to max 300x300 for crisp thumbnail and optimal storage
            const maxDimension = 300;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxDimension) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                }
            } else {
                if (height > maxDimension) {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

            document.getElementById('editPhoto').value = compressedBase64;
            setPhotoPreview(compressedBase64, `Loaded: ${file.name}`);
        };
        img.onerror = function() {
            alert("Failed to load image file. Please try another image.");
            setPhotoPreview(null);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

/**
 * Update photo preview thumbnail and status
 */
function setPhotoPreview(src, label) {
    const previewImg = document.getElementById('photoPreviewImg');
    const placeholder = document.getElementById('photoPreviewPlaceholder');
    const statusText = document.getElementById('photoStatusText');

    if (!previewImg || !placeholder || !statusText) return;

    if (src) {
        previewImg.src = src;
        previewImg.style.display = 'block';
        placeholder.style.display = 'none';
        statusText.textContent = label || "Photo attached from system";
        statusText.style.color = "#86efac";
    } else {
        previewImg.src = "";
        previewImg.style.display = 'none';
        placeholder.style.display = 'flex';
        statusText.textContent = "No image chosen yet";
        statusText.style.color = "#e2e8f0";
    }
}

/**
 * Remove selected photo
 */
function clearPhoto() {
    const photoInput = document.getElementById('editPhoto');
    const fileInput = document.getElementById('editPhotoFile');
    if (photoInput) photoInput.value = "";
    if (fileInput) fileInput.value = "";
    setPhotoPreview(null);
}

/**
 * Close edit student modal
 */
function closeEditModal() {
    const modal = document.getElementById("editStudentModal");
    if (modal) modal.style.display = 'none';
}

/**
 * Save updated student changes (CS1 Staff Only)
 */
function saveStudentChanges() {
    if (!canEditStudents()) {
        alert("Access denied: Only CS1 staff has permission to edit student records.");
        return;
    }

    const originalId = (document.getElementById("editOriginalId").value || "").trim();
    const newId = (document.getElementById("editStudentId").value || "").trim();
    const newName = (document.getElementById("editStudentName").value || "").trim();
    const newDept = (document.getElementById("editDepartment").value || "").trim();
    const newYear = (document.getElementById("editYear").value || "").trim();
    const email = (document.getElementById("editEmail").value || "").trim();
    const phone = (document.getElementById("editPhone").value || "").trim();
    const dob = (document.getElementById("editDob").value || "").trim();
    const status = (document.getElementById("editStatus").value || "active").trim();
    const parentName = (document.getElementById("editParentName").value || "").trim();
    const parentPhone = (document.getElementById("editParentPhone").value || "").trim();
    const photo = (document.getElementById("editPhoto").value || "").trim();
    const address = (document.getElementById("editAddress").value || "").trim();

    if (!newId || !newName) {
        alert("Register Number and Student Name are required.");
        return;
    }

    loadData();

    // Check if new ID collides with another student
    if (newId.toLowerCase() !== originalId.toLowerCase()) {
        const idExists = students.some(s => {
            const sId = (s.studentId || s.id || "").trim().toLowerCase();
            return sId === newId.toLowerCase();
        });
        if (idExists) {
            alert(`A student with Register Number "${newId}" already exists. Please choose a unique Register Number.`);
            return;
        }
    }

    // Locate the student in students array
    const studentIndex = students.findIndex(s => {
        const sId = (s.studentId || s.id || "").trim().toLowerCase();
        return sId === originalId.toLowerCase();
    });

    if (studentIndex === -1) {
        alert("Error: Student record not found to update.");
        return;
    }

    const existingStudent = students[studentIndex];
    const updatedStudent = {
        ...existingStudent,
        id: newId,
        studentId: newId,
        name: newName,
        studentName: newName,
        department: newDept,
        year: newYear,
        email: email,
        phone: phone,
        dateOfBirth: dob,
        status: status,
        parentName: parentName,
        parentPhone: parentPhone,
        photo: photo,
        address: address
    };

    students[studentIndex] = updatedStudent;

    // If student ID changed, update attendance records to match
    if (newId.toLowerCase() !== originalId.toLowerCase()) {
        attendance.forEach(att => {
            if (String(att.studentId || att.id || "").trim().toLowerCase() === originalId.toLowerCase()) {
                att.studentId = newId;
                att.id = newId;
                att.studentName = newName;
                att.name = newName;
            }
        });
    }

    saveData();

    closeEditModal();
    alert(`✅ Student "${newName}" (${newId}) updated successfully!`);

    // Refresh view
    generateDepartmentCards();
    if (selectedDepartment) {
        loadStudentsForDepartment();
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const detailsModal = document.getElementById('studentDetailsModal');
    const editModal = document.getElementById('editStudentModal');
    if (event.target === detailsModal) {
        detailsModal.style.display = 'none';
    }
    if (event.target === editModal) {
        editModal.style.display = 'none';
    }
}

/**
 * Delete a single student (CS1 Staff Only)
 */
async function deleteSingleStudent(studentId, studentName, department, year) {
    if (!canDeleteStudents()) {
        alert("Access denied: Only Admin and CS1 staff are authorized to delete students.");
        return;
    }

    if (!confirm(`Are you sure you want to delete student:\n\n• Name: ${studentName}\n• ID: ${studentId}\n• Class: ${department} - Year ${year}\n\nThis will also remove their attendance records.`)) {
        return;
    }

    const token = localStorage.getItem('token');
    if (token) {
        try {
            const scopeQuery = `department=${encodeURIComponent(department || '')}&year=${encodeURIComponent(year || '')}`;
            const response = await fetch(`${BASE_URL}/students/${encodeURIComponent(studentId)}?${scopeQuery}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok && data.success) {
                alert(`✅ ${data.message}`);
                // Close the details modal if open
                closeStudentModal();
                // Reload from backend
                await loadData();
                generateDepartmentCards();
                if (selectedDepartment) {
                    loadStudentsForDepartment();
                }
            } else {
                alert(`❌ Failed to delete: ${data.message || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Delete student error:', err);
            alert(`❌ Network error: ${err.message}`);
        }
    } else {
        alert('Authentication required. Please log in again.');
    }
}

/**
 * Delete every student of the selected class (department + year) from MongoDB.
 * Admin only. Attendance records and photos are removed with the students.
 */
async function deleteAllClassStudents() {
    if (!canBulkDeleteStudents()) {
        alert("Access denied: only the Admin can delete a whole class.");
        return;
    }

    if (!selectedDepartment) {
        alert("Please select a department first.");
        return;
    }

    await loadData();
    loadStudentsForDepartment();

    const yearFilter = document.getElementById("dataYear").value.trim();
    const yearText = yearFilter ? `Year ${yearFilter}` : "ALL YEARS";
    const targets = filteredStudents;

    if (targets.length === 0) {
        alert("No students found for the selected class.");
        return;
    }

    const confirmMsg1 = `⚠️ WARNING: This permanently deletes:\n\n` +
        `• Department: ${selectedDepartment}\n` +
        `• Year: ${yearText}\n` +
        `• Total Students: ${targets.length}\n\n` +
        `All student records and attendance history will be removed from the DATABASE.\n\n` +
        `Do you want to continue?`;

    if (!confirm(confirmMsg1)) return;

    const confirmMsg2 = `FINAL CONFIRMATION:\n\n` +
        `Delete ALL ${targets.length} students of ${selectedDepartment} (${yearText})?\n\n` +
        `This action CANNOT be undone!`;

    if (!confirm(confirmMsg2)) return;

    const token = localStorage.getItem("token");
    if (!token) {
        alert("Authentication required. Please log in again.");
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/reports/class`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ department: selectedDepartment, year: yearFilter || 'All' })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            alert(`❌ Failed to delete class: ${data.message || 'Unknown error'}`);
            return;
        }

        // Refresh from MongoDB so the table, cards and cache all agree
        await loadData();
        saveData();
        generateDepartmentCards();
        loadStudentsForDepartment();

        alert(`✅ Deletion completed.\n\n` +
            `• Students deleted: ${data.deletedStudents}\n` +
            `• Attendance records deleted: ${data.deletedAttendance}`);
    } catch (err) {
        console.error('Bulk delete error:', err);
        alert(`❌ Network error: ${err.message}`);
    }
}

/**
 * Download students data as PDF
 */
function downloadStudentsData() {
    const table = document.getElementById("studentsTable");
    const messageArea = document.getElementById("messageArea");

    if (!selectedDepartment) {
        messageArea.innerHTML = '<span style="color: #ff6b6b;">Please select a department first.</span>';
        return;
    }

    const tbody = document.getElementById("studentsBody");
    if (!tbody || tbody.children.length === 0 || filteredStudents.length === 0) {
        messageArea.innerHTML = '<span style="color: #ff6b6b;">No data available to download.</span>';
        return;
    }

    try {
        // Check if jsPDF is available
        if (typeof window.jspdf === 'undefined') {
            throw new Error('PDF library not loaded. Please refresh the page and try again.');
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Create filename
        const deptName = selectedDepartment.replace(/\s+/g, "_");
        const yearFilter = document.getElementById("dataYear").value.trim();
        const yearText = yearFilter ? `Year ${yearFilter}` : "All Years";
        const filename = `Students_Data_${deptName}_${yearText.replace(/\s+/g, '_')}.pdf`;

        // Add title
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('Students Data Report', 14, 15);
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`Department: ${selectedDepartment}`, 14, 25);
        doc.text(`Year: ${yearText}`, 14, 32);
        doc.text(`Total Students: ${filteredStudents.length}`, 14, 39);

        // Table headers (excluding Photo, Full Details, and Action columns)
        const headers = ['S.No', 'Register No', 'Name', 'Department', 'Year', 'Email', 'Phone'];

        // Get table data
        const tableData = filteredStudents.map((student, index) => [
            index + 1,
            student.studentId || student.id || '',
            student.studentName || student.name || '',
            student.department || '',
            student.year || '',
            student.email || 'N/A',
            student.phone || 'N/A'
        ]);

        // Create table
        doc.autoTable({
            startY: 47,
            head: [headers],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [0, 123, 255],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 8,
                cellPadding: 2
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 12 },   // S.No
                1: { halign: 'center', cellWidth: 25 },   // Register No
                2: { halign: 'left', cellWidth: 40 },     // Name
                3: { halign: 'left', cellWidth: 35 },     // Department
                4: { halign: 'center', cellWidth: 15 },   // Year
                5: { halign: 'left', cellWidth: 35 },     // Email
                6: { halign: 'center', cellWidth: 25 }    // Phone
            }
        });

        // Add footer
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

        // Download PDF
        doc.save(filename);
        messageArea.innerHTML = '<span style="color: #51cf66;">✅ Students data downloaded as PDF successfully!</span>';

    } catch (error) {
        console.error("PDF download error:", error);
        messageArea.innerHTML = '<span style="color: #ff6b6b;">❌ Failed to download PDF: ' + error.message + '</span>';
    }
}

/**
 * Go back to department selection
 */
function goBackToDepartments() {
    document.getElementById("studentsDataView").style.display = "none";
    document.getElementById("departmentSelection").style.display = "block";
    selectedDepartment = "";
    
    // Reset dropdown
    document.getElementById("selectedDeptText").textContent = "Choose Department";
    const dropdown = document.getElementById("departmentDropdown");
    const arrow = document.querySelector(".dropdown-arrow");
    dropdown.classList.remove("open");
    arrow.classList.remove("rotated");
    
    // Refresh department options (in case student counts changed)
    generateDepartmentCards();
}

/**
 * Go back to admin panel or home page based on user role
 */
function goBackToAdmin() {
    if (currentUser && currentUser.role === "admin") {
        window.location.href = "admin.html";
    } else {
        window.location.href = "home.html";
    }
}

/**
 * Initialize page when DOM is loaded
 */
document.addEventListener("DOMContentLoaded", async function() {
    loadUserInfo();
    await loadData();
    
    // Set page title based on user role
    const pageTitle = document.getElementById("pageTitle");
    if (currentUser && currentUser.role === "staff") {
        if (pageTitle) pageTitle.textContent = "My Students Data";
    }
    
    generateDepartmentCards();
    
    // Auto-select user's department for staff users
    if (currentUser && currentUser.role === "staff" && currentUser.department) {
        const deptKey = currentUser.department;
        if (departments[deptKey]) {
            selectDepartmentFromDropdown(deptKey);
        }
    }
});

/**
 * Handle logout (inherited from admin functionality)
 */
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("token");
        window.location.href = "index.html";
    }
}

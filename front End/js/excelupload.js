/* ==========================================================================
   excelupload.js - Excel Student Upload Logic (excelupload.html)
   Supports: photo, email, phone, dateOfBirth, address, parentName, parentPhone
   ========================================================================== */

const BASE_URL = 'http://localhost:5000/api';

document.addEventListener("DOMContentLoaded", () => {
    const uploadForm = document.getElementById("uploadForm");
    if (!uploadForm) return;

    uploadForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const department = document.getElementById("department").value;
        const year = document.getElementById("year").value;
        const fileInput = document.getElementById("file");
        const resultEl = document.getElementById("result");

        if (!department || !year) {
            resultEl.innerHTML = "<span style='color:#fca5a5;'>⚠️ Please select Department and Year.</span>";
            return;
        }

        if (!fileInput.files || !fileInput.files[0]) {
            resultEl.innerHTML = "<span style='color:#fca5a5;'>⚠️ Please select an Excel file.</span>";
            return;
        }

        const file = fileInput.files[0];
        resultEl.innerHTML = "<span>Parsing file and saving to database...</span>";

        // 1. Generate client-side preview using SheetJS
        const reader = new FileReader();

        reader.onload = async function (evt) {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

                if (rows.length === 0) {
                    resultEl.innerHTML = "<span style='color:#fca5a5;'>⚠️ Excel file is empty or unreadable.</span>";
                    return;
                }

                const parsedStudents = [];

                rows.forEach((row, index) => {
                    const keys = Object.keys(row);

                    // Primary ID column matching
                    const id = String(
                        row["reg number"]  || row["Reg Number"]  || row["REG NUMBER"]  ||
                        row["regno"]       || row["RegNo"]       || row["Reg No"]      ||
                        row["reg no"]      || row["register no"] || row["Register No"] ||
                        row["studentId"]   || row["StudentId"]   || row["student id"]  ||
                        row["id"]          || row["ID"]          ||
                        (keys[1] !== undefined ? row[keys[1]] : "") || ""
                    ).trim().toUpperCase();

                    // Name column matching
                    const name = String(
                        row["bname"]       || row["Bname"]       || row["BNAME"]       ||
                        row["name"]        || row["Name"]        || row["NAME"]        ||
                        row["studentName"] || row["StudentName"] || row["student name"]||
                        row["Student"]     || row["student"]     ||
                        (keys[2] !== undefined ? row[keys[2]] : keys[1] !== undefined ? row[keys[1]] : "") || ""
                    ).trim();

                    // Serial number (left empty so the server assigns the next free one)
                    const serialVal = row["serial number"] || row["Serial Number"] ||
                                      row["S.No"] || row["sno"] || row["Sno"] || row["S No"] || "";
                    const serial = Number(serialVal) || null;

                    // Optional fields - case-insensitive matching
                    const email = row["email"] || row["Email"] || row["EMAIL"] || "";
                    const phone = row["phone"] || row["Phone"] || row["PHONE"] || "";
                    const dateOfBirth = row["date of birth"] || row["Date of Birth"] || row["Date of birth"] ||
                                        row["dob"] || row["Dob"] || row["DOB"] || "";
                    const address = row["address"] || row["Address"] || row["ADDRESS"] || "";
                    const parentName = row["parent name"] || row["Parent Name"] || row["Parent name"] ||
                                       row["father name"] || row["Father Name"] || row["Mother name"] ||
                                       row["mother name"] || row["guardian name"] || "";
                    const parentPhone = row["parent phone"] || row["Parent Phone"] ||
                                        row["Parent phone"] || row["guardian phone"] || "";
                    const photo = row["photo"] || row["Photo"] || row["PHOTO"] || row["photo_url"] || row["Photo URL"] || "";

                    if (!id && !name) return;

                    parsedStudents.push({
                        serial,
                        studentId: id || ("STU" + (index + 1)),
                        studentName: name || "Unknown",
                        department,
                        year,
                        email: email.trim(),
                        phone: phone.trim(),
                        dateOfBirth: dateOfBirth.trim(),
                        address: address.trim(),
                        parentName: parentName.trim(),
                        parentPhone: parentPhone.trim(),
                        photo: photo.trim()
                    });
                });

                // Sort parsed students strictly by roll number ascending (natural numerical order)
                parsedStudents.sort((a, b) => {
                    const idA = String(a.studentId || '').trim().toUpperCase();
                    const idB = String(b.studentId || '').trim().toUpperCase();
                    return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' }) || idA.localeCompare(idB);
                });

                let preview = "<table style='margin:12px auto;color:#fff;'><thead><tr><th>No.</th><th>ID</th><th>Name</th><th>Email</th><th>Phone</th></tr></thead><tbody>";
                parsedStudents.forEach((student, index) => {
                    preview += `<tr>
                        <td>${index + 1}</td>
                        <td>${student.studentId}</td>
                        <td>${student.studentName}</td>
                        <td>${student.email}</td>
                        <td>${student.phone}</td>
                    </tr>`;
                });
                preview += "</tbody></table>";

                // 2. Save directly to MongoDB Atlas backend via batch API
                const token = localStorage.getItem("token");
                const saveRes = await fetch(`${BASE_URL}/students/batch`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        department,
                        year,
                        students: parsedStudents
                    })
                });

                const result = await saveRes.json();

                if (saveRes.ok && result.success) {
                    resultEl.innerHTML = `
                        <span style="color:#86efac;font-weight:bold;">
                            ✅ Successfully imported ${result.count || parsedStudents.length} students into MongoDB Atlas for ${department}, Year ${year}!
                        </span><br>` + preview;
                } else {
                    resultEl.innerHTML = `<span style='color:#fca5a5;'>❌ Server error: ${result.message || 'Failed to save to database.'}</span>`;
                }

            } catch (err) {
                console.error("Excel upload error:", err);
                resultEl.innerHTML = "<span style='color:#fca5a5;'>❌ Failed to parse or upload Excel file.</span>";
            }
        };

        reader.readAsArrayBuffer(file);
    });
});

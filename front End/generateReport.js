// Function to generate the attendance report
const BASE_URL = 'http://localhost:5000/api';
const token = localStorage.getItem("token");


async function generateReport() {
    const fromDate = document.getElementById("fromDate").value;
    const toDate = document.getElementById("toDate").value;

    if (!fromDate || !toDate) {
        alert("Please select both start and end dates.");
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/report`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
                from: fromDate,
                to: toDate,
            }),
        });

        if (!res.ok) {
            const errorText = await res.text(); // Read the response as text
            throw new Error(`Error fetching report: ${errorText || res.statusText}`);
        }

        const data = await res.json();
        console.log("REPORT DATA:", data);

        if (data.length === 0) {
            alert("No attendance data found for the selected date range.");
            return;
        }

        const reportBody = document.querySelector("#reportBody");
        reportBody.innerHTML = ""; // Clear any existing rows

        const sortedData = [...data].sort((a, b) => {
            const idA = String(a.studentId || a.id || '').trim().toUpperCase();
            const idB = String(b.studentId || b.id || '').trim().toUpperCase();
            return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' }) || idA.localeCompare(idB);
        });

        sortedData.forEach((student) => {

    const { studentId, studentName, totalDays, presentDays } = student;

    const absentDays = totalDays - presentDays;

    let percentage = 0;
    if (totalDays > 0) {
        percentage = ((presentDays / totalDays) * 100).toFixed(2);
    }

    const row = document.createElement("tr");

    row.innerHTML = `
        <td>${studentId}</td>
        <td>${studentName}</td>
        <td>${totalDays}</td>
        <td>${presentDays}</td>
        <td>${absentDays}</td>
        <td>${percentage}%</td>
    `;

    reportBody.appendChild(row);

});
    } catch (error) {
        console.error("Error generating report:", error);
        alert("Error generating report: " + error.message);
    }
}

// Load students on page load
document.addEventListener("DOMContentLoaded", () => {
    loadStudents();
});

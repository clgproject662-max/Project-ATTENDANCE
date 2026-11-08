/**
 * rollNumberHelper.js
 * Utility functions for natural alphanumeric sorting of student roll numbers.
 * Accurately compares numeric segments (e.g., 24UCS20 < 24UCS100, 24UCS023 < 24UCS024 < 24UCS025).
 */

/**
 * Extract roll number string from string or student object
 * @param {string|object} student 
 * @returns {string}
 */
function getRollNumber(student) {
    if (!student) return '';
    if (typeof student === 'string') return student.trim().toUpperCase();
    const val = student.studentId || student.id || student.studentRegisterNumber || student.regNo || student.rollNumber || student.rollNo || '';
    return String(val).trim().toUpperCase();
}

/**
 * Natural comparison of two roll numbers in ascending order.
 * Correctly compares numeric portions (e.g. 24UCS100 appears after 24UCS067 and 24UCS20).
 * @param {string|object} a 
 * @param {string|object} b 
 * @returns {number}
 */
function compareRollNumbers(a, b) {
    const rollA = getRollNumber(a);
    const rollB = getRollNumber(b);

    if (!rollA && !rollB) return 0;
    if (!rollA) return 1;
    if (!rollB) return -1;

    // Use ECMAScript Intl natural sort with numericOrdering enabled
    const cmp = rollA.localeCompare(rollB, undefined, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) return cmp;

    // Tie-breaker for identical numeric values (e.g. 24UCS020 vs 24UCS20)
    return rollA.localeCompare(rollB);
}

/**
 * Compare two students.
 * First compares department (if different), then year (if different), then roll number.
 * Ensures students within the same class are sorted in ascending roll number order.
 * @param {object} a 
 * @param {object} b 
 * @returns {number}
 */
function compareStudents(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;

    const deptA = String(a.department || '').trim().toLowerCase();
    const deptB = String(b.department || '').trim().toLowerCase();
    if (deptA && deptB && deptA !== deptB) {
        return deptA.localeCompare(deptB);
    }

    const yearA = String(a.year || '').trim();
    const yearB = String(b.year || '').trim();
    if (yearA && yearB && yearA !== yearB) {
        return yearA.localeCompare(yearB, undefined, { numeric: true });
    }

    return compareRollNumbers(a, b);
}

/**
 * Sort an array of students in ascending natural roll number order.
 * @param {Array} students 
 * @returns {Array} sorted copy of students
 */
function sortStudentsByRollNumber(students) {
    if (!Array.isArray(students)) return [];
    return [...students].sort(compareStudents);
}

/**
 * Re-sequence serial numbers for all students in a specific department and year
 * so that their stored serial field matches their ascending roll number position (1, 2, 3...).
 * @param {mongoose.Model} StudentModel 
 * @param {string} department 
 * @param {string} year 
 */
async function resequenceClassSerials(StudentModel, department, year) {
    try {
        if (!StudentModel || !department || !year || typeof StudentModel.find !== 'function') return;
        // Check if mongoose is connected
        if (StudentModel.db && StudentModel.db.readyState !== 1) return;

        let query = StudentModel.find({
            department: department,
            year: year
        });
        if (query && typeof query.lean === 'function') {
            query = query.lean();
        }
        const classStudents = await query;
        if (!Array.isArray(classStudents) || classStudents.length === 0) return;

        const sorted = sortStudentsByRollNumber(classStudents);
        const bulkOps = [];

        sorted.forEach((student, index) => {
            const expectedSerial = index + 1;
            if (student.serial !== expectedSerial) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: student._id },
                        update: { $set: { serial: expectedSerial } }
                    }
                });
            }
        });

        if (bulkOps.length > 0 && typeof StudentModel.bulkWrite === 'function') {
            await StudentModel.bulkWrite(bulkOps);
        }
    } catch (err) {
        console.warn('resequenceClassSerials non-fatal error:', err.message);
    }
}

module.exports = {
    getRollNumber,
    compareRollNumbers,
    compareStudents,
    sortStudentsByRollNumber,
    resequenceClassSerials
};

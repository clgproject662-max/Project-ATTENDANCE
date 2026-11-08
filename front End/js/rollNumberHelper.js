/**
 * rollNumberHelper.js
 * Frontend utility for natural alphanumeric sorting of student roll numbers.
 * Accurately compares numeric portions (e.g. 24UCS20 < 24UCS100, 24UCS023 < 24UCS024 < 24UCS025).
 */

function getStudentRollNumber(student) {
    if (!student) return '';
    if (typeof student === 'string') return student.trim().toUpperCase();
    const val = student.studentId || student.id || student.studentRegisterNumber || student.regNo || student.rollNumber || student.rollNo || '';
    return String(val).trim().toUpperCase();
}

function compareRollNumbers(a, b) {
    const rollA = getStudentRollNumber(a);
    const rollB = getStudentRollNumber(b);

    if (!rollA && !rollB) return 0;
    if (!rollA) return 1;
    if (!rollB) return -1;

    // Natural numeric-aware string comparison
    const cmp = rollA.localeCompare(rollB, undefined, { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) return cmp;

    // Tie-breaker for identical numeric values (e.g. 24UCS020 vs 24UCS20)
    return rollA.localeCompare(rollB);
}

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

function sortStudentsByRollNumber(students) {
    if (!Array.isArray(students)) return [];
    return [...students].sort(compareStudents);
}

if (typeof window !== 'undefined') {
    window.getStudentRollNumber = getStudentRollNumber;
    window.compareRollNumbers = compareRollNumbers;
    window.compareStudents = compareStudents;
    window.sortStudentsByRollNumber = sortStudentsByRollNumber;
}


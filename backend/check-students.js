const mongoose = require('mongoose');
require('dotenv').config();
const Student = require('./models/Student');

async function check() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Find any bad/garbage records (non-standard studentIds)
    const allCS1 = await Student.find({ department: 'Computer Science', year: '1' })
        .sort({ serial: 1 })
        .select('studentId studentName serial _id')
        .lean();

    console.log('\nCS Year 1 students (sorted by serial):');
    allCS1.forEach(s => {
        console.log(`  serial=${s.serial} | id="${s.studentId}" | name="${s.studentName}" | _id=${s._id}`);
    });

    // Check for suspicious records - anything that doesn't look like a roll number
    const suspicious = allCS1.filter(s => {
        const id = String(s.studentId || '');
        return !id.match(/^\d{2}[A-Z]{2,4}\d{3,4}$/i);
    });
    console.log('\nSuspicious (non-standard) records:');
    if (suspicious.length === 0) {
        console.log('  None found');
    } else {
        suspicious.forEach(s => console.log(`  id="${s.studentId}" | name="${s.studentName}" | _id=${s._id}`));
    }

    await mongoose.disconnect();
    console.log('\nDone.');
}
check().catch(err => { console.error(err); process.exit(1); });

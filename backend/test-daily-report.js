// test-daily-report.js
// Simple test script to verify the daily report API

require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./models/Student');
const Attendance = require('./models/Attendance');

async function testDailyReport() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Test data creation
        const testDate = '2024-12-13';
        
        // Create test students if they don't exist
        const testStudents = [
            { studentName: 'Test Student 1', studentId: 'CS001', department: 'Computer Science', year: '1' },
            { studentName: 'Test Student 2', studentId: 'CS002', department: 'Computer Science', year: '1' },
            { studentName: 'Test Student 3', studentId: 'CS003', department: 'Computer Science', year: '2' }
        ];

        for (const studentData of testStudents) {
            await Student.findOneAndUpdate(
                { studentId: studentData.studentId, department: studentData.department, year: studentData.year },
                studentData,
                { upsert: true, new: true }
            );
        }
        console.log('✅ Test students created/updated');

        // Create test attendance if it doesn't exist
        const testAttendance = [
            { studentId: 'CS001', date: testDate, department: 'Computer Science', year: '1', status: 'present' },
            { studentId: 'CS002', date: testDate, department: 'Computer Science', year: '1', status: 'absent' },
            { studentId: 'CS003', date: testDate, department: 'Computer Science', year: '2', status: 'present' }
        ];

        for (const attendanceData of testAttendance) {
            await Attendance.findOneAndUpdate(
                { 
                    studentId: attendanceData.studentId, 
                    date: attendanceData.date, 
                    department: attendanceData.department, 
                    year: attendanceData.year 
                },
                attendanceData,
                { upsert: true, new: true }
            );
        }
        console.log('✅ Test attendance created/updated');

        // Test the daily report logic
        const departments = ['Computer Science', 'Information Technology', 'Tamil', 'English'];
        const years = ['1', '2', '3'];
        const dailyReport = [];
        let serialNumber = 1;

        for (const department of departments) {
            for (const year of years) {
                const totalStudents = await Student.countDocuments({
                    department: department,
                    year: year,
                    status: 'active'
                });

                if (totalStudents === 0) continue;

                const attendanceRecords = await Attendance.find({
                    department: department,
                    year: year,
                    date: testDate
                });

                const hasAttendanceRecords = attendanceRecords.length > 0;

                if (!hasAttendanceRecords) {
                    dailyReport.push({
                        serialNo: serialNumber++,
                        department: department,
                        classYear: `${year}${getYearSuffix(year)} Year`,
                        present: 'No attendance recorded',
                        absent: 'No attendance recorded',
                        percentage: 'No attendance recorded',
                        totalStudents: totalStudents
                    });
                } else {
                    const presentCount = attendanceRecords.filter(record => record.status === 'present').length;
                    const absentCount = attendanceRecords.filter(record => record.status === 'absent').length;
                    const percentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

                    dailyReport.push({
                        serialNo: serialNumber++,
                        department: department,
                        classYear: `${year}${getYearSuffix(year)} Year`,
                        present: presentCount,
                        absent: absentCount,
                        percentage: `${percentage}%`,
                        totalStudents: totalStudents
                    });
                }
            }
        }

        console.log('\n📊 Daily Report Results:');
        console.log('=========================');
        dailyReport.forEach(item => {
            console.log(`${item.serialNo}. ${item.department} - ${item.classYear}: Present: ${item.present}, Absent: ${item.absent}, Percentage: ${item.percentage}`);
        });

        console.log('\n✅ Daily report test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

function getYearSuffix(year) {
    switch(year) {
        case '1': return 'st';
        case '2': return 'nd';
        case '3': return 'rd';
        default: return 'th';
    }
}

testDailyReport();
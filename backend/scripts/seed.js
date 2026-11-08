const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Student = require('../models/Student');

const seedData = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error(' MONGODB_URI not found in backend/.env');
            process.exit(1);
        }

        console.log('Connecting to MongoDB Atlas for initial setup/seeding...');
        await mongoose.connect(uri);
        console.log(' Connected to MongoDB Atlas');

        // 1. Initial Admin User
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            await User.create({
                name: 'System Administrator',
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                department: 'Administration',
                year: 'All',
                status: 'active'
            });
            console.log(' Admin user created: admin / admin123');
        } else {
            console.log('ℹ Admin user already exists');
        }

        // 2. Staff Accounts (common cs account plus cs1, cs2, cs3)
        const staffList = [
            { username: 'cs', name: 'CS Staff', password: 'cs123', department: 'Computer Science', year: 'All' },
            { username: 'cs1', name: 'CS Staff (Year 1)', password: 'cs123', department: 'Computer Science', year: '1' },
            { username: 'cs2', name: 'CS Staff (Year 2)', password: 'cs123', department: 'Computer Science', year: '2' },
            { username: 'cs3', name: 'CS Staff (Year 3)', password: 'cs123', department: 'Computer Science', year: '3' }
        ];

        for (const staff of staffList) {
            const exists = await User.findOne({ username: staff.username });
            if (!exists) {
                await User.create({
                    ...staff,
                    role: 'staff',
                    status: 'active'
                });
                console.log(` Staff user created: ${staff.username} / ${staff.password} (${staff.department} Year ${staff.year})`);
            } else {
                console.log(`ℹ Staff user ${staff.username} already exists`);
            }
        }

        // 3. Sample Initial Students (Computer Science Year 3)
        const sampleStudents = [
            { serial: 1, studentId: '21CS001', studentName: 'Aravind Kumar', department: 'Computer Science', year: '3' },
            { serial: 2, studentId: '21CS002', studentName: 'Bhavani S', department: 'Computer Science', year: '3' },
            { serial: 3, studentId: '21CS003', studentName: 'Chandran M', department: 'Computer Science', year: '3' },
            { serial: 4, studentId: '21CS004', studentName: 'Divya R', department: 'Computer Science', year: '3' },
            { serial: 5, studentId: '21CS005', studentName: 'Ganesh P', department: 'Computer Science', year: '3' }
        ];

        for (const s of sampleStudents) {
            const exists = await Student.findOne({ studentId: s.studentId, department: s.department, year: s.year });
            if (!exists) {
                await Student.create(s);
                console.log(` Student seeded: ${s.studentId} - ${s.studentName}`);
            }
        }

        console.log('\n Initial database setup & seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error(' Seeding failed:', error.message);
        process.exit(1);
    }
};

seedData();

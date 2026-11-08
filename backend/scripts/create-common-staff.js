/**
 * Creates (or resets) the common Computer Science staff account.
 * Login: cs / cs123
 * The account must pick CS1, CS2 or CS3 after signing in.
 *
 * Usage: node scripts/create-common-staff.js
 */

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');

const COMMON_STAFF = {
    name: 'CS Staff',
    username: 'cs',
    password: 'cs123',
    role: 'staff',
    department: 'Computer Science',
    year: 'All',
    status: 'active'
};

async function run() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI not found in backend/.env');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        let user = await User.findOne({ username: COMMON_STAFF.username });

        if (user) {
            user.name = COMMON_STAFF.name;
            user.password = COMMON_STAFF.password;
            user.role = COMMON_STAFF.role;
            user.department = COMMON_STAFF.department;
            user.year = COMMON_STAFF.year;
            user.status = COMMON_STAFF.status;
            await user.save();
            console.log('Updated existing common staff account');
        } else {
            await User.create(COMMON_STAFF);
            console.log('Created common staff account');
        }

        console.log('Credentials: cs / cs123 (choose CS1, CS2 or CS3 after login)');
        process.exit(0);
    } catch (error) {
        console.error('Failed to create common staff account:', error.message);
        process.exit(1);
    }
}

run();

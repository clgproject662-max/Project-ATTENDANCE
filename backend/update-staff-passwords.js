/**
 * update-staff-passwords.js
 * Run once to update cs1, cs2, cs3 passwords to cs1234
 *
 * Usage:  node update-staff-passwords.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const NEW_PASSWORD = 'cs1234';
const STAFF_USERS  = ['cs1', 'cs2', 'cs3'];

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');

        for (const username of STAFF_USERS) {
            const user = await User.findOne({ username });

            if (!user) {
                console.warn(`⚠️  User "${username}" not found — skipping`);
                continue;
            }

            // Assign plain-text password; the pre-save hook in User.js hashes it automatically
            user.password = NEW_PASSWORD;
            await user.save({ validateBeforeSave: false });
            console.log(`✅ Password updated: ${username}`);
        }

        console.log('\nAll done! New credentials:');
        STAFF_USERS.forEach(u => console.log(`  ${u} / ${NEW_PASSWORD}`));
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ DB connection failed:', err.message);
        process.exit(1);
    });

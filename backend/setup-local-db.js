// setup-local-db.js
// Creates local MongoDB setup with sample data

require('dotenv').config();
const mongoose = require('mongoose');

// Use local MongoDB for development
const LOCAL_URI = 'mongodb://localhost:27017/attendance_system';

async function setupLocalDB() {
    console.log('🏗️ Setting up local MongoDB...');
    
    try {
        // Connect to local MongoDB
        await mongoose.connect(LOCAL_URI, {
            serverSelectionTimeoutMS: 5000
        });
        
        console.log('✅ Connected to local MongoDB');
        
        // Create sample data
        const User = require('./models/User');
        const Student = require('./models/Student');
        
        // Create admin user if not exists
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            await User.create({
                username: 'admin',
                password: 'admin123', // Will be hashed by the model
                role: 'admin',
                department: 'Administration'
            });
            console.log('👤 Admin user created');
        }
        
        // Create staff users if not exist
        const staffUsers = [
            { username: 'cs1', password: 'cs123', role: 'staff', department: 'Computer Science', year: '1' },
            { username: 'cs2', password: 'cs123', role: 'staff', department: 'Computer Science', year: '2' },
            { username: 'cs3', password: 'cs123', role: 'staff', department: 'Computer Science', year: '3' }
        ];
        
        for (const staffData of staffUsers) {
            const exists = await User.findOne({ username: staffData.username });
            if (!exists) {
                await User.create(staffData);
                console.log(`👤 Staff user ${staffData.username} created`);
            }
        }
        
        console.log('✅ Local MongoDB setup complete!');
        console.log('🔧 Update your .env to use: MONGODB_URI=mongodb://localhost:27017/attendance_system');
        
        await mongoose.connection.close();
        process.exit(0);
        
    } catch (error) {
        console.error('Local setup failed:', error.message);
        console.log('\n Make sure MongoDB is installed and running locally:');
        console.log('  - Download MongoDB Community Server');
        console.log('  - Or use MongoDB Compass with local connection');
        process.exit(1);
    }
}

setupLocalDB();
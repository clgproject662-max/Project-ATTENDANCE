// test-connection.js
// Quick script to test MongoDB connection

require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
    console.log('🔍 Testing MongoDB connection...');
    console.log('📍 MongoDB URI:', process.env.MONGODB_URI?.substring(0, 50) + '...');
    
    try {
        const connection = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
        });
        
        console.log('✅ MongoDB connection successful!');
        console.log(`📡 Connected to: ${connection.connection.host}`);
        console.log(`🗄️ Database: ${connection.connection.name}`);
        
        // Close connection
        await mongoose.connection.close();
        console.log('🔌 Connection closed.');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        
        if (error.message.includes('IP')) {
            console.log('\n💡 IP Whitelist Issue:');
            console.log('  1. Go to MongoDB Atlas Dashboard');
            console.log('  2. Navigate to Network Access');
            console.log('  3. Add your current IP address');
            console.log('  4. Or add 0.0.0.0/0 for development (less secure)');
        }
        
        if (error.message.includes('authentication')) {
            console.log('\n💡 Authentication Issue:');
            console.log('  1. Check your username and password in .env');
            console.log('  2. Ensure the database user exists in MongoDB Atlas');
        }
        
        process.exit(1);
    }
}

testConnection();
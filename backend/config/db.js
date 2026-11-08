const mongoose = require('mongoose');

const connectDB = async () => {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error('MONGODB_URI is missing from the .env file');
    }

    try {
        console.log('Connecting to MongoDB Atlas...');
        
        const connection = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        
        console.log(`MongoDB connected successfully`);
        console.log(`Database host: ${connection.connection.host}`);
        console.log(`Database name: ${connection.connection.name}`);
        return connection;
    } catch (error) {
        console.error('MongoDB connection failed. Possible causes:');
        console.error('  - MongoDB Atlas IP access list does not include your current IP');
        console.error('  - Database credentials (username/password) are incorrect');
        console.error('  - Network/firewall is blocking the connection');
        console.error('  - Cluster is paused or not running');
        console.error('');
        console.error('To whitelist your IP in MongoDB Atlas:');
        console.error('  1. Go to https://cloud.mongodb.com');
        console.error('  2. Navigate to Network Access in the left sidebar');
        console.error('  3. Click "Add IP Address"');
        console.error('  4. Add your current IP or 0.0.0.0/0 (for testing)');
        console.error('  5. Wait 1-2 minutes for changes to propagate');
        console.error('');
        console.error('Connection details:');
        console.error('  - Current URI configured in .env: MONGODB_URI is set');
        console.error('  - If your IP is: 192.168.1.100, add it to Atlas Network Access');
        
        throw error;
    }
};

module.exports = connectDB;

// fix-mongo-auth.js
// Helper script to fix MongoDB authentication issues

const fs = require('fs');
const path = require('path');

console.log('🔧 MongoDB Authentication Fixer');
console.log('================================\n');

// Read current .env file
const envPath = path.join(__dirname, '.env');
let envContent = '';

try {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('📁 Current .env file found');
} catch (error) {
    console.log('❌ .env file not found');
    process.exit(1);
}

console.log('\n🔍 Common MongoDB Authentication Issues:');
console.log('1. Password contains special characters that need URL encoding');
console.log('2. Username/password is incorrect');
console.log('3. Database user doesn\'t exist in MongoDB Atlas');
console.log('4. Database user doesn\'t have proper permissions\n');

console.log('💡 To fix MongoDB Atlas authentication:');
console.log('================================');
console.log('1. Go to https://cloud.mongodb.com/');
console.log('2. Navigate to Database Access');
console.log('3. Either:');
console.log('   a) Create a NEW user with username/password');
console.log('   b) Reset password for existing user');
console.log('4. Make sure user has "Atlas admin" or "Read and write to any database" permissions');
console.log('5. Wait 1-2 minutes for changes to propagate\n');

console.log('🔄 Quick Local MongoDB Setup:');
console.log('=============================');
console.log('If you want to use local MongoDB instead:');
console.log('1. Install MongoDB Community Server');
console.log('2. Or use MongoDB Compass with local connection');
console.log('3. Your .env is already configured for local MongoDB\n');

// Create multiple .env variants
const configurations = {
    'local': `# LOCAL MONGODB SETUP (No authentication required)
MONGODB_URI=mongodb://localhost:27017/attendance_system
PORT=5000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5500
JWT_SECRET=super_secret_jwt_key_attendance_system_2026_vicky
JWT_EXPIRES_IN=24h`,

    'atlas-template': `# MONGODB ATLAS TEMPLATE (Replace with your actual credentials)
# MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/attendance_system?retryWrites=true&w=majority
MONGODB_URI=mongodb://localhost:27017/attendance_system
PORT=5000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5500
JWT_SECRET=super_secret_jwt_key_attendance_system_2026_vicky
JWT_EXPIRES_IN=24h`
};

// Write configuration files
Object.keys(configurations).forEach(configName => {
    const fileName = `.env.${configName}`;
    fs.writeFileSync(path.join(__dirname, fileName), configurations[configName]);
    console.log(`Created ${fileName}`);
});

console.log('\n Next Steps:');
console.log('=============');
console.log('1. TEST LOCAL MONGODB:');
console.log('   cp .env.local .env');
console.log('   npm start');
console.log('');
console.log('2. OR FIX ATLAS CREDENTIALS:');
console.log('   - Go to MongoDB Atlas Dashboard');
console.log('   - Create new database user');
console.log('   - Update MONGODB_URI in .env with correct credentials');
console.log('   - Test with: node test-connection.js');
console.log('');
console.log('3. OR USE PROVIDED TEMPLATE:');
console.log('   cp .env.atlas-template .env');
console.log('   # Edit .env with your actual MongoDB Atlas credentials');

console.log('\n🎯 Current .env is set to LOCAL MONGODB for immediate testing!');
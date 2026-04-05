import mongoose from 'mongoose';
import User from './src/models/User';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env['MONGODB_URI'] || 'mongodb://localhost:27017/wastezero';

async function checkUsers() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const users = await User.find({}, 'name email role');
        console.log('Users found:', users.length);
        users.forEach(u => {
            console.log(`- ${u.name} (${u.role}): ${u._id}`);
        });

        const admins = users.filter(u => u.role === 'admin');
        if (admins.length === 0) {
            console.log('WARNING: No admin user found!');
        } else {
            console.log('Admin(s) found:', admins.map(a => a.name).join(', '));
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkUsers();

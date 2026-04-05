const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    username: { type: String, unique: true },
    role: String,
    password: String
});

const User = mongoose.model('User', UserSchema);

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected');
        const user = await User.findOne({ email: 'admin_test@wastezero.com' });
        if (user) {
            console.log('User found:', user.name, user.role);
        } else {
            console.log('User NOT found');
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

check();

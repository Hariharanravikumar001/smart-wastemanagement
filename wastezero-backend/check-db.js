const mongoose = require('mongoose');

// Need to define a minimal User model here since the backend one imports ESM typescript
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  role: { type: String, enum: ['user', 'volunteer', 'admin', 'citizen', 'ngo'], default: 'user' },
  location: { type: String }
});

const User = mongoose.model('User', userSchema);

mongoose.connect('mongodb+srv://hariharan:HARI2005@smartwaste.x1zrn.mongodb.net/test?retryWrites=true&w=majority&appName=Smartwaste')
  .then(async () => {
    console.log('Connected to DB');
    const user = await User.findOne({ email: 'testcitizen@example.com' });
    console.log('User in DB:', JSON.stringify(user, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

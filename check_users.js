const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB Connected');
  try {
    const users = await User.find({}, 'email name restaurantName');
    if (users.length === 0) {
      console.log('No users found in the database.');
    } else {
      console.log('Found users:');
      users.forEach(u => {
        console.log(`- Email: ${u.email}, Name: ${u.name}, Restaurant: ${u.restaurantName}`);
      });
    }
  } catch (err) {
    console.error('Error fetching users:', err);
  } finally {
    mongoose.disconnect();
  }
})
.catch(err => {
    console.log('MongoDB Connection Error:', err);
    process.exit(1);
});

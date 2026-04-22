const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET is not set in .env file!');
  console.error('Please check your .env file in the backend directory.');
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');

const app = express();

// Middleware
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://masalamatrix.com',
  'https://www.masalamatrix.com',
];

const envAllowedOrigins = (process.env.REACT_APP_CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser clients (no Origin header) and approved web origins.
    const isCpanelSubdomain = !!origin && /^https:\/\/[a-z0-9-]+\.103-102-234-3\.cpanel\.site$/i.test(origin);
    if (!origin || allowedOrigins.includes(origin) || isCpanelSubdomain) {
      return callback(null, true);
    }

    console.log('Blocked by CORS:', origin);
    console.log('Allowed origins:', allowedOrigins);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 204
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const checkSubscription = require('./middleware/checkSubscription');
const auth = require('./middleware/auth');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/superadmin', require('./routes/superadmin'));

// All restaurant routes: auth first so checkSubscription can read req.user
app.use('/api/menu', auth, checkSubscription, require('./routes/menu'));
app.use('/api/seating', auth, checkSubscription, require('./routes/seating'));
app.use('/api/orders', auth, checkSubscription, require('./routes/orders'));
app.use('/api/ai', auth, checkSubscription, require('./routes/ai'));
app.use('/api/upload', auth, checkSubscription, require('./routes/upload'));
app.use('/api/inventory', auth, checkSubscription, require('./routes/inventory'));
app.use('/api/customers', auth, checkSubscription, require('./routes/customers'));
app.use('/api/outlets', auth, checkSubscription, require('./routes/outlets'));
app.use('/api/users', auth, checkSubscription, require('./routes/users'));
app.use('/api/payments', auth, checkSubscription, require('./routes/payments'));
app.use('/api/expenses', auth, checkSubscription, require('./routes/expenses'));
app.use('/api/expense-reminders', auth, checkSubscription, require('./routes/expenseReminders'));

const PORT = process.env.PORT || 5000;
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('join', (restaurantName) => {
    socket.join(restaurantName);
    console.log(`Client joined restaurant room: ${restaurantName}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Make io accessible to routes
app.set('socketio', io);

mongoose.connection.on('connected', () => {
  console.log('MongoDB Connected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB Connection Error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.error('MongoDB disconnected');
});

async function startServer() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_management'
    );

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB. Server not started.');
    console.error(err.message);
    process.exit(1);
  }
}

startServer();


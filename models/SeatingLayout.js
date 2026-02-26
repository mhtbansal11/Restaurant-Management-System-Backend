const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  id: String,
  x: Number,
  y: Number,
  width: Number,
  height: Number,
  capacity: Number,
  label: String,
  shape: {
    type: String,
    enum: ['rectangle', 'circle', 'square'],
    default: 'rectangle'
  },
  rotation: {
    type: Number,
    default: 0
  }
});

const floorSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  canvasWidth: { type: Number, default: 1200 },
  canvasHeight: { type: Number, default: 800 },
  tables: [tableSchema],
  backgroundImage: { type: String, default: '' }
});

const seatingLayoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  restaurantName: {
    type: String,
    required: true,
    unique: true
  },
  floors: [floorSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('SeatingLayout', seatingLayoutSchema);


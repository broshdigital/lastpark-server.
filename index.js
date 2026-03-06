require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ─── MongoDB Connection ────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/parksense')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ─── Schemas ───────────────────────────────────────────────────────────────────

const TripSchema = new mongoose.Schema({
  userId:    { type: String, default: 'default' },
  type:      { type: String, enum: ['driving', 'walking'], required: true },
  startTime: { type: Date, required: true },
  endTime:   { type: Date, required: true },
  durationMin: { type: Number },
  startLat:  { type: Number },
  startLng:  { type: Number },
  endLat:    { type: Number },
  endLng:    { type: Number },
  maxSpeed:  { type: Number },
  avgSpeed:  { type: Number }
}, { timestamps: true });

const ParkingSchema = new mongoose.Schema({
  userId:   { type: String, default: 'default' },
  lat:      { type: Number, required: true },
  lng:      { type: Number, required: true },
  accuracy: { type: Number },
  address:  { type: String },
  savedAt:  { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Trip    = mongoose.model('Trip', TripSchema);
const Parking = mongoose.model('Parking', ParkingSchema);

// ─── API Routes ────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── PARKING ──────────────────────────────────────────

// Save parking location
app.post('/api/parking', async (req, res) => {
  try {
    const { lat, lng, accuracy, address, userId = 'default' } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: 'lat/lng required' });

    // Deactivate old parking records for user
    await Parking.updateMany({ userId, isActive: true }, { isActive: false });

    const parking = await Parking.create({ userId, lat, lng, accuracy, address });
    res.status(201).json({ success: true, parking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get last active parking
app.get('/api/parking/last', async (req, res) => {
  try {
    const { userId = 'default' } = req.query;
    const parking = await Parking.findOne({ userId, isActive: true }).sort({ savedAt: -1 });
    res.json({ parking: parking || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get parking history
app.get('/api/parking/history', async (req, res) => {
  try {
    const { userId = 'default', limit = 10 } = req.query;
    const parkings = await Parking.find({ userId })
      .sort({ savedAt: -1 })
      .limit(parseInt(limit));
    res.json({ parkings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TRIPS ─────────────────────────────────────────────

// Save a completed trip
app.post('/api/trips', async (req, res) => {
  try {
    const {
      userId = 'default', type, startTime, endTime,
      startLat, startLng, endLat, endLng, maxSpeed, avgSpeed
    } = req.body;

    if (!type || !startTime || !endTime)
      return res.status(400).json({ error: 'type, startTime, endTime required' });

    const durationMin = Math.round((new Date(endTime) - new Date(startTime)) / 60000);

    const trip = await Trip.create({
      userId, type, startTime, endTime, durationMin,
      startLat, startLng, endLat, endLng, maxSpeed, avgSpeed
    });

    res.status(201).json({ success: true, trip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get trip history
app.get('/api/trips', async (req, res) => {
  try {
    const { userId = 'default', limit = 30, type } = req.query;
    const filter = { userId };
    if (type) filter.type = type;

    const trips = await Trip.find(filter)
      .sort({ startTime: -1 })
      .limit(parseInt(limit));

    res.json({ trips });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get last driving trip
app.get('/api/trips/last-drive', async (req, res) => {
  try {
    const { userId = 'default' } = req.query;
    const trip = await Trip.findOne({ userId, type: 'driving' }).sort({ endTime: -1 });
    res.json({ trip: trip || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats summary
app.get('/api/stats', async (req, res) => {
  try {
    const { userId = 'default' } = req.query;
    const totalDrives  = await Trip.countDocuments({ userId, type: 'driving' });
    const totalWalks   = await Trip.countDocuments({ userId, type: 'walking' });
    const driveAgg = await Trip.aggregate([
      { $match: { userId, type: 'driving' } },
      { $group: { _id: null, totalMin: { $sum: '$durationMin' }, avgSpeed: { $avg: '$avgSpeed' }, maxSpeed: { $max: '$maxSpeed' } } }
    ]);
    res.json({
      totalDrives, totalWalks,
      totalDriveMinutes: driveAgg[0]?.totalMin || 0,
      avgSpeed: driveAgg[0]?.avgSpeed?.toFixed(1) || 0,
      maxSpeed: driveAgg[0]?.maxSpeed?.toFixed(1) || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Catch-all → serve frontend ───────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚗 ParkSense server running on port ${PORT}`);
});

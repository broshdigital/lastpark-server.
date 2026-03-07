require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/parksense')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/parking', async (req, res) => {
  try {
    const { lat, lng, accuracy, address, userId = 'default' } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: 'lat/lng required' });

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentParkings = await Parking.find({ userId, savedAt: { $gte: fiveMinAgo } });
    for (const existing of recentParkings) {
      if (haversineMeters(existing.lat, existing.lng, lat, lng) < 200) {
        return res.status(200).json({ success: true, parking: existing, deduplicated: true });
      }
    }

    await Parking.updateMany({ userId, isActive: true }, { isActive: false });
    const parking = await Parking.create({ userId, lat, lng, accuracy, address });
    res.status(201).json({ success: true, parking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/parking/last', async (req, res) => {
  try {
    const { userId = 'default' } = req.query;
    const parking = await Parking.findOne({ userId, isActive: true }).sort({ savedAt: -1 });
    res.json({ parking: parking || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

app.get('/api/trips', async (req, res) => {
  try {
    const { userId = 'default', limit = 30, type } = req.query;
    const filter = { userId };
    if (type) filter.type = type;
    const trips = await Trip.find(filter).sort({ startTime: -1 }).limit(parseInt(limit));
    res.json({ trips });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/trips/last-drive', async (req, res) => {
  try {
    const { userId = 'default' } = req.query;
    const trip = await Trip.findOne({ userId, type: 'driving' }).sort({ endTime: -1 });
    res.json({ trip: trip || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const { userId = 'default' } = req.query;
    const totalDrives = await Trip.countDocuments({ userId, type: 'driving' });
    const totalWalks  = await Trip.countDocuments({ userId, type: 'walking' });
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚗 ParkSense server running on port ${PORT}`);
});

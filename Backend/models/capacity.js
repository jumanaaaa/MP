const mongoose = require('mongoose');

const capacitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true }, // e.g. "Project"
  project: { type: String, required: true },
  activity: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  durationInHours: { type: Number, required: true },
  date: { type: String, required: true } // Format: YYYY-MM-DD
}, { timestamps: true });

module.exports = mongoose.model('Capacity', capacitySchema);


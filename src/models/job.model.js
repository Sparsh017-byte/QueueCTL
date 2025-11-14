const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  command: { type: String, required: true },
  state: { type: String, enum: ['pending','processing','completed','failed','dead'], default: 'pending' },
  attempts: { type: Number, default: 0 },
  max_retries: { type: Number, default: parseInt(process.env.DEFAULT_MAX_RETRIES || 3) },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  last_error: { type: String, default: null },
  locked_at: { type: Date, default: null }, 
  lock_expires_at: { type: Date, default: null }, 
  next_run_at: { type: Date, default: null } 
}, { timestamps: false });

JobSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('Job', JobSchema);

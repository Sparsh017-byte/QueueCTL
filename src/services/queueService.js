const Job = require('../models/job.model');
const { exponentialBackoff } = require('../utils/backoff');

const DEFAULT_LOCK_TTL_MS = parseInt(process.env.LOCK_TTL_MS || 60000);
const BACKOFF_BASE = parseInt(process.env.DEFAULT_BACKOFF_BASE || 2);

async function enqueue(jobData) {
  const j = new Job({
    id: jobData.id,
    command: jobData.command,
    max_retries: jobData.max_retries ?? parseInt(process.env.DEFAULT_MAX_RETRIES || 3),
  });
  return j.save();
}

async function atomicFetchAndLock() {
  const now = new Date();
  const filter = {
    state: 'pending',
    $or: [
      { lock_expires_at: { $lte: now } },
      { lock_expires_at: null }
    ],
    $or: [
      { next_run_at: null },
      { next_run_at: { $lte: now } }
    ]
  };

  const update = {
    $set: {
      state: 'processing',
      locked_at: now,
      lock_expires_at: new Date(Date.now() + DEFAULT_LOCK_TTL_MS)
    },
    $inc: { attempts: 1 },
    $setOnInsert: { updated_at: now }
  };

  
  const job = await Job.findOneAndUpdate(filter, update, { sort: { created_at: 1 }, new: true });
  return job;
}

async function markCompleted(jobId) {
  return Job.findOneAndUpdate({ id: jobId }, { state: 'completed', locked_at: null, lock_expires_at: null, updated_at: new Date() });
}

async function markFailed(job, errMsg) {
  const attempts = job.attempts;
  const maxRetries = job.max_retries;
  if (attempts >= maxRetries) {
    
    return Job.findOneAndUpdate({ id: job.id }, {
      state: 'dead',
      last_error: errMsg,
      lock_expires_at: null,
      locked_at: null,
      updated_at: new Date()
    });
  } else {
    
    const delayMs = exponentialBackoff(process.env.DEFAULT_BACKOFF_BASE || BACKOFF_BASE, attempts);
    return Job.findOneAndUpdate({ id: job.id }, {
      state: 'failed',
      last_error: errMsg,
      next_run_at: new Date(Date.now() + delayMs),
      lock_expires_at: null,
      locked_at: null,
      updated_at: new Date()
    });
  }
}

async function listByState(state) {
  return Job.find({ state }).sort({ created_at: 1 }).lean();
}

async function getStats() {
  const agg = await Job.aggregate([
    { $group: { _id: '$state', count: { $sum: 1 } } }
  ]);
  const result = {};
  agg.forEach(a => result[a._id] = a.count);
  return result;
}

async function dlqRetry(jobId) {
  
  return Job.findOneAndUpdate({ id: jobId, state: 'dead' }, { state: 'pending', attempts: 0, last_error: null, next_run_at: null, updated_at: new Date() });
}

module.exports = {
  enqueue, atomicFetchAndLock, markCompleted, markFailed, listByState, getStats, dlqRetry
};

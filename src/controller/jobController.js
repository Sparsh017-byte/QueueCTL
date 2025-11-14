const queue = require('../services/queueService');

async function enqueueHandler(req, res, next) {
  try {
    const job = await queue.enqueue(req.body);
    res.json(job);
  } catch (err) { next(err); }
}

module.exports = { enqueueHandler };

const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function connect(uri) {
  uri = uri || process.env.MONGO_URI;
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  logger.info('Connected to MongoDB');
}

module.exports = { connect, mongoose };

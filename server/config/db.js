const mongoose = require('mongoose');
const path     = require('path');
const fs       = require('fs');

/**
 * Connect to MongoDB.
 * - Local dev:  plain MongoDB on localhost
 * - Cloud:      Amazon DocumentDB with TLS (set USE_DOCDB=true in .env)
 */
async function connectDB(uri) {
  mongoose.set('strictQuery', true);

  const options = {};

  if (process.env.USE_DOCDB === 'true') {
    const certPath = path.join(__dirname, '..', 'global-bundle.pem');
    if (fs.existsSync(certPath)) {
      options.tls = true;
      options.tlsCAFile = certPath;
      options.retryWrites = false;
    }
  }

  const conn = await mongoose.connect(uri, options);
  console.log(`MongoDB connected: ${conn.connection.host}`);
  return conn;
}

module.exports = connectDB;

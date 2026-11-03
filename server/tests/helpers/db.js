const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongo;

// Start an in-memory MongoDB and connect Mongoose to it.
async function connectDB() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}

// Clear all collections (run between tests for isolation).
async function clearDB() {
  for (const collection of Object.values(mongoose.connection.collections)) {
    await collection.deleteMany({});
  }
}

// Stop the in-memory server and disconnect Mongoose.
async function disconnectDB() {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}

module.exports = { connectDB, clearDB, disconnectDB };

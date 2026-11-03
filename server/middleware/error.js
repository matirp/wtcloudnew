// Centralized error handler: normalizes Mongoose/JWT errors into clean JSON.

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

function errorHandler(err, req, res, next) {
  // Always log the full error so it shows in the server terminal
  console.error(`[ERROR] ${req.method} ${req.path} →`, err.message || err);

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(', '), errors: messages });
  }

  // Duplicate key (unique constraint violation)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res
      .status(409)
      .json({ message: `${field} already exists: ${err.keyValue[field]}` });
  }

  // Cast error (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }

  // Custom application error with explicit status code
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  console.error(err);
  res.status(500).json({ message: 'Server error' });
}

module.exports = { errorHandler, AppError };

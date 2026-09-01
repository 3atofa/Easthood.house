/**
 * An error the API meant to produce, as opposed to a crash. The error
 * handler trusts `statusCode` and `message` on these and nothing else.
 */
export class ApiError extends Error {

  constructor(statusCode, message, details = null) {
    super(message);

    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Not authenticated') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Not allowed') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Already exists') {
    return new ApiError(409, message);
  }

  static tooMany(message = 'Too many requests') {
    return new ApiError(429, message);
  }
}

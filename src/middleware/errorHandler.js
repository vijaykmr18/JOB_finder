export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  const status = error.statusCode || error.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  console.error(error);

  res.status(status).json({
    message: status >= 500 && isProduction ? 'Something went wrong' : error.message,
    ...(isProduction ? {} : { stack: error.stack })
  });
}

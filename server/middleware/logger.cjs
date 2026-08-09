// Request logger middleware
function requestLogger(req, res, next) {
  // Log specific endpoints
  if (req.originalUrl.includes('/ims/check-permission')) {
    }
  
  if (req.originalUrl.includes('/finalize')) {
    }
  
  next();
}

module.exports = requestLogger;

export const errorHandler = (error, req, res, next) => {
  console.error(error.stack);
  const statusCode = error.status || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      status: statusCode,
      message: statusCode === 500 ? 'Erreur interne du serveur' : error.message
    }
  });
};

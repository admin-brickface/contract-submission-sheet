module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).json({
    message: 'API is working!',
    method: req.method,
    timestamp: new Date().toISOString()
  });
};

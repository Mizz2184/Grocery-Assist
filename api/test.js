// Simple endpoint for testing Vercel deployment
export default function handler(req, res) {
  res.status(200).json({
    message: 'API is working correctly!',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
} 
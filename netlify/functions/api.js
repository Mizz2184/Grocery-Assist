const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

// Copy your existing endpoints here
app.post('/proxy/maxipali/search', async (req, res) => {
  // Your existing search endpoint code
});

app.get('/proxy/maxipali/barcode/:barcode', async (req, res) => {
  // Your existing barcode endpoint code
});

// Export the handler
module.exports.handler = serverless(app);
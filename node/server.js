/// @file server.js
/// @brief Node server to handle web requests
/// @author 30hours

const express = require('express');
const rate_limit = require('express-rate-limit');
const cors = require('cors');
const RequestQueue = require('./RequestQueue');
const app = express();
app.set('trust proxy', 1);

// global rate limiter
const limiter = rate_limit({
  // 10 mins
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: {
    data: 'none',
    message: 'Rate limited (>30 requests in 10 mins)'
  }
});

app.use(cors());
// limit to 
app.use(express.json({ limit: '10kb' }));
app.use(limiter);

const VALID_ENDPOINTS = ['preview', 'stl', 'step']

const requestQueue = new RequestQueue();

// test GET endpoint for debugging
app.get('/test', (req, res) => {
    res.send('Node server is running');
});

// log all POST requests first
const fs = require('fs').promises;
const path = require('path');
app.post('/:endpoint', async (req, res, next) => {
  const timestamp = new Date().toISOString();
  const formattedLog = `{
  "timestamp": "${timestamp}",
  "endpoint": "${req.params.endpoint}",
  "body": 
${req.body['code'].split('\n').map(line => '    ' + line).join('\n')}
  ,
  "ip": "${req.headers['x-real-ip']}"
}\n`;
  try {
    const logDir = '/logs/'; 
    const logFile = path.join(logDir, `requests-${timestamp.split('T')[0]}.log`);
    await fs.appendFile(
      logFile,
      formattedLog,
      'utf8'
    );
  } catch (error) {
    console.error('Error logging request:', error);
  }
  // continue without sending response
  next();
});

// POST endpoint
app.post('/:endpoint', async (req, res) => {
  try {
    const endpoint = req.params.endpoint;
    // validate endpoint
    if (!VALID_ENDPOINTS.includes(endpoint)) {
      return res.status(400).json({
        data: 'none',
        message: 'Invalid endpoint'
      });   
    }
    const { code } = req.body;
    // add to queue and wait for response
    const response = await requestQueue.addRequest(endpoint, code);
    // if STL/STEP request, forward the headers and binary data
    if ((endpoint === 'stl') || (endpoint === 'step')) {
      // forward content-disposition header if present
      const contentDisposition = response.headers?.['content-disposition'];
      if (contentDisposition) {
        res.setHeader('Content-Disposition', contentDisposition);
      }
      res.setHeader('Content-Type', 'application/octet-stream');
      res.send(response);
    } else {
      res.send(response);
    }
  } catch (error) {
    res.status(error.status).json({
      data: 'none',
      message: error.message
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Node.js server running on port ${PORT}`);
});

// handle exit
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received.');
  process.exit(0);
});

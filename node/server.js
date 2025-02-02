/// @file server.js
/// @brief Node server to handle web requests
/// @author 30hours

const express = require('express');
const cors = require('cors');
const RequestQueue = require('./RequestQueue');
const app = express();

app.use(cors());
app.use(express.json());

const VALID_ENDPOINTS = ['preview', 'stl']

const requestQueue = new RequestQueue();

// test GET endpoint for debugging
app.get('/test', (req, res) => {
    res.send('Node server is running');
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
    res.send(response);
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
/// @file RequestQueue.js
/// @brief Implements a queue with unique identifiers
/// @author 30hours

const axios = require('axios');

class RequestQueue {

  constructor() {
    this.queue = [];
    this.isProcessing = false;
    // maps request_id to Promise resolvers
    this.requestMap = new Map();
  }

  async addRequest(endpoint, code) {
    // date and random string
    const request_id = Date.now() + '-' + 
      Math.random().toString(36).substring(2, 11);
    // create a promise for when request is processed
    const requestPromise = new Promise((resolve, reject) => {
      this.requestMap.set(request_id, { resolve, reject });
    });
    this.queue.push({ request_id, endpoint, code });
    this.processQueue();
    return requestPromise;
  }

  async processQueue() {
    // queue management first
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    const { request_id, endpoint, code } = this.queue.shift();
    try {
      console.log(`Processing request ${request_id} with endpoint ${endpoint}`);
      // call CadQuery server with appropriate response type
      const response = await axios.post('http://cadquery:5000/' + endpoint, {
          code: code
      }, {
          responseType: (endpoint === 'stl' || endpoint === 'step') ? 'arraybuffer' : 'json'
      });
      // resolve the promise for this specific request
      const resolver = this.requestMap.get(request_id);
      if (resolver) {
          resolver.resolve(response.data);
          this.requestMap.delete(request_id);
      }
    } catch (error) {
        // log the error
        console.log('[ERROR] ', error.response?.data?.message 
          || error.response?.data || error.message);
        // reject the promise if there was an error
        const resolver = this.requestMap.get(request_id);
        if (resolver) {
          // reject error.response with data if it has any
          resolver.reject(error.response?.data ? {
              status: error.response.status,
              ...error.response.data
          } : error);
          this.requestMap.delete(request_id);
      }
    }
    this.isProcessing = false;
    this.processQueue();
  }
}

module.exports = RequestQueue;
// Minimal test to check what's causing the hang
console.log('Starting minimal test...');

// Test 1: Basic HTTP server
import http from 'http';

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World\n');
});

server.listen(3001, () => {
  console.log('Test server running on port 3001');
});

// Test 2: Check if we can make HTTP requests
const testRequest = () => {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    res.on('data', (chunk) => {
      console.log(`Body: ${chunk}`);
    });
  });

  req.on('error', (err) => {
    console.error('Request error:', err);
  });

  req.on('timeout', () => {
    console.error('Request timeout');
    req.destroy();
  });

  req.end();
};

// Test the server after 1 second
setTimeout(testRequest, 1000);

// Exit after 10 seconds
setTimeout(() => {
  console.log('Test complete, exiting...');
  process.exit(0);
}, 10000);

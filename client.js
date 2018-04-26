const WebSocket = require('ws');

const ws = new WebSocket('ws://ec2-18-188-255-191.us-east-2.compute.amazonaws.com:8080/');

ws.on('open', function open() {
  ws.send('client connected');
});

ws.on('message', function incoming(data) {
  let response = JSON.parse(data);
  console.log(response);
});
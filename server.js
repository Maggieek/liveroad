const WebSocket = require('ws');
const moment = require('moment');

var AWS = require('aws-sdk');
var credentials = new AWS.SharedIniFileCredentials({profile: 'default'});
AWS.config.credentials = credentials;
AWS.config.update({region: 'us-east-2'});

const wss = new WebSocket.Server({ port: 8080 });

let ddb = new AWS.DynamoDB({apiVersion: '2012-10-08'});
let params = {
  TableName: 'liveroad'
  // FilterExpression: 'id <= :i',
  // ExpressionAttributeValues: {
  //   ':i': {
  //     N: '' + max_initial_key
  //   }
  // }
};

let connections = [];

console.log('hi!');

let fetch = function(ws, connection_id) {
  let data = '(empty)';

  let this_params = Object.assign({}, params);

  ddb.scan(this_params, function(err, response) {
    if (err) {
      console.log("Error", connection_id, err);
    } else {
      console.log("Success", connection_id, response);
      data = response.Items;

      data = filterByTimestamp(data, connections[connection_id].last_sync);

      if (data.length) {
        connections[connection_id].last_sync = moment();

        ws.send(JSON.stringify(data, function(key, value) {
          if (value.S) {
            return value.S;
          }
          if (value.N) {
            return value.N;
          }
          if (value.M) {
            return value.M;
          }
          return value;
        }));
      }
    }
  });
}

let filterByTimestamp = function(items, timestamp) {
  let returnItems = [];
  items.forEach(function(item) {
    if (moment(item.timestamp.S).isAfter(timestamp)) {
      returnItems.push(item);
    }
  });
  returnItems = returnItems.sort(function(a, b) {
    if (moment(a.timestamp.S).isAfter(moment(b.timestamp.S))) {
      return -1;
    }
    return 1;
  });
  return returnItems;
}

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });

  let connection_id = connections.length;

  console.log('Connected client: ' + connection_id);

  connections[connection_id] = {
    last_sync: moment('1970-01-01T00:00:00+00:00')
  }

  fetch(ws, connection_id);

  let int = setInterval(function() {
    if (ws.readyState === 1) {
      fetch(ws, connection_id);
    } else {
      ws.close();
      console.log('Closed connection: ' + connection_id);
      clearInterval(int);
    }
  }, 5000)
});
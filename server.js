const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const redis = require("redis");
// TODO: correct REDIS url from ENV
const REDIS_HOST = process.env.REDIS_HOST || "redis-server"
const client = redis.createClient({
    host: REDIS_HOST.toString(),
    port: 6379
});

client.on("error", function(error) {
  console.error(error);
});

const port = process.env.PORT || 3000;


app.use(express.static(__dirname + '/public'));

function onConnection(socket){
  socket.on('load', (data) => {
      client.smembers('drawings', (err, ok) => {
          if (err) return;
          ok.forEach(client_id => {
              client.lrange(client_id, 0, -1, (err, commands) => {
                 commands.forEach(raw_command => {
                     const command = JSON.parse(raw_command)
                     socket.emit(command.type, command.data);
                 })
              })
          })
      })
  })
  socket.on('drawing_start', (data) => {
      // Add drawer to drawset
      client.sadd('drawings', data.c, () => {
          client.lpush(data.c, JSON.stringify({type: "drawing_start", ts: new Date(), data: data}), (ok, err) => {
              socket.broadcast.emit('drawing_start', data)
          })
      });
  });
  socket.on('drawing_stroke', (data) => {
    client.lpush(data.c, JSON.stringify({type: "drawing_stroke", ts: new Date(), data: data}), (ok, err) => {
        socket.broadcast.emit('drawing_stroke', data)
    })
    });
    socket.on('drawing_end', (data) => {
        client.lpush(data.c, JSON.stringify({type: "drawing_end", ts: new Date(), data: data}), (ok, err) => {
            socket.broadcast.emit('drawing_end', data)
        })
    });
}

io.on('connection', onConnection);

http.listen(port, () => console.log('listening on port ' + port));
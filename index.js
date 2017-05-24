var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + "/public"));

io.on("connection", function(socket){
	socket.on("roll", function(data){
		socket.broadcast.emit("roll", data);
	});
});

http.listen(3000, () => console.log("Now listening on port 3000"));

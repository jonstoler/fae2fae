var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + "/public"));

process.on("SIGINT", function(){
	io.sockets.emit("kick");
	process.exit();
});

var gamestate = {
	reset: function(){
		this.characters = [];
		this.log = [];
		this.aspects = [];
		this.players = [];
		this.gm = {};

		this._sockmap = {};
	}
};
gamestate.reset();

io.on("connection", function(socket){
	socket.propagate = function(id, data){
		socket.emit(id, data);
		socket.broadcast.emit(id, data);
	}

	socket.on("sync_all", function(data){
		socket.emit("sync_all", gamestate);
	});
	socket.on("sync_players", function(data){
		socket.emit("sync_players", gamestate.players);
	});

	socket.on("reset", function(data){
		gamestate.reset();
		socket.propagate("kick");
	});


	socket.on("gm_exists", function(data){
		socket.emit("gm_exists", gamestate.gm.id != undefined);
	});

	socket.on("gm_get", function(data){
		socket.emit("gm_get", gamestate.gm);
	});

	socket.on("gm_join", function(data){
		gamestate.gm = data;
		data.gm = true;
		gamestate.players.push(data);
		gamestate._sockmap[data.id] = socket.conn.id;
		socket.broadcast.emit("sync_players", gamestate.players);
	});


	socket.on("pc_join", function(data){
		data.status = "online";
		data.gm = false;
		gamestate.players.push(data);
		gamestate._sockmap[data.id] = socket.conn.id;
		socket.broadcast.emit("sync_players", gamestate.players);
	});

	socket.on("pc_kick", function(data){
		for(var i = 0; i < gamestate.players.length; i++){
			if(gamestate.players[i].id == data.id){
				if(data.id == gamestate.gm.id){
					gamestate.gm = {};
				}
				gamestate.players.splice(i, 1);
				break;
			}
		}
		var sockid = gamestate._sockmap[data.id];
		if(io.sockets.connected[sockid]){
			io.sockets.connected[sockid].emit("kick");
			io.sockets.connected[sockid].disconnect();
		}
		socket.broadcast.emit("sync_players", gamestate.players);
	});


	socket.on("char_new", function(data){
		gamestate.characters.push(data);
		socket.broadcast.emit("sync_characters", gamestate.characters);
	});

	
	socket.on("disconnect", function(reason){
		if(reason == "transport close"){
			var playerid;
			for(playerid in gamestate._sockmap){
				if(gamestate._sockmap.hasOwnProperty(playerid)){
					var sockid = gamestate._sockmap[playerid];			
					if(sockid == socket.id){
						delete gamestate._sockmap[playerid];
						break;
					}
				}
			}
			for(var i = 0; i < gamestate.players.length; i++){
				if(gamestate.players[i].id == playerid){
					if(playerid == gamestate.gm.id){
						gamestate.gm = {};
					}
					gamestate.players.splice(i, 1);
					break;
				}
			}
			socket.broadcast.emit("sync_players", gamestate.players);
		}
	});
});

http.listen(3000, () => console.log("Now listening on port 3000"));

(function(){

	function generateID(){
		var id = "";
		for(var i = 0; i < 16; i++){
			var ch = Math.random() * 16 | 0;
			id += ch.toString(16);
		}
		return id;
	}

	var toastTimeout;
	function toast(txt){
		var toast = document.getElementById("toast");
		clearTimeout(toastTimeout);
		toast.innerText = txt;
		toast.style.opacity = 1;
		toastTimeout = setTimeout(function(){
			toast.style.opacity = 0;
		}, 3000);
	}

	var fae = new Vue({
		el: "#play",
		data: {
			characters: [],
			log: [],
			aspects: [],
			players: [],
			gm: false,
			id: generateID(),
		},
		computed: {
			sortedPlayers: function(){
				var sorted = [];
				for(var i = 0; i < this.players.length; i++){
					var p = this.players[i];
					if(p.id == this.id){
						sorted.unshift(p);
					} else {
						sorted.push(p);
					}
				}
				return sorted;
			},
			sortedCharacters: function(){
				return this.characters;
			}
		}
	})

	var socket = io("http://localhost:3000");
	socket.on("connect", function(){
		var gmCheck = setInterval(function(){
			socket.emit("gm_exists");
		}, 1000);
		socket.emit("gm_exists");

		socket.on("gm_exists", function(data){
			var search = $("#gm-search");
			var searchtxt = $("#gm-search-txt");
			var found = $("#gm-found");
			var notfound = $("#gm-not-found");
			if(data === true){
				found.removeClass("hidden");
				notfound.addClass("hidden");
				search.addClass("hidden");
				socket.emit("gm_get");
			} else {
				notfound.removeClass("hidden");
				search.removeClass("hidden");
				found.addClass("hidden");
				$("#gm-id").text("Someone");
			}
			searchtxt.addClass("hidden");
		});

		$("#gm-join").on("click", function(){
			var name = $("#player-name").val();
			if(name == ""){
				toast("Please enter a name.");
				$("#player-name").addClass("error");
				$("#player-name").focus();
			} else {
				socket.emit("gm_join", {
					name: $("#player-name").val(),
					id: fae.id,
				});
				clearInterval(gmCheck);
				fae.gm = true;

				$("#join").addClass("hidden");
				$("#play").removeClass("hidden");

				socket.emit("sync_all");
			}
		});

		$("#pc-join").on("click", function(){
			var name = $("#player-name").val();
			if(name == ""){
				toast("Please enter a name.");
				$("#player-name").addClass("error");
				$("#player-name").focus();
			} else {
				socket.emit("pc_join", {
					name: $("#player-name").val(),
					id: fae.id,
				});
				clearInterval(gmCheck);
				$("#join").addClass("hidden");
				$("#play").removeClass("hidden");

				socket.emit("sync_all");
			}
		});

		socket.on("gm_get", function(data){
			$("#gm-id").text(data.name);
		});

		socket.on("sync_all", function(data){
			fae.players = data.players;
			fae.characters = data.characters;
		});
		socket.on("sync_players", function(data){
			fae.players = data;
		});
		socket.on("sync_characters", function(data){
			fae.characters = data;
		});

		socket.on("kick", function(data){
			document.location.reload();
		});
	});

	$("#sync-btn").on("click", function(){ socket.emit("sync_all"); });
	$("#reset-btn").on("click", function(){ socket.emit("reset"); });

	$("#video").on("click", ".close", function(e){
		var id = $(this).attr("data-id");
		socket.emit("pc_kick", {id: id});
		for(var i = 0; i < fae.players.length; i++){
			if(fae.players[i].id == id){
				fae.players.splice(i, 1);
				break;
			}
		}
	});

	$("#save-character").on("click", function(e){
		$("#mkchar").prop("checked", false);
		toast("Character saved.");
		fae.characters.push({});
		console.log(fae.characters);
		socket.emit("char_new", {});
	});

	$(document.body).on("keydown", function(e){
		if(e.keyCode == 27){ // ESC
			// close modals
			console.log("closing modals");
			$('.modal input[type=checkbox]').each(function(){
				console.log(this);
				$(this).prop("checked", false);
			});
		}
	});
})();

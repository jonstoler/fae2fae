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
		},
		filters: {
			ucfirst: function(str){
				return str[0].toUpperCase() + str.substring(1);
			}
		}
	});

	var charApproaches = new Vue({
		el: "#approaches-table",
		data: {
			total: { good: 1, fair: 2, average: 2, mediocre: 1 },
			approaches: { careful: false, clever: false, flashy: false, forceful: false, quick: false, sneaky: false }
		},
		computed: {
			remaining: function(){
				var left = { good: 0, fair: 0, average: 0, mediocre: 0 };
				for(var approach in this.approaches){
					if(this.approaches[approach]){
						left[this.approaches[approach]]++;
					}
				}
				return {
					good: this.total.good - left.good,
					fair: this.total.fair - left.fair,
					average: this.total.average - left.average,
					mediocre: this.total.mediocre - left.mediocre
				}
			},
		}
	});
	var charStunts = new Vue({
		el: "#mkchar-stunts",
		data: {
			stunts: [
				{ name: "", description: "" }
			]
		},
		methods: {
			newstunt: function(){
				this.stunts.push({ name: "", description: "" });
			}
		}
	});

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
			$('.modal input[type=checkbox]').each(function(){
				$(this).prop("checked", false);
			});
			document.location.reload();
		});
	});

	$("#sync-btn").on("click", function(){ socket.emit("sync_all"); });
	$("#reset-btn").on("click", function(){ socket.emit("reset"); });

	$("#players").on("click", ".close", function(e){
		var id = $(this).attr("data-id");
		socket.emit("pc_kick", {id: id});
		for(var i = 0; i < fae.players.length; i++){
			if(fae.players[i].id == id){
				fae.players.splice(i, 1);
				break;
			}
		}
	});
	$("#characters").on("click", ".close", function(e){
		var id= $(this).attr("data-id");
		socket.emit("char_delete", {id: id});
		for(var i = 0; i < fae.characters.length; i++){
			if(fae.characters[i].id == id){
				fae.characters.splice(i, 1);
				break;
			}
		}
	});

	$("#save-character").on("click", function(e){
		var character = {
			name: "",
			description: "",
			id: generateID(),
			player: fae.id,
			aspects: [],
			approaches: {},
			stunts: []
		};
		character.name = $("#mkchar-id-name").val();
		character.description = $("#mkchar-id-description").val();
		character.aspects.push($("#mkchar-aspect-high-concept").val());
		character.aspects.push($("#mkchar-aspect-trouble").val());
		for(var i = 3; i < 6; i++){
			var aspect = $("#mkchar-aspect-" + i).val();
			if(aspect){
				character.aspects.push(aspect);
			}
		}
		character.stunts.push($("#mkchar-stunts").val());

		var missing = [];
		if(character.name == ""){
			missing.push("name");
			$("#mkchar-id-name").addClass("error");
		}
		if(character.description == ""){
			missing.push("description")
			$("#mkchar-id-description").addClass("error");
		}
		var approachvalues = {'good': 3, 'fair': 2, 'average': 1, 'mediocre': 0, '': null}
		var approaches = ['careful', 'clever', 'flashy', 'forceful', 'quick', 'sneaky'];
		for(var i = 0; i < approaches.length; i++){
			var choice = $("input[name=" + approaches[i] + "-rating]:checked").val();
			if(choice != undefined){
				character.approaches[approaches[i]] = approachvalues[choice];
			} else {
				missing.push("approaches");
				break;
			}
		}

		if(missing.length > 0){
			var error = "Character " + missing[0];
			for(var i = 1; i < missing.length - 1; i++){
				error += ", " + missing[i];
			}
			if(missing.length > 1){
				error += ", and " + missing[missing.length - 1];
			}
			error += " missing.";
			toast(error);
		} else {
			$("#mkchar").prop("checked", false);
			toast("Character saved.");
			fae.characters.push(character);
			console.log(character.approaches);
			socket.emit("char_new", character);
		}
	});

	$(document.body).on("keydown", function(e){
		if(e.keyCode == 27){ // ESC
			// close modals
			$('.modal input[type=checkbox]').each(function(){
				$(this).prop("checked", false);
			});
		}
	});
})();

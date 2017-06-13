// can debug in console now
var socket, fae;

$(document).ready(function(){
	$("#player-name").focus();
	$("#player-name").keyup(function(e){
		// on return, join as player
		if(e.keyCode == 13){
			$("#join-as-player").click();
		} else {
		}
	});
	$("body").on("keyup", ".error-empty", function(){
		if($(this).val() != ""){
			$(this).parent(".form-group").removeClass("has-danger");
		}
	});

	function generateID(){
		var id = "";
		for(var i = 0; i < 16; i++){
			var ch = Math.random() * 16 | 0;
			id += ch.toString(16);
		}
		return id;
	}

	var toastTimeout;
	function toast(txt, style){
		style = style || "inverse";

		clearTimeout(toastTimeout);
		$("#toast").removeClass().addClass("bg-" + style);
		if(style != "muted"){
			$("#toast").addClass("text-white");
		}
		$("#toast").text(txt);
		$("#toast").show();
		$("#toast").css("opacity", 1);
		toastTimeout = setTimeout(function(){
			$("#toast").css("opacity", 0);
			toastTimeout = setTimeout(function(){
				$("#toast").hide();
			}, 300);
		}, 3000);
	}

	$("#sync-btn").click(function(){ socket.emit("sync_all"); });
	$("#reset-btn").click(function(){ socket.emit("reset"); });
	$("#load-btn").click(function(){ socket.emit("load"); })

	fae = new Vue({
		el: "#play",
		data: {
			players: {},
			characters: {},
			log: {},
			id: generateID(),
			gm: false,
		},
		methods: {
			rmchar: function(e){
				var id = $(e.target).attr("data-id");
				socket.emit("char_delete", this.characters[id]);
			},
			editchar: function(e){
				var id = $(e.target).attr("data-id");
				var character = fae.characters[id];
				for(var i = 0; i < character.aspects.length; i++){
					var name = character.aspects[i].name;
					var desc = character.aspects[i].description;
					if(i == 0){
						$("#char-m-as-hc-n").val(name);
						$("#char-m-as-hc-d").val(desc);
					} else if(i == 0){
						$("#char-m-as-tr-n").val(name);
						$("#char-m-as-tr-d").val(desc);
					} else {
						$("#char-m-as" + i + "-n").val(name);
						$("#char-m-as" + i + "-d").val(desc);
					}
				}
				$("#char-m-id-n").val(character.name);
				$("#char-m-id-d").val(character.description);

				charStunts.stunts = character.stunts;

				$("#character-modal").modal("show");
			},
		}
	});
	var charApproaches = new Vue({
		el: "#approaches-table",
		data: {
			total: { good: 1, fair: 2, average: 2, mediocre: 1 },
			approaches: { careful: false, clever: false, flashy: false, forceful: false, quick: false, sneaky: false },
		},
		methods: {
			reset: function(){
				this.approaches = { careful: false, clever: false, flashy: false, forceful: false, quick: false, sneaky: false };
			}
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
		el: "#stunts",
		data: {
			free: 3,
			start: 3,
			stunts: [],
		},
		computed: {
			refresh: function(){
				return Math.max(0, this.start - Math.max(0, this.stunts.length - this.free));
			}
		},
		methods: {
			reset: function(){
				this.stunts = [];
			},
			newstunt: function(){
				this.stunts.push({ name: "", description: "" });
			},
			rmstunt: function(e){
				this.stunts.splice($(e).attr("data-id"), 1);
			}
		}
	});
	$("#character-modal-save").click(function(){
		var character = {};
		character.id = generateID();
		character.aspects = [];

		var charName = $("#char-m-id-n").val();
		var charDesc = $("#char-m-id-d").val();
		if(charName == "" && charDesc != ""){
			toast("Please provide a name for your character.", "danger");
			$("#char-m-id-n-form").addClass("has-danger");
			return;
		} else if(charDesc == "" && charName != ""){
			toast("Please provide a description for your character.", "danger");
			$("#char-m-id-d-form").addClass("has-danger");
			return;
		} else if(charName == "" && charDesc == ""){
			toast("Please provide a name and description for your character.", "danger");
			$("#char-m-id-n-form").addClass("has-danger");
			$("#char-m-id-d-form").addClass("has-danger");
			return;
		}
		character.name = charName;
		character.description = charDesc;

		var hcName = $("#char-m-as-hc-n").val();
		var hcDesc = $("#char-m-as-hc-d").val();
		if(hcName != "" && hcDesc != ""){
			character.aspects.push({name: hcName, description: hcDesc});
		}
		var trName = $("#char-m-as-tr-n").val();
		var trDesc = $("#char-m-as-tr-d").val();
		if(trName != "" && trDesc != ""){
			character.aspects.push({name: trName, description: trDesc});
		}
		for(var i = 3; i <= 5; i++){
			var aName = $("#char-m-as" + i + "-n").val();
			var aDesc = $("#char-m-as" + i + "-d").val();
			if(aName != "" && aDesc != ""){
				character.aspects.push({name: aName, description: aDesc});
			}
		}

		character.approaches = {};
		var approachvalues = {"good": 3, "fair": 2, "average": 1, "mediocre": 0};
		var approaches = ["careful", "clever", "flashy", "forceful", "quick", "sneaky"];
		for(var i = 0; i < approaches.length; i++){
			var choice = charApproaches.approaches[approaches[i]];
			if(choice){
				character.approaches[approaches[i]] = approachvalues[choice];
			} else {
				toast("Please fill out your character's approaches.", "danger");
				return;
			}
		}

		character.stunts = [];
		for(var stunt in charStunts.stunts){
			if(stunt.name != "" && stunt.description != ""){
				character.stunts.push({name: stunt.name, description: stunt.description});
			}
		}

		$("#character-modal").modal("hide");
		socket.emit("char_new", character);
		$("#char-m-id-n").val("");
		$("#char-m-id-d").val("");
		$("#char-m-as-hc-n").val("");
		$("#char-m-as-hc-d").val("");
		$("#char-m-as-tr-n").val("");
		$("#char-m-as-tr-d").val("");
		for(var i = 3; i <= 5; i++){
			$("#char-m-as" + i + "-n").val("");
			$("#char-m-as" + i + "-d").val("");
		}
		charApproaches.reset();
		charStunts.reset();
	});

	var gmCheck;
	$("#join-as-player").click(function(){
		var name = $("#player-name").val();
		if(name == ""){
			toast("Please enter a name.");
			$("#player-name-form").addClass("has-danger");
			$("#player-name").focus();
		} else {
			socket.emit("pc_join", {
				name: name,
				id: fae.id,
			});
			clearInterval(gmCheck);
			$("#join").hide();
			$("#play").show();
			socket.emit("sync_all");
		}
	});
	$("#join-as-gm").click(function(){
		var name = $("#player-name").val();
		if(name == ""){
			toast("Please enter a name.", "danger");
			$("#player-name-form").addClass("has-danger");
			$("#player-name").focus();
		} else {
			socket.emit("gm_join", {
				name: name,
				id: fae.id,
			});
			clearInterval(gmCheck);
			fae.gm = true;

			$("#join").hide();
			$("#play").show();
			socket.emit("sync_all");
		}
	});

	$("#players").on("click", ".close", function(e){
		var id = $(this).attr("data-id");
		socket.emit("pc_kick", {id: id});
	});

	socket = io("http://localhost:3000");
	socket.on("connect", function(){
		gmCheck = setInterval(function(){
			socket.emit("gm_exists");
		}, 1000);
		socket.emit("gm_exists");

		socket.on("gm_exists", function(data){
			if(data === true){
				// there's a GM!
				$("#join-as-gm").hide();
				$("#gm-joined").show();
				$("#join-as-gm").attr("hidden", true);
				$("#join-as-gm").addClass("disabled");
				socket.emit("gm_get");
			} else {
				$("#gm-joined").hide();
				$("#join-as-gm").attr("hidden", false);
				$("#join-as-gm").removeClass("disabled");
				$("#join-as-gm").show();
			}
		});
		socket.on("gm_get", function(data){
			$("#gm-joined strong").text(data.name);
		});

		socket.on("sync_all", function(data){
			fae.players = data.players;
			fae.characters = data.characters;
			fae.log = data.log;
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

});

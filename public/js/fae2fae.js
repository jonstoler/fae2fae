(function(){
	var rolls = new Vue({
		el: "#roll",
		data: {
			rolls: [],
			name: "",
		}
	});

	var socket = io("http://localhost:3000");
	socket.on("connect", function(){
		socket.on("roll", function(data){
			rolls.rolls.push({name: data.name, roll: data.roll});
		});

		document.getElementById("roller").onclick = function(){
			var total = 0;
			var mod = document.getElementById("modifier");
			for(var i = 0; i < 4; i++){
				var r = Math.floor(Math.random() * 3) - 1;
				total += r;
			}
			var add = parseInt(mod.options[mod.selectedIndex].value);
			if(isNaN(add)){ add = 0; }
			total += add;

			rolls.rolls.push({name: rolls.name, roll: total});
			socket.emit("roll", {name: rolls.name, roll: total});
		}
	});
})();

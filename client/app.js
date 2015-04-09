// Initialize Variables
var players = [];
var bestOf = 2;
Session.set('champion',false);

// Subscriptions
Meteor.subscribe('Matches');
Matchups = new Mongo.Collection(null); // Local

Meteor.subscribe('Players', function() {
	// TODO: Replace with submission find or something
	players = Players.find().fetch();
	players = shuffle(players);

	var playerCount = players.length;
	var t = playerCount/2;
	var c = 1;
	var parent = false;

	// Add ALL the matchups in this bracket
	for (var i=0; i<playerCount-1; i+=1) {
		// Reset tier counter
		if (c>t) {
			t = t/2;
			c = 1;
		}
		// Update player parents for 2nd column+
		//if (t !== playerCount/2) {
			//parent = Matchups.find().fetch()[(playerCount/2)+c]._id;
		//}

		Matchups.insert({
			"players" : [
				{
					"name": "",
					"score": 0,
					"parent": parent,
					"winner" : 0
				},
				{
					"name": "",
					"score": 0,
					"parent": parent,
					"winner" : 0
				}
			],
			"winner" : "",
			"tier" : t,
			"bestof" : bestOf
		});

		c++;
	}

	// Update parents of 2nd+ round matchups
	// =====================================
	// TODO: Make this properly dynamic
	var areParents = Matchups.find({tier:playerCount/2}).fetch();

	var round2 = Matchups.find({tier: 2 }).fetch();
	var round3 = Matchups.find({tier: 1 }).fetch();

	for (var k=0; k<=2; k+=2) {
		Matchups.update({ _id: round2[k/2]._id },{
			$set: { 
				"players.0.parent": areParents[k]._id,
				"players.1.parent": areParents[k+1]._id,
			}
		});
	}

	Matchups.update({ _id: round3[0]._id },{
		$set: { 
			"players.0.parent": round2[0]._id,
			"players.1.parent": round2[1]._id,
		}
	});

	// -----------------------------------------
	//   TEMP: Create initial matchups randomly
	// -----------------------------------------
	var m = Matchups.find({tier:playerCount/2}).fetch();
	var p = players;

	for (var j=0; j<m.length; j+=1) {
		//console.log(m[j]._id);

		Matchups.update({ _id: m[j]._id },{
			$set: { 
				"players.0.name": p.pop().name,
				"players.1.name": p.pop().name
			}
		});
	}
});

// Knuth Shuffle
function shuffle(array) {
	var currentIndex = array.length, temporaryValue, randomIndex ;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {

		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}

// Generate columns based off number of players
// participating in tournament
Template.bracket.helpers({
	"columns" : function() {
		var columns = [];
		// TODO: Replace with just players playing this time
		var x = Math.log2( Players.find().fetch().length ) + 1;

		for (var i=0; i<x; i+=1) {
			if (i === x-1) {
				columns.push({ 
					matches : 0
				});
			} else if (i===0) {
				columns.push({ 
					matches : Players.find().fetch().length/2
				});
			} else {
				columns.push({ 
					matches : Players.find().fetch().length/(2*(i*2))
				});
			}
		}

		return columns;
	}
});

Template.column.helpers({
	"isChamp" : function() {
		if (this.matches === 0) {
			return "champion"
		}
	},
	"matchup" : function() {
		return Matchups.find({ tier: this.matches });
	}
});

Template.match.helpers({
	"id" : function() {
		return this._id;
	},
	"pair" : function() {
		var p = this.players;
		//p.winner = this.winner; 
		return p;
	},
	"winner" : function() {
		return this.winner;
	}
});

Template.champ.helpers({
	"name" : function()  {
		return Session.get('champion');
	},
	"winner" : function() {
		if (Session.get('champion')) return "animated rubberBand infinite"
	}
});

Template.player.helpers({
	"id" : function() {
		return this.parent;
	},
	"name" : function() {
		return this.name;
	},
	"score" : function() {
		return this.score;
	},
	"status" : function() {
		return this.winner;
	},
	"isWinnerConfirm" : function() {
		if (this.score>=bestOf) {
			return true;
		} else {
			return false;
		}
	},
	"isWinner" : function() {
		if (this.winner === 1) return "animated tada";
	},
	"isLoser" : function() {
		if (this.winner === -1) return "loser";
	}
})

Template.player.events({
	"click .add" : function(e) {
		if (this.score>=bestOf) return false;

		var parent = (!this.id) ? Template.parentData(1)._id : this.id;
		console.log(parent);

		Matchups.update({ _id: parent, "players.name":this.name },{
			$inc: { 
				"players.$.score": 1
			}
		});
	},
	"click .sub" : function(e) {
		if (this.score<=0) return false;

		var parent = (!this.id) ? Template.parentData(1)._id : this.id;

		Matchups.update({ _id: parent, "players.name":this.name },{
			$inc: { 
				"players.$.score": -1
			}
		});

		// Mark both players as normal and remove any winners
		Matchups.update({ _id: Template.parentData(1)._id },{
			$set: { 
				"winner" : "",
				"players.0.winner": 0,
				"players.1.winner": 0
			}
		});

	},
	"click .win" : function(e) {
		var parent = Template.parentData(1)._id
		console.log("Setting winner on "+parent);
		// Set match winner
		Matchups.update({ _id: parent },{
			$set: { 
				"winner": this.name,
			}
		});
		// Mark player as winner
		Matchups.update({ _id: parent, "players.name":this.name },{
			$set: { 
				"players.$.winner": 1
			}
		});
		// Mark other player as loser
		Matchups.update({ _id: parent, "players.winner":0 },{
			$set: { 
				"players.$.winner": -1
			}
		});
		// Set winner as player of next round
		var pCheck = Matchups.find({ "players.parent" : parent  }).fetch();

		if (!pCheck[0]) {
			// Champion
			Session.set('champion',this.name);
		} else {
			// Not Champion yet
			if (pCheck[0].players[0].parent === parent) {
				Matchups.update({ "players.parent" : parent  },{
					$set: { "players.0.name": this.name }
				});
			} else if (pCheck[0].players[1].parent === parent) {
				Matchups.update({ "players.parent" : parent  },{
					$set: { "players.1.name": this.name }
				});
			}
		}
	}
});
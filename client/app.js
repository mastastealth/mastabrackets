Meteor.subscribe('Matches');
Matchups = new Mongo.Collection(null);

var players = [];
var brackets = [];
var wins = 2;

Meteor.subscribe('Players', function() {
	players = Players.find().fetch();
	players = shuffle(players);

	// Pair up
	for (var i = 0; i < players.length; i += 2) {
		// players[i].score = 0;
		// players[i+1].score = 0;
	    brackets.push([players[i], players[i+1]]);
	}

	//Session.set('brackets',brackets);
	//console.log(players,brackets);

	// Load initial matchups into DB
	for (var j=0; j<brackets.length; j+=1) {
		Matchups.insert({
			"players" : [
				{
					"name": brackets[j][0].name,
					"score": 0,
					"id" : 0
				},
				{
					"name": brackets[j][1].name,
					"score": 0,
					"id" : 1
				}
			],
			"winner" : false
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

Template.bracket.helpers({
	"columns" : function() {
		var brackets = Matchups.find().fetch();
		var blen = brackets.length*2;

		// First Column
		// Set as first column, set player count to full
		if (brackets[0]) {
			brackets[0].isFirst = true;
			brackets[0].count = blen;
		}

		// TODO: Need to figure out a way to set the
		// index of the column in here...
		if (brackets[1]) brackets[1].count = blen/2;
		if (brackets[2]) brackets[2].count = blen/4;
		if (brackets[3]) brackets[3].count = blen/8;
		if (brackets[4]) brackets[4].count = blen/16;

		// Last Column
		// Set as last column (for champion class)
		if (brackets[brackets.length - 1]) {
			brackets[brackets.length - 1].isLast = true;
		}
		// Player Count

		// Finally
		return brackets;
	}
});

Template.column.helpers({
	"id" : function() {
		return this._id;
	},
	"count" : function() {
		return this.count;
	},
	"isChamp" : function() {
		if (this.isLast) {
			return "champion";
		} else {
			return false;
		}
	},
	"matchup" : function() {
		if (this.isFirst) {
			// Spit it all out
			return Matchups.find().fetch();
		} else {
			// Correct number of matchups, blank for now
			var x = [];

			// This is the pair of players per matchup
			for (var i = 0; i < this.count/2; i += 1) {
			    x.push({
			    	players : [{
			    		name:'',id:0
				    },{
				    	name:'',id:1
				    }]
			    });
			}

			// Get some real info
			var y = Matchups.find({
				// TODO: This somehow needs to reflect a $gt that matches
				// the column properly as to show subsequent winners
				players : { 
					$elemMatch : { score: { $gt: (players.length/this.count)-1 } } 
				} 
			}).fetch();

			// Replace x info with actual data
			for (var j = 0; j < y.length; j += 1) {
			    x[Math.floor(j/2)].players[j%2] = y[j].players[ y[j].winner ];
			}

			return x;
		}
	}
});

Template.match.helpers({
	"count" : function() {
		return this.count
	},
	"pair" : function() {
		return this.players;
	},
	"id" : function() {
		return this._id;
	}
});

Template.champ.helpers({
	"name" : function() {
		var max = Players.find().fetch().length;
		var win = 0;

		if (max===4) win = 3;
		if (max===8) win = 4;
		if (max===16) win = 5;

		var y = Matchups.find({
			players : { 
				$elemMatch : { score: { $gt: (wins*(win-1))-1 } } 
			} 
		}).fetch();

		if (y[0]) {
			if (y[0].players[0].score >= wins*(win-1)) {
				return y[0].players[0].name
			} else { return y[0].players[1].name }
		}
	}
})

Template.player.helpers({
	"id" : function() {
		return this.id;
	},
	"name" : function() {
		return this.name;
	},
	"score" : function() {
		// Max number of players in the game
		var max = Matchups.find().fetch().length*2;
		var n = 0;
		if (Template.parentData(2)) n = Template.parentData(2).count;

		// Max out first column at "wins" number
		if (this.score>=wins && n === max) {
			return wins;
		} 
		// Max out other columns at "wins" number as well
		// or show remainder
		else if (this.score>=wins && n != max) {
			if (this.score>=wins*(max/n)) {
				return wins;
			} else {
				return this.score % wins;
			}
		} 
		// Otherwise just add like normal
		else {
			return this.score;
		}
	}
});

Template.player.events({
	"click .add" : function(e) {
		if (true) {
			var par = e.target.parentNode.parentNode.parentNode.getAttribute('id');
			
			Matchups.update({
				"_id" : par,
				"players.name" : this.name 
			}, { 
				$set: { 
					"players.$": { 
						name: this.name,
						id: this.id,
						score: this.score+1 
					} 
				} 
			});

			// If they are currently a winner
			if (this.score+1>1) {
				Matchups.update( 
					par, { 
						$set: { "winner": this.id } 
				});
			} else {
				Matchups.update( 
					par, { 
						$set: { "winner": false } 
				});
			}
		}
	},
	"click .sub" : function(e) {
		if (this.score>0)  {
			var par = e.target.parentNode.parentNode.parentNode.getAttribute('id');
			
			Matchups.update({
				"_id" : par,
				"players.name" : this.name 
			}, { 
				$set: { 
					"players.$": { 
						name: this.name,
						id: this.id,
						score: this.score-1 
					} 
				} 
			});

			// Remove if was winner
			if (this.score-1<2) {
				Matchups.update( 
					par, { 
						$set: { "winner": false } 
				});
			}
		}
	},
});
Meteor.subscribe('Matches');

var players = [];
var brackets = [];
var wins = 2;

Meteor.subscribe('Players', function() {
	players = Players.find().fetch();
	players = shuffle(players);

	// Pair up
	for (var i = 0; i < players.length; i += 2) {
		players[i].score = 0;
		players[i+1].score = 0;

	    brackets.push([players[i], players[i+1]]);
	}

	Session.set('brackets',brackets);

	//console.log(players,brackets);
});

Winners = new Mongo.Collection("winners");

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
		var brackets = Session.get('brackets');
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
			return Session.get('brackets');
		} else {
			// TODO: Add the correct amount of matchups
			// according to count from column, blank originally
			// but with proper winner info as tournament goes on
			var x = [];

			for (var i = 0; i < this.count/2; i += 1) {
			    x.push(['','']);
			}

			return x;
		}
	}
});

Template.match.helpers({
	"pair" : function() {
		return this;
	},
	"id" : function() {
		var brackets = Session.get('brackets');
		return brackets.indexOf(this);
	}
});

Template.player.helpers({
	"name" : function() {
		return this.name;
	},
	"score" : function() {
		return this.score;
	}
});

Template.player.events({
	"click .add" : function() {
		var brackets = Session.get('brackets');

		if (this.score<wins) {
			for (var i = 0; i < brackets.length; i+=1) {
			    if (brackets[i][0].name === this.name) {
			    	brackets[i][0].score += 1;
			    } else if (brackets[i][1].name === this.name) {
			    	brackets[i][1].score += 1;
			    }
			}

			Session.set('brackets',brackets);
		}
	},
	"click .sub" : function() {
		var brackets = Session.get('brackets');

		if (this.score>0)  {
			for (var i = 0; i < brackets.length; i+=1) {
			    if (brackets[i][0].name === this.name) {
			    	brackets[i][0].score -= 1;
			    } else if (brackets[i][1].name === this.name) {
			    	brackets[i][1].score -= 1;
			    }
			}

			Session.set('brackets',brackets);
		}
	},
});
Players = new Mongo.Collection("players");
Matches = new Mongo.Collection("matches");
Matchups = new Mongo.Collection("matchups");
Signup = new Mongo.Collection("signup");

Meteor.methods({
	addScore : function(parent,n) {
		Matchups.update({ _id: parent, "players.name":n },{
			$inc: { 
				"players.$.score": 1
			}
		});
	},
	subScore : function(parent,n) {
		Matchups.update({ _id: parent, "players.name":n },{
			$inc: { 
				"players.$.score": -1
			}
		});
	},
	setWinner : function(parent,n) {
		Matchups.update({ _id: parent, "players.name":n },{
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
	},
	setParent : function(parent,n,p) {
		if (p===0) {
			Matchups.update({ "players.parent" : parent  },{
				$set: { "players.0.name": n }
			});
		} else {
			Matchups.update({ "players.parent" : parent  },{
				$set: { "players.1.name": n }
			});
		}
	},
	addPlayer : function(p) {
		Players.insert({ name: p, playable: true });
	},
	updatePlayer : function(pid) {
		Players.update({ _id: pid }, { 
			$set: { playable: true } 
		});
	},
	swapPlayers : function(id,playerA,playerB) {
		Matchups.update({ _id: id, "players.name": playerA },{
			$set: { "players.$.name": playerB }
		});
	}
});
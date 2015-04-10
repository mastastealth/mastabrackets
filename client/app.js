// Initialize Variables
var players = 8;
var bestOf = 2;
Session.set('champion',false);
Session.set('overlay',false);
Session.set('signUpMsg',{error:false,success:false,text:false});
Session.set('playerList',[]);

// Subscriptions
Meteor.subscribe('Matches');
Meteor.subscribe('Signup', function() {
	// Add signup if empty
	if (Signup.find().fetch().length === 0) {
		Signup.insert({
			title: "Friday Amazing 8P Tourney!",
			date: "April 10th @ 2 PM PST"
		});
	}
});
Meteor.subscribe('Players',function() {
	Session.set('overlay',true);
});

Matchups = new Mongo.Collection(null); // Local

function startTourney(p) {
	//players = p;
	var playerCount = p.length;
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

	// Add first round crew
	var m = Matchups.find({tier: playerCount/2}).fetch();

	for (var j=0; j<m.length; j+=1) {
		Matchups.update({ _id: m[j]._id },{
			$set: { 
				"players.0.name": p.shift(),
				"players.1.name": p.shift()
			}
		});
	}

	// Update parents of 2nd+ round matchups
	// =====================================
	parentUpdate( playerCount/2, playerCount );
}

function parentUpdate(x,pC) {
	var areParents = Matchups.find({tier:x}).fetch();
	var round = Matchups.find({tier: x/2 }).fetch();

	for (var k=0; k<=2; k+=2) {
		//console.log( round[k/2] );

		if ( round[k/2] ) {
			Matchups.update({ _id: round[k/2]._id },{
				$set: { 
					"players.0.parent": areParents[k]._id,
					"players.1.parent": areParents[k+1]._id,
				}
			});
		} 
	}
}

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


// Signup
Template.signup.helpers({
	"isAdmin" : function() {
		if (Session.get('adminMode')) return "admin";
	},
	"canEdit" : function() {
		if (Session.get('adminMode')) return true;
	},
	"msg" : function() {
		if (Session.get('signUpMsg').text) return true;
	},
	"status" : function() {
		if ( Session.get('signUpMsg').error ) {
			return { type: "error", text: Session.get('signUpMsg').text }
		} else if (Session.get('signUpMsg').success) {
			return { type: "yay", text: Session.get('signUpMsg').text }
		}
	},
	"title" : function() {
		if (Signup.find().fetch()[0]) return Signup.find().fetch()[0].title;
	},
	"date" : function() {
		if (Signup.find().fetch()[0]) return Signup.find().fetch()[0].date;
	}
});

Template.signup.events({
	"click button" : function(e) {
		var p = document.getElementById('player').value.toLowerCase();

		if (Players.find({name: p}).fetch().length === 0) {
			Session.set('signUpMsg',{error:false,success:true,text:"Player added!"});

			Players.insert({ name: p, wins: 0, losses: 0 });
			p = "";

			document.querySelector('.modal').classList.add('animated','tada');
			window.setTimeout(function() {
				document.querySelector('.modal').classList.remove('animated','tada');
			},1000);
		} else {
			document.querySelector('.modal').classList.add('animated','shake');
			window.setTimeout(function() {
				document.querySelector('.modal').classList.remove('animated','shake');
			},1000);

			Session.set('signUpMsg',{error:true,success:false,text:"Player already exists!"});
		}
	},
	"keypress [contenteditable=true]" : function(e) {
		//console.log(e);
		s = Signup.find().fetch()[0]._id;

		// Pressed enter, save and blur
		if (e.keyCode == 13) {
			e.preventDefault();

			console.log('Saving...',e);
			e.target.blur();

			if (e.target.getAttribute('id') === "title") {
				Signup.update({ _id: s }, { 
					$set: { title: e.target.textContent } 
				});
			} else {
				Signup.update({ _id: s }, { 
					$set: { date: e.target.textContent } 
				});
			}
		}
	}
});

// Overlay detection
Template.playerEntry.helpers({
	"isActive" : function() {
		if (Session.get('overlay')) return "active";
	},
	"isAdmin" : function() {
		if (Session.get('adminMode')) return "admin";
	},
	"player" : function() {
		return Players.find({},{sort: {name: 1}});
	}
});

Template.playerEntry.events({
	"click .playerOpt" : function(e) {
		// Build list
		e.target.classList.toggle('active');
		var n = e.target.getAttribute('data-name');
		var id = e.target.setAttribute('data-id',Session.get('playerList').length+1);

		if ( !e.target.classList.contains('active') ) {
			console.log('Removing last player');

			e.target.setAttribute('data-id',"");
			var p = Session.get('playerList');
			p.pop();
			Session.set('playerList', p );
		} else {
			//console.log('Setting player '+id);
			var p = Session.get('playerList');
			p.push(n);
			Session.set('playerList', p );
		}
	},
	"click button" : function(e) {
		// Only if 8 players selected
		var pList = document.querySelectorAll('.modal .playerOpt.active');

		if (pList.length>=4 && Math.log2(pList.length) % 1 === 0 && Session.get('adminMode') === true) {
			startTourney( Session.get('playerList') );

			// Turn off overlay
			Session.set('overlay',false);
		} else {
			// Animate shake, time out class remove
			document.querySelector('.modal').classList.add('animated','shake');
			window.setTimeout(function() {
				document.querySelector('.modal').classList.remove('animated','shake');
			},1000);
		}
	}
});

// Generate columns based off number of players
// participating in tournament
Template.bracket.helpers({
	"columns" : function() {
		var columns = [];
		// TODO: Replace with just players playing this time
		var x = Math.log2( Session.get('playerList').length ) + 1;

		for (var i=0; i<x; i+=1) {
			if (i === x-1) {
				columns.push({ 
					matches : 0
				});
			} else if (i===0) {
				columns.push({ 
					matches : Session.get('playerList').length/2
				});
			} else {
				columns.push({ 
					matches : Session.get('playerList').length/(2*(i*2))
				});
			}
		}

		if (Matchups.find().fetch().length === 0) {
			return [];
		} else {
			return columns;
		}
	}
});

Template.column.helpers({
	"isChamp" : function() {
		if (this.matches === 0) {
			return "champion"
		}
	},
	"isEmpty" : function() {
		var m = Matchups.find({ tier: this.matches }).fetch().length;
		if (m===0 && this.matches != 0) return "empty";
	},
	"matchup" : function() {
		var m = Matchups.find({ tier: this.matches });
		if (m.fetch().length===0) {
			return false
		} else {
			return m;
		}
	}
});

Template.match.helpers({
	"id" : function() {
		return this._id;
	},
	"pair" : function() {
		return this.players;
	},
	"winner" : function() {
		return this.winner;
	},
	"isBlank" : function() {
		if (this.players[0].name === "" && this.players[1].name === "") return "blank";
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

Template.champ.events({
	"click button.save" : function(e)  {
		// Iterate through all the matchups and check for winners
		var w = 0;
		var m = Matchups.find().fetch();

		for (var i=0;i<m.length;i+=1) {
			if (m[i].winner != "") w++
		}

		// If we have the right number of winners
		if (w === m.length) {
			// Iterate every matchup and append set of 
			// matches to Matches collection
			for (var j=0;j<m.length;j+=1) {
				var p1 = m[j].players[0];
				var p2 = m[j].players[1];

				// For every win by player 1
				for (var x=0;x<p1.score;x+=1) {
					Matches.insert({
						"winner" : p1.name,
						"loser" : p2.name,
						"date" :  new Date()
					})
				}

				// For every win by player 2
				for (var y=0;y<p2.score;y+=1) {
					Matches.insert({
						"winner" : p2.name,
						"loser" : p1.name,
						"date" :  new Date()
					})
				}
			}
		}

		e.target.setAttribute('disabled','disabled');
		e.target.textContent = "Saved";
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

// ----------------
// Cheet.js
// ----------------
function keydown(e){var id,k=e?e.keyCode:event.keyCode;if(!held[k]){held[k]=!0;for(id in sequences)sequences[id].keydown(k)}}function keyup(e){var k=e?e.keyCode:event.keyCode;held[k]=!1}function resetHeldKeys(){var k;for(k in held)held[k]=!1}function on(obj,type,fn){obj.addEventListener?obj.addEventListener(type,fn,!1):obj.attachEvent&&(obj["e"+type+fn]=fn,obj[type+fn]=function(){obj["e"+type+fn](window.event)},obj.attachEvent("on"+type,obj[type+fn]))}var cheet,Sequence,sequences={},keys={backspace:8,tab:9,enter:13,"return":13,shift:16,"⇧":16,control:17,ctrl:17,"⌃":17,alt:18,option:18,"⌥":18,pause:19,capslock:20,esc:27,space:32,pageup:33,pagedown:34,end:35,home:36,left:37,L:37,"←":37,up:38,U:38,"↑":38,right:39,R:39,"→":39,down:40,D:40,"↓":40,insert:45,"delete":46,0:48,1:49,2:50,3:51,4:52,5:53,6:54,7:55,8:56,9:57,a:65,b:66,c:67,d:68,e:69,f:70,g:71,h:72,i:73,j:74,k:75,l:76,m:77,n:78,o:79,p:80,q:81,r:82,s:83,t:84,u:85,v:86,w:87,x:88,y:89,z:90,"⌘":91,command:91,kp_0:96,kp_1:97,kp_2:98,kp_3:99,kp_4:100,kp_5:101,kp_6:102,kp_7:103,kp_8:104,kp_9:105,kp_multiply:106,kp_plus:107,kp_minus:109,kp_decimal:110,kp_divide:111,f1:112,f2:113,f3:114,f4:115,f5:116,f6:117,f7:118,f8:119,f9:120,f10:121,f11:122,f12:123,equal:187,"=":187,comma:188,",":188,minus:189,"-":189,period:190,".":190},NOOP=function(){},held={};Sequence=function(str,next,fail,done){var i;for(this.str=str,this.next=next?next:NOOP,this.fail=fail?fail:NOOP,this.done=done?done:NOOP,this.seq=str.split(" "),this.keys=[],i=0;i<this.seq.length;++i)this.keys.push(keys[this.seq[i]]);this.idx=0},Sequence.prototype.keydown=function(keyCode){var i=this.idx;return keyCode!==this.keys[i]?void(i>0&&(this.reset(),this.fail(this.str),cheet.__fail(this.str))):(this.next(this.str,this.seq[i],i,this.seq),cheet.__next(this.str,this.seq[i],i,this.seq),void(++this.idx===this.keys.length&&(this.done(this.str),cheet.__done(this.str),this.reset())))},Sequence.prototype.reset=function(){this.idx=0},cheet=function(str,handlers){var next,fail,done;"function"==typeof handlers?done=handlers:null!==handlers&&void 0!==handlers&&(next=handlers.next,fail=handlers.fail,done=handlers.done),sequences[str]=new Sequence(str,next,fail,done)},cheet.disable=function(str){delete sequences[str]},on(window,"keydown",keydown),on(window,"keyup",keyup),on(window,"blur",resetHeldKeys),on(window,"focus",resetHeldKeys),cheet.__next=NOOP,cheet.next=function(fn){cheet.__next=null===fn?NOOP:fn},cheet.__fail=NOOP,cheet.fail=function(fn){cheet.__fail=null===fn?NOOP:fn},cheet.__done=NOOP,cheet.done=function(fn){cheet.__done=null===fn?NOOP:fn},cheet.reset=function(id){var seq=sequences[id];return seq instanceof Sequence?void seq.reset():void console.warn("cheet: Unknown sequence: "+id)},"function"==typeof define&&define.amd?define([],function(){return cheet}):"undefined"!=typeof module&&null!==module&&(module.exports=cheet);

cheet('↑ ↑ ↓ ↓ ← → ← → b a', function () {
	console.log('ACCESS GRANTED');
	Session.setPersistent('adminMode',true);
});
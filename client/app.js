// Initialize Variables
var players = 8;
var bestOf = 2;
var bestOfFinal = 3;
Session.set('champion',false);
Session.set('overlay',false);
Session.set('signUpMsg',{error:false,success:false,text:false});
Session.set('playerList',[]);

// Subscriptions
Meteor.subscribe('Matches');
Meteor.subscribe('Matchups');

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
	// If tournament hasn't started
	if ( Matchups.find().fetch().length === 0 && Players.find({ "playing" : { $gt: 0 } }).fetch().length <= 3) {
		Session.set('overlay',true);
		// TODO: Sync match scores live
	} else {
		console.log("Tournament in progress...");

		var p = Players.find({ "playing" : { $gt: 0 } }).fetch();
		var pp =[]

		for (var i=0;i<p.length;i+=1) {
			pp.push(p[i].name);
		}

		console.log(pp);
		Session.set('playerList',pp);
		startTourney( pp, true );
	}

	// }
});

function startTourney(p,notfresh) {
	console.log('Starting tournament...')
	//players = p;
	var playerCount = p.length;
	var t = playerCount/2;
	var c = 1;
	var parent = false;

	if (notfresh) {
		bestOf = Matchups.find().fetch()[0].bestof;
		bestOfFinal = Matchups.find({tier:1}).fetch()[0].bestof;
		return false;
	}

	bestOf = parseInt(document.getElementById('bor').value);
	bestOf = (bestOf === 1) ? 1 : bestOf-1;
	bestOfFinal = parseInt(document.getElementById('bof').value);
	bestOfFinal = (bestOfFinal === 1) ? 1 : bestOfFinal-1;

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

function parentUpdate(x, pC) {
	console.log("Updating parents in tier: "+x);
	var areParents = Matchups.find({tier:x}).fetch();
	var currentRound = Matchups.find({tier: x/2 }).fetch();

	if (areParents.length === 0) return false;

	var m = 0;
	var n = 1;
	currentRound.forEach(function() {
		console.log( "Tier: "+x/2 );
		console.log(areParents.length, m, n, Math.log2(x)*2);
		//console.log(x,m,pC);

		if ( currentRound[m/2] ) {
			Matchups.update({ _id: currentRound[m/2]._id },{
				$set: { 
					"players.0.parent": areParents[m]._id,
					"players.1.parent": areParents[m+1]._id,
				}
			});
		} 

		if (n === x/2 && areParents.length > 0) {
			m = 0;
			n = 1;
			parentUpdate(x/2,pC);
			return true;
		} else {
			m += 2;
			n++;
		}
	});
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

// Nearest Power
function nearestPow2( aSize ){ 
	return Math.pow(2, Math.ceil(Math.log( aSize )/Math.log(2))); 
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
	},
	"prevplayers" : function() {
		return Players.find().fetch().map(function(it){ return it.name; });
	}
});

Template.signup.events({
	"click button" : function(e) {
		var p = document.getElementById('player').value.toLowerCase();

		if (Players.find({name: p}).fetch().length === 0) {
			Session.set('signUpMsg',{error:false,success:true,text:"Player added!"});

			Players.insert({ name: p, playable: true });
			p = "";

			document.querySelector('.modal').classList.add('animated','tada');
			window.setTimeout(function() {
				document.querySelector('.modal').classList.remove('animated','tada');
			},1000);

			document.getElementById('player').setAttribute('disabled','disabled');
		} else {
			var pid = Players.find({ name: p }).fetch()[0]._id;
			Players.update({ _id: pid }, { 
				$set: { playable: true } 
			});

			document.querySelector('.modal').classList.add('animated','tada');
			window.setTimeout(function() {
				document.querySelector('.modal').classList.remove('animated','tada');
			},1000);

			Session.set('signUpMsg',{error:false,success:true,text:"Returning player marked as playable!"});

			document.getElementById('player').setAttribute('disabled','disabled');
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

Template.signup.rendered = function() {
	Meteor.typeahead.inject();
};

// Overlay detection
Template.playerEntry.helpers({
	"isActive" : function() {
		if (Session.get('overlay')) return "active";
	},
	"isAdmin" : function() {
		if (Session.get('adminMode')) return "admin";
	},
	"player" : function() {
		//if () {
			return Players.find({ playable: true },{sort: {name: 1}}); //playable: true
		// } else {

		// }
	}
});

Template.playerEntry.events({
	"click .playerOpt" : function(e) {
		// Build list
		//console.log(e.target);
		e.target.classList.toggle('active');
		var n = e.target.getAttribute('data-name');
		var id = e.target.setAttribute('data-id',Session.get('playerList').length+1);

		if ( !e.target.classList.contains('active') ) {
			console.log('Removing last player');

			e.target.setAttribute('data-id',"");
			var p = Session.get('playerList');
			p.pop();
			Session.set('playerList', p );

			var pid = Players.find({ name: n }).fetch()[0]._id;
			Players.update({ _id: pid }, { 
				$set: { playing: false } 
			});
		} else {
			//console.log('Setting player '+id);
			var p = Session.get('playerList');
			p.push(n);
			Session.set('playerList', p );

			var pid = Players.find({ name: n }).fetch()[0]._id;
			Players.update({ _id: pid }, { 
				$set: { playing: Session.get('playerList').length } 
			});
		}
	},
	"click .start" : function(e) {
		// Only if 4+ players selected
		var pActive = document.querySelectorAll('.modal .playerOpt.active').length;
		var pList = (pActive>1) ? document.querySelectorAll('.modal .playerOpt.active') : document.querySelectorAll('.modal .playerOpt');
		var bo = false;

		if (parseInt(document.getElementById('bor').value) > 0 && parseInt(document.getElementById('bof').value) > 0) bo = true;

		if (document.querySelectorAll('.playerOpt').length>=3 && Session.get('adminMode') === true && bo) {
			//Players.insert({ name: "MATCHSTART" });

			// Add ALL current players if none selected
			if (pActive===0) {
				[].forEach.call(pList, function(el) {
					var n = el.getAttribute('data-name');
					var p = Session.get('playerList');
					p.push(n);
					Session.set('playerList', p );

					var pid = Players.find({ name: n }).fetch()[0]._id;
					Players.update({ _id: pid }, { 
						$set: { playing: Session.get('playerList').length } 
					});
				});
			}

			// Add missing byes
			var b = nearestPow2(pList.length) - pList.length;

			for (var i=0;i<b;i+=1) {
				Players.insert({ name: "bye", wins: 0, losses: 0, playing: 1 });

				var p = Session.get('playerList');
				p.push("bye");
				Session.set('playerList', p );
			}

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
	},
	"click .remove" : function(e) {
		e.stopPropagation();

		var n = e.target.parentNode.getAttribute('data-name');
		var p = Players.find({name: n}).fetch()[0]._id;

		Players.update({ _id: p }, { 
			$set: { playable: false } 
		});
	}
});

// Generate columns based off number of players
// participating in tournament
Template.bracket.helpers({
	"columns" : function() {
		var columns = [];

		var x = Math.log2( Session.get('playerList').length ) + 1;

		for (var i=0; i<x; i+=1) {
			// If this is the last column
			if (i === x-1) {
				columns.push({ 
					matches : 0
				});
			} 
			// If this is the first column
			else if (i===0) {
				columns.push({ 
					matches : Session.get('playerList').length/2
				});
			} else {
				columns.push({ 
					matches : Session.get('playerList').length/Math.pow(2,i+1)
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
	"matchCount" : function() {
		return this.matches;
	},
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
						"date" :  new Date(),
						"bo" : m[j].bestof,
						"tier" : m[j].tier
					})
				}

				// For every win by player 2
				for (var y=0;y<p2.score;y+=1) {
					Matches.insert({
						"winner" : p2.name,
						"loser" : p1.name,
						"date" :  new Date(),
						"bo" : m[j].bestof,
						"tier" : m[j].tier
					})
				}
			}

			// Button Disabling
			e.target.setAttribute('disabled','disabled');
			e.target.textContent = "Saved";

			// Clear out player junk
			var byes = Players.find({ name: "bye" }).fetch().length;

			for (var b=0;b<byes;b+=0) {
				Players.remove( Players.find({ name: "bye" }).fetch()[0]._id );
			}

			var starts = Players.find({ name: "MATCHSTART" }).fetch().length;

			for (var m=0;m<starts;m+=0) {
				Players.remove( Players.find({ name: "MATCHSTART" }).fetch()[0]._id );
			}
		}
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
		var mC = Template.parentData(2).matches;
		if (this.score>=bestOf && mC != 1 || this.score>=bestOfFinal && mC === 1) {
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
	},
	"isChosen" : function() {
		if (Session.get('playerHover') === this.name) return "hover";
	}
})

Template.player.events({
	"click .swap" : function(e) {
		e.target.classList.toggle('active');

		// Check if 2 active swaps exists
		if (document.querySelectorAll('.swap.active').length===2) {
			// If so, swap those players
			console.log('Swapping...');

			var swaps = document.querySelectorAll('.swap.active');
			// Player name
			var n1 = swaps[0].parentNode.parentNode.getAttribute('data-id');
			var n2 = swaps[1].parentNode.parentNode.getAttribute('data-id');
			// Player column
			var c1 = swaps[0].parentNode.parentNode.parentNode.getAttribute('id');
			var c2 = swaps[1].parentNode.parentNode.parentNode.getAttribute('id');
			// Player index
			var i1 = (Matchups.find({"_id" : c1, "players.name":n1}).fetch()[0].players[0].name === n1) ?  0 : 1;
			var i2 = (Matchups.find({"_id" : c2, "players.name":n2}).fetch()[0].players[0].name === n2) ?  0 : 1;

			// Get ids for matchup update
			var p1 = {
				"id" : Matchups.find({"_id" : c1,"players.name":n1}).fetch()[0]._id,
				"index" : i1
			};

			var p2 = {
				"id" : Matchups.find({"_id" : c2,"players.name":n2}).fetch()[0]._id,
				"index" : i2
			};

			console.log(p1,p2);

			// Change player 1
			Matchups.update({ _id: p1.id, "players.name": n1 },{
				$set: { "players.$.name": n2 }
			});

			// Change player 2
			Matchups.update({ _id: p2.id, "players.name": n2 },{
				$set: { "players.$.name": n1 }
			});

			document.querySelector(".swap.active").classList.remove('active');
			document.querySelector(".swap.active").classList.remove('active');
		}
	},
	"click .add" : function(e) {
		var mC = parseInt(e.target.parentNode.parentNode.parentNode.parentNode.getAttribute('data-mcount'));
		if (this.score>=bestOfFinal && mC === 1 || this.score>=bestOf && mC != 1) return false;

		var parent = (!this.id) ? Template.parentData(1)._id : this.id;
		console.log(this.score,bestOf);

		// var m = parseInt(document.getElementById(parent).getAttribute('data-total'));
		// document.getElementById(parent).setAttribute('data-total',m++);
		// if (m>=this.score) return false;

		Meteor.call('addScore',parent,this.name);
	},
	"click .sub" : function(e) {
		if (this.score<=0) return false;

		var parent = (!this.id) ? Template.parentData(1)._id : this.id;

		// var m = parseInt(document.getElementById(parent).getAttribute('data-total'));
		// if (m>0) document.getElementById(parent).setAttribute('data-total',m--);

		Meteor.call('subScore',parent,this.name);

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
		// Mark winner/loser
		Meteor.call('setWinner',parent,this.name);
		
		// Set winner as player of next round
		var pCheck = Matchups.find({ "players.parent" : parent  }).fetch();

		if (!pCheck[0]) {
			// Champion
			Session.set('champion',this.name);
			makeFireworks();
		} else {
			// Not Champion yet
			if (pCheck[0].players[0].parent === parent) {
				Meteor.call('setParent',parent,this.name,0);
			} else if (pCheck[0].players[1].parent === parent) {
				Meteor.call('setParent',parent,this.name,1);
			}
		}
	},
	"mouseenter .player" : function(e) {
		var n = e.target.getAttribute('data-id');
		Session.set('playerHover',n);
	},
	"mouseleave .player" : function(e) {
		Session.set('playerHover',false);
	}
});

Template.winnerJuice.helpers({
	"isActive" : function() {
		if (Session.get('champion')) return "active";
	}
});

Template.winnerJuice.events({
	"click .fw" : function() {
		document.querySelector('.winner.overlay').classList.remove('active');
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

/*!
 * Proton v1.0.0
 * https://github.com/a-jie/Proton
 *
 * Copyright 2011-2013, A-JIE
 * Licensed under the MIT license
 * http://www.opensource.org/licenses/mit-license
 *
 */
(function(a,b){function bf(a,b,c,d){bf._super_.call(this),this.reset(a,b,c,d)}function be(a,b,c,d){be._super_.call(this),this.x=a,this.y=b,this.width=c,this.height=d}function bd(a,b){bd._super_.call(this),this.x=a,this.y=b}function bc(a,b,c){bc._super_.call(this),this.x=a,this.y=b,this.radius=c,this.angle=0,this.center={x:this.x,y:this.y}}function bb(a,b,d,e,f){bb._super_.call(this),d-a>=0?(this.x1=a,this.y1=b,this.x2=d,this.y2=e):(this.x1=d,this.y1=e,this.x2=a,this.y2=b),this.dx=this.x2-this.x1,this.dy=this.y2-this.y1,this.minx=Math.min(this.x1,this.x2),this.miny=Math.min(this.y1,this.y2),this.maxx=Math.max(this.x1,this.x2),this.maxy=Math.max(this.y1,this.y2),this.dot=this.x2*this.y1-this.x1*this.y2,this.xxyy=this.dx*this.dx+this.dy*this.dy,this.gradient=this.getGradient(),this.length=this.getLength(),this.direction=c.Util.initValue(f,">")}function ba(){this.vector=new c.Vector2D(0,0),this.random=0,this.crossType="dead",this.alert=!0}function _(a,b){_._super_.call(this,a,b),this.gl=this.element.getContext("experimental-webgl",{antialias:!0,stencil:!1,depth:!1}),this.gl||alert("Sorry your browser do not suppest WebGL!"),this.initVar(),this.setMaxRadius(),this.initShaders(),this.initBuffers(),this.gl.blendEquation(this.gl.FUNC_ADD),this.gl.blendFunc(this.gl.SRC_ALPHA,this.gl.ONE_MINUS_SRC_ALPHA),this.gl.enable(this.gl.BLEND)}function $(a,b,c){$._super_.call(this,a,b),this.context=this.element.getContext("2d"),this.imageData=null,this.rectangle=null,this.rectangle=c,this.createImageData(c)}function Z(a,b){Z._super_.call(this,a,b),this.stroke=null,this.context=this.element.getContext("2d"),this.bufferCache={}}function Y(a,b,c){Y._super_.call(this,a,b),this.stroke=c}function X(a,b){X._super_.call(this,a,b),this.stroke=null}function W(a,b,c){this.proton=a,this.element=b,this.stroke=c}function V(a,b,d){this.element=d,this.type=c.Util.initValue(a,"canvas"),this.proton=b,this.renderer=this.getRenderer()}function T(b,d,e){this.mouseTarget=c.Util.initValue(b,a),this.ease=c.Util.initValue(d,.7),this._allowEmitting=!1,this.initEventHandler(),T._super_.call(this,e)}function S(a){this.selfBehaviours=[],S._super_.call(this,a)}function R(a){this.initializes=[],this.particles=[],this.behaviours=[],this.emitTime=0,this.emitTotalTimes=-1,this.damping=.006,this.bindEmitter=!0,this.rate=new c.Rate(1,.1),R._super_.call(this,a),this.id="emitter_"+R.ID++}function Q(a,b,d,e){Q._super_.call(this,d,e),this.distanceVec=new c.Vector2D,this.centerPoint=c.Util.initValue(a,new c.Vector2D),this.force=c.Util.initValue(this.normalizeValue(b),100),this.name="GravityWell"}function P(a,b,c,d){P._super_.call(this,c,d),this.reset(a,b),this.name="Color"}function O(a,b,c,d,e){O._super_.call(this,d,e),this.reset(a,b,c),this.name="Rotate"}function N(a,b,c,d){N._super_.call(this,c,d),this.reset(a,b),this.name="Scale"}function M(a,b,c,d){M._super_.call(this,c,d),this.reset(a,b),this.name="Alpha"}function L(a,b,c,d){L._super_.call(this,c,d),this.reset(a,b),this.name="CrossZone"}function K(a,b,c,d,e){K._super_.call(this,d,e),this.reset(a,b,c),this.name="Collision"}function J(a,b,c){J._super_.call(this,0,a,b,c),this.name="Gravity"}function I(a,b,c,d,e){I._super_.call(this,a,b,c,d,e),this.force*=-1,this.name="Repulsion"}function H(a,b,c,d,e){H._super_.call(this,d,e),this.reset(a,b,c),this.time=0,this.name="RandomDrift"}function G(a,b,d,e,f){G._super_.call(this,e,f),this.targetPosition=c.Util.initValue(a,new c.Vector2D),this.radius=c.Util.initValue(d,1e3),this.force=c.Util.initValue(this.normalizeValue(b),100),this.radiusSq=this.radius*this.radius,this.attractionForce=new c.Vector2D,this.lengthSq=0,this.name="Attraction"}function F(a,b,d,e){F._super_.call(this,d,e),this.force=this.normalizeForce(new c.Vector2D(a,b)),this.name="Force"}function E(a,b,d){E._super_.call(this),this.image=this.setSpanValue(a),this.w=c.Util.initValue(b,20),this.h=c.Util.initValue(d,this.w)}function D(a,b,d){D._super_.call(this),this.radius=c.Util.setSpanValue(a,b,d)}function C(a,b,d){C._super_.call(this),this.massPan=c.Util.setSpanValue(a,b,d)}function B(a,b,d){B._super_.call(this),this.rPan=c.Util.setSpanValue(a),this.thaPan=c.Util.setSpanValue(b),this.type=c.Util.initValue(d,"vector")}function A(a){A._super_.call(this),this.zone=c.Util.initValue(a,new c.PointZone)}function z(a,b,d){z._super_.call(this),this.lifePan=c.Util.setSpanValue(a,b,d)}function x(){}function w(a,b){this.numPan=c.Util.initValue(a,1),this.timePan=c.Util.initValue(b,1),this.numPan=c.Util.setSpanValue(this.numPan),this.timePan=c.Util.setSpanValue(this.timePan),this.startTime=0,this.nextTime=0,this.init()}function v(a,b){this.id="Behaviour_"+v.id++,this.life=c.Util.initValue(a,Infinity),this.easing=c.ease.setEasingByName(b),this.age=0,this.energy=1,this.dead=!1,this.parents=[],this.name="Behaviour"}function t(a,b,c,d){this.x=a,this.y=b,this.width=c,this.height=d,this.bottom=this.y+this.height,this.right=this.x+this.width}function s(a){c.Util.isArray(a)?this.colorArr=a:this.colorArr=[a]}function r(a,b,d){this.isArray=!1,c.Util.isArray(a)?(this.isArray=!0,this.a=a):(this.a=c.Util.initValue(a,1),this.b=c.Util.initValue(b,this.a),this.center=c.Util.initValue(d,!1))}function l(a,b){this.proParticleCount=c.Util.initValue(a,0),this.releaseTime=c.Util.initValue(b,-1),this.poolList=[],this.timeoutID=0;for(var d=0;d<this.proParticleCount;d++)this.add();this.releaseTime>0&&(this.timeoutID=setTimeout(this.release,this.releaseTime/1e3))}function k(a){this.id="particle_"+k.ID++,this.reset(!0),c.Util.setPrototypeByObject(this,a)}function j(){this.mats=[],this.size=0;for(var a=0;a<20;a++)this.mats.push(c.Mat3.create([0,0,0,0,0,0,0,0,0]))}function f(a){this.type=a.type,this.particle=a.particle,this.emitter=a.emitter}function d(){this.initialize()}function c(a,b){this.proParticleCount=c.Util.initValue(a,c.POOL_MAX),this.integrationType=c.Util.initValue(b,c.EULER),this.emitters=[],this.renderers=[],this.time=0,this.oldTime=0,c.pool=new c.ParticlePool(this.proParticleCount),c.integrator=new c.NumericalIntegration(this.integrationType)}c.POOL_MAX=1e3,c.TIME_STEP=60,c.MEASURE=100,c.EULER="euler",c.RK2="runge-kutta2",c.RK4="runge-kutta4",c.VERLET="verlet",c.PARTICLE_CREATED="partilcleCreated",c.PARTICLE_UPDATE="partilcleUpdate",c.PARTICLE_SLEEP="particleSleep",c.PARTICLE_DEAD="partilcleDead",c.PROTON_UPDATE="protonUpdate",c.PROTON_UPDATE_AFTER="protonUpdateAfter",c.EMITTER_ADDED="emitterAdded",c.EMITTER_REMOVED="emitterRemoved",c.amendChangeTabsBug=!0,c.TextureBuffer={},c.TextureCanvasBuffer={},c.prototype={addRender:function(a){a.proton=this,this.renderers.push(a.proton)},addEmitter:function(a){this.emitters.push(a),a.parent=this,this.dispatchEvent(new c.Event({type:c.EMITTER_ADDED,emitter:a}))},removeEmitter:function(a){var b=this.emitters.indexOf(a);this.emitters.splice(b,1),a.parent=null,this.dispatchEvent(new c.Event({type:c.EMITTER_REMOVED,emitter:a}))},update:function(){this.dispatchEvent(new c.Event({type:c.PROTON_UPDATE})),this.oldTime||(this.oldTime=(new Date).getTime());var a=(new Date).getTime();this.elapsed=(a-this.oldTime)/1e3,c.amendChangeTabsBug&&this.amendChangeTabsBug(),this.oldTime=a;if(this.elapsed>0)for(var b=0;b<this.emitters.length;b++)this.emitters[b].update(this.elapsed);this.dispatchEvent(new c.Event({type:c.PROTON_UPDATE_AFTER}))},amendChangeTabsBug:function(){this.elapsed>.5&&(this.oldTime=(new Date).getTime(),this.elapsed=0)},getCount:function(){var a=0,b=this.emitters.length;for(var c=0;c<b;c++)a+=this.emitters[c].particles.length;return a},destory:function(){var a=this.emitters.length;for(var b=0;b<a;b++)this.emitters[b].destory(),delete this.emitters[b];this.emitters=[],this.time=0,this.oldTime=0,c.pool.release()}},a.Proton=c;var e=d.prototype;d.initialize=function(a){a.addEventListener=e.addEventListener,a.removeEventListener=e.removeEventListener,a.removeAllEventListeners=e.removeAllEventListeners,a.hasEventListener=e.hasEventListener,a.dispatchEvent=e.dispatchEvent},e._listeners=null,e.initialize=function(){},e.addEventListener=function(a,b){var c=this._listeners;c?this.removeEventListener(a,b):c=this._listeners={};var d=c[a];d||(d=c[a]=[]),d.push(b);return b},e.removeEventListener=function(a,b){var c=this._listeners;if(!!c){var d=c[a];if(!d)return;for(var e=0,f=d.length;e<f;e++)if(d[e]==b){f==1?delete c[a]:d.splice(e,1);break}}},e.removeAllEventListeners=function(a){a?this._listeners&&delete this._listeners[a]:this._listeners=null},e.dispatchEvent=function(a){var b=!1,c=this._listeners;if(a&&c){var d=c[a.type];if(!d)return b;d=d.slice();for(var e=0,f=d.length;e<f;e++){var g=d[e];b=b||g(a)}}return!!b},e.hasEventListener=function(a){var b=this._listeners;return!!b&&!!b[a]},c.EventDispatcher=d,c.EventDispatcher.initialize(c.prototype),c.Event=f;var g=g||{initValue:function(a,c){var a=a!=null&&a!=b?a:c;return a},isArray:function(a){return typeof a=="object"&&a.hasOwnProperty("length")},destroyArray:function(a){a.length=0},destroyObject:function(a){for(var b in a)delete a[b]},getVector2D:function(a,b){if(typeof a=="object")return a;var d=new c.Vector2D(a,b);return d},judgeVector2D:function(a){var b="";if(a.hasOwnProperty("x")||a.hasOwnProperty("y")||a.hasOwnProperty("p")||a.hasOwnProperty("position"))b+="p";if(a.hasOwnProperty("vx")||a.hasOwnProperty("vx")||a.hasOwnProperty("v")||a.hasOwnProperty("velocity"))b+="v";if(a.hasOwnProperty("ax")||a.hasOwnProperty("ax")||a.hasOwnProperty("a")||a.hasOwnProperty("accelerate"))b+="a";return b},setVector2DByObject:function(a,b){b.hasOwnProperty("x")&&(a.p.x=b.x),b.hasOwnProperty("y")&&(a.p.y=b.y),b.hasOwnProperty("vx")&&(a.v.x=b.vx),b.hasOwnProperty("vy")&&(a.v.y=b.vy),b.hasOwnProperty("ax")&&(a.a.x=b.ax),b.hasOwnProperty("ay")&&(a.a.y=b.ay),b.hasOwnProperty("p")&&particle.p.copy(b.p),b.hasOwnProperty("v")&&particle.v.copy(b.v),b.hasOwnProperty("a")&&particle.a.copy(b.a),b.hasOwnProperty("position")&&particle.p.copy(b.position),b.hasOwnProperty("velocity")&&particle.v.copy(b.velocity),b.hasOwnProperty("accelerate")&&particle.a.copy(b.accelerate)},addPrototypeByObject:function(a,b,d){for(var e in b)d?d.indexOf(e)<0&&(a[e]=c.Util.getSpanValue(b[e])):a[e]=c.Util.getSpanValue(b[e]);return a},setPrototypeByObject:function(a,b,d){for(var e in b)a.hasOwnProperty(e)&&(d?d.indexOf(e)<0&&(a[e]=c.Util.getSpanValue(b[e])):a[e]=c.Util.getSpanValue(b[e]));return a},setSpanValue:function(a,b,d){return a instanceof c.Span?a:b?d?new c.Span(a,b,d):new c.Span(a,b):new c.Span(a)},getSpanValue:function(a){return a instanceof c.Span?a.getValue():a},inherits:function(a,b){a._super_=b;if(Object.create)a.prototype=Object.create(b.prototype,{constructor:{value:b}});else{var c=function(){};c.prototype=b.prototype,a.prototype=new c,a.prototype.constructor=a}},getImageData:function(a,b,c){a.drawImage(b,c.x,c.y);var d=a.getImageData(c.x,c.y,c.width,c.height);a.clearRect(c.x,c.y,c.width,c.height);return d},getImage:function(a,b,c,d){typeof a=="string"?this.loadAndSetImage(a,b,c,d):typeof a=="object"?this.loadAndSetImage(a.src,b,c,d):a instanceof Image&&this.loadedImage(a.src,b,c,d,a)},loadedImage:function(a,b,d,e,f){b.target=f,b.transform.src=a,c.TextureBuffer[a]||(c.TextureBuffer[a]=b.target);if(d)if(c.TextureCanvasBuffer[a])b.transform.canvas=c.TextureCanvasBuffer[a];else{var g=c.WebGLUtil.nhpot(b.target.width),h=c.WebGLUtil.nhpot(b.target.height);b.transform.canvas=c.DomUtil.createCanvas("canvas"+a,g,h);var i=b.transform.canvas.getContext("2d");i.drawImage(b.target,0,0,b.target.width,b.target.height),c.TextureCanvasBuffer[a]=b.transform.canvas}e&&e(b)},loadAndSetImage:function(a,b,d,e){if(c.TextureBuffer[a])this.loadedImage(a,b,d,e,c.TextureBuffer[a]);else{var f=this,g=new Image;g.onload=function(c){f.loadedImage(a,b,d,e,c.target)},g.src=a}},hexToRGB:function(a){var b=a.charAt(0)=="#"?a.substring(1,7):a,c=parseInt(b.substring(0,2),16),d=parseInt(b.substring(2,4),16),e=parseInt(b.substring(4,6),16);return{r:c,g:d,b:e}},rgbToHex:function(a){return"rgb("+a.r+", "+a.g+", "+a.b+")"}};c.Util=g;var h=h||{ipot:function(a){return(a&a-1)==0},nhpot:function(a){--a;for(var b=1;b<32;b<<=1)a=a|a>>b;return a+1},makeTranslation:function(a,b){return[1,0,0,0,1,0,a,b,1]},makeRotation:function(a){var b=Math.cos(a),c=Math.sin(a);return[b,-c,0,c,b,0,0,0,1]},makeScale:function(a,b){return[a,0,0,0,b,0,0,0,1]},matrixMultiply:function(a,b){var c=a[0],d=a[1],e=a[2],f=a[3],g=a[4],h=a[5],i=a[6],j=a[7],k=a[8],l=b[0],m=b[1],n=b[2],o=b[3],p=b[4],q=b[5],r=b[6],s=b[7],t=b[8];return[c*l+d*o+e*r,c*m+d*p+e*s,c*n+d*q+e*t,f*l+g*o+h*r,f*m+g*p+h*s,f*n+g*q+h*t,i*l+j*o+k*r,i*m+j*p+k*s,i*n+j*q+k*t]}};c.WebGLUtil=h;var i=i||{createCanvas:function(a,b,c,d){var e=document.createElement("canvas"),f=d?d:"absolute";e.id=a,e.width=b,e.height=c,e.style.position=f,e.style.opacity=0,this.transformDom(e,-500,-500,0,0);return e},transformDom:function(a,b,c,d,e){a.style.WebkitTransform="translate("+b+"px, "+c+"px) "+"scale("+d+") "+"rotate("+e+"deg)",a.style.MozTransform="translate("+b+"px, "+c+"px) "+"scale("+d+") "+"rotate("+e+"deg)",a.style.OTransform="translate("+b+"px, "+c+"px) "+"scale("+d+") "+"rotate("+e+"deg)",a.style.msTransform="translate("+b+"px, "+c+"px) "+"scale("+d+") "+"rotate("+e+"deg)",a.style.transform="translate("+b+"px, "+c+"px) "+"scale("+d+") "+"rotate("+e+"deg)"}};c.DomUtil=i,j.prototype.set=function(a,b){b==0?c.Mat3.set(a,this.mats[0]):c.Mat3.multiply(this.mats[b-1],a,this.mats[b]),this.size=Math.max(this.size,b+1)},j.prototype.push=function(a){this.size==0?c.Mat3.set(a,this.mats[0]):c.Mat3.multiply(this.mats[this.size-1],a,this.mats[this.size]),this.size++},j.prototype.pop=function(){this.size>0&&this.size--},j.prototype.top=function(){return this.mats[this.size-1]},c.MStack=j,k.ID=0,k.prototype={getDirection:function(){return Math.atan2(this.v.x,-this.v.y)*(180/Math.PI)},reset:function(a){this.life=Infinity,this.age=0,this.energy=1,this.dead=!1,this.sleep=!1,this.target=null,this.sprite=null,this.parent=null,this.mass=1,this.radius=10,this.alpha=1,this.scale=1,this.rotation=0,this.color=null,this.easing=c.ease.setEasingByName(c.easeLinear),a?(this.transform={},this.p=new c.Vector2D,this.v=new c.Vector2D,this.a=new c.Vector2D,this.old={p:new c.Vector2D,v:new c.Vector2D,a:new c.Vector2D},this.behaviours=[]):(c.Util.destroyObject(this.transform),this.p.set(0,0),this.v.set(0,0),this.a.set(0,0),this.old.p.set(0,0),this.old.v.set(0,0),this.old.a.set(0,0),this.removeAllBehaviours()),this.transform.rgb={r:255,g:255,b:255};return this},update:function(a,b){if(!this.sleep){this.age+=a;var c=this.behaviours.length,d;for(d=0;d<c;d++)this.behaviours[d]&&this.behaviours[d].applyBehaviour(this,a,b)}if(this.age>=this.life)this.destory();else{var e=this.easing(this.age/this.life);this.energy=Math.max(1-e,0)}},addBehaviour:function(a){this.behaviours.push(a),a.hasOwnProperty("parents")&&a.parents.push(this),a.initialize(this)},addBehaviours:function(a){var b=a.length,c;for(c=0;c<b;c++)this.addBehaviour(a[c])},removeBehaviour:function(a){var b=this.behaviours.indexOf(a);if(b>-1){var a=this.behaviours.splice(b,1);a.parents=null}},removeAllBehaviours:function(){c.Util.destroyArray(this.behaviours)},destory:function(){this.removeAllBehaviours(),this.energy=0,this.dead=!0,this.parent=null}},c.Particle=k,l.prototype={create:function(a){return a?new newTypeParticle:new c.Particle},getCount:function(){return this.poolList.length},add:function(){return this.poolList.push(this.create())},get:function(){return this.poolList.length===0?this.create():this.poolList.pop().reset()},set:function(a){if(this.poolList.length<c.POOL_MAX)return this.poolList.push(a)},release:function(){for(var a=0;a<this.poolList.length;a++)this.poolList[a].destory&&this.poolList[a].destory(),delete this.poolList[a];this.poolList=[]}},c.ParticlePool=l;var m={randomAToB:function(a,b,c){return c?Math.floor(Math.random()*(b-a))+a:a+Math.random()*(b-a)},randomFloating:function(a,b,c){return m.randomAToB(a-b,a+b,c)},randomZone:function(a){},degreeTransform:function(a){return a*Math.PI/180},toColor16:function(a){return"#"+a.toString(16)},randomColor:function(){return"#"+("00000"+(Math.random()*16777216<<0).toString(16)).slice(-6)}};c.MathUtils=m;var o=function(a){this.type=c.Util.initValue(a,c.EULER)};o.prototype={integrate:function(a,b,c){this.eulerIntegrate(a,b,c)},eulerIntegrate:function(a,b,c){a.sleep||(a.old.p.copy(a.p),a.old.v.copy(a.v),a.a.multiplyScalar(1/a.mass),a.v.add(a.a.multiplyScalar(b)),a.p.add(a.old.v.multiplyScalar(b)),c&&a.v.multiplyScalar(c),a.a.clear())}},c.NumericalIntegration=o;var p=function(a,b){this.x=a||0,this.y=b||0};p.prototype={set:function(a,b){this.x=a,this.y=b;return this},setX:function(a){this.x=a;return this},setY:function(a){this.y=a;return this},setComponent:function(a,b){switch(a){case 0:this.x=b;break;case 1:this.y=b;break;default:throw new Error("index is out of range: "+a)}},getGradient:function(){if(this.x!=0)return Math.atan2(this.y,this.x);if(this.y>0)return Math.PI/2;if(this.y<0)return-Math.PI/2},getComponent:function(a){switch(a){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+a)}},copy:function(a){this.x=a.x,this.y=a.y;return this},add:function(a,c){if(c!==b)return this.addVectors(a,c);this.x+=a.x,this.y+=a.y;return this},addXY:function(a,b){this.x+=a,this.y+=b;return this},addVectors:function(a,b){this.x=a.x+b.x,this.y=a.y+b.y;return this},addScalar:function(a){this.x+=a,this.y+=a;return this},sub:function(a,c){if(c!==b)return this.subVectors(a,c);this.x-=a.x,this.y-=a.y;return this},subVectors:function(a,b){this.x=a.x-b.x,this.y=a.y-b.y;return this},multiplyScalar:function(a){this.x*=a,this.y*=a;return this},divideScalar:function(a){a!==0?(this.x/=a,this.y/=a):this.set(0,0);return this},min:function(a){this.x>a.x&&(this.x=a.x),this.y>a.y&&(this.y=a.y);return this},max:function(a){this.x<a.x&&(this.x=a.x),this.y<a.y&&(this.y=a.y);return this},clamp:function(a,b){this.x<a.x?this.x=a.x:this.x>b.x&&(this.x=b.x),this.y<a.y?this.y=a.y:this.y>b.y&&(this.y=b.y);return this},negate:function(){return this.multiplyScalar(-1)},dot:function(a){return this.x*a.x+this.y*a.y},lengthSq:function(){return this.x*this.x+this.y*this.y},length:function(){return Math.sqrt(this.x*this.x+this.y*this.y)},normalize:function(){return this.divideScalar(this.length())},distanceTo:function(a){return Math.sqrt(this.distanceToSquared(a))},rotate:function(a){var b=this.x,c=this.y;this.x=b*Math.cos(a)+c*Math.sin(a),this.y=-b*Math.sin(a)+c*Math.cos(a);return this},distanceToSquared:function(a){var b=this.x-a.x,c=this.y-a.y;return b*b+c*c},setLength:function(a){var b=this.length();b!==0&&a!==b&&this.multiplyScalar(a/b);return this},lerp:function(a,b){this.x+=(a.x-this.x)*b,this.y+=(a.y-this.y)*b;return this},equals:function(a){return a.x===this.x&&a.y===this.y},toArray:function(){return[this.x,this.y]},clear:function(){this.x=0,this.y=0;return this},clone:function(){return new c.Vector2D(this.x,this.y)}},c.Vector2D=p;var q=function(a,b){this.r=Math.abs(a)||0,this.tha=b||0};q.prototype={set:function(a,b){this.r=a,this.tha=b;return this},setR:function(a){this.r=a;return this},setTha:function(a){this.tha=a;return this},copy:function(a){this.r=a.r,this.tha=a.tha;return this},toVector:function(){return new c.Vector2D(this.getX(),this.getY())},getX:function(){return this.r*Math.sin(this.tha)},getY:function(){return-this.r*Math.cos(this.tha)},normalize:function(){this.r=1;return this},equals:function(a){return a.r===this.r&&a.tha===this.tha},toArray:function(){return[this.r,this.tha]},clear:function(){this.r=0,this.tha=0;return this},clone:function(){return new c.Polar2D(this.r,this.tha)}},c.Polar2D=q,r.prototype={getValue:function(a){return this.isArray?this.a[Math.floor(this.a.length*Math.random())]:this.center?c.MathUtils.randomFloating(this.a,this.b,a):c.MathUtils.randomAToB(this.a,this.b,a)}},c.Span=r,c.getSpan=function(a,b,d){return new c.Span(a,b,d)},c.Util.inherits(s,c.Span),s.prototype.getValue=function(){var a=this.colorArr[Math.floor(this.colorArr.length*Math.random())];return a=="random"||a=="Random"?c.MathUtils.randomColor():a},c.ColorSpan=s,t.prototype={contains:function(a,b){return a<=this.right&&a>=this.x&&b<=this.bottom&&b>=this.y?!0:!1}},c.Rectangle=t;var u=u||{create:function(a){var b=new Float32Array(9);a&&this.set(a,b);return b},set:function(a,b){for(var c=0;c<9;c++)b[c]=a[c];return b},multiply:function(a,b,c){var d=a[0],e=a[1],f=a[2],g=a[3],h=a[4],i=a[6],j=a[7],k=b[0],l=b[1],m=b[2],n=b[3],o=b[4],p=b[6],q=b[7];c[0]=k*d+l*g,c[1]=k*e+l*h,c[2]=f*m,c[3]=n*d+o*g,c[4]=n*e+o*h,c[6]=p*d+q*g+i,c[7]=p*e+q*h+j;return c},inverse:function(a,b){var c=a[0],d=a[1],e=a[3],f=a[4],g=a[6],h=a[7],i=f,j=-e,k=h*e-f*g,l=c*i+d*j,m;m=1/l,b[0]=i*m,b[1]=-d*m,b[3]=j*m,b[4]=c*m,b[6]=k*m,b[7]=(-h*c+d*g)*m;return b},multiplyVec2:function(a,b,c){var d=b[0],e=b[1];c[0]=d*a[0]+e*a[3]+a[6],c[1]=d*a[1]+e*a[4]+a[7];return c}};c.Mat3=u,v.id=0,v.prototype={reset:function(a,b){this.life=c.Util.initValue(a,Infinity),this.easing=c.Util.initValue(b,c.ease.setEasingByName(c.easeLinear))},normalizeForce:function(a){return a.multiplyScalar(c.MEASURE)},normalizeValue:function(a){return a*c.MEASURE},initialize:function(a){},applyBehaviour:function(a,b,c){this.age+=b;if(this.age>=this.life||this.dead)this.energy=0,this.dead=!0,this.destory();else{var d=this.easing(a.age/a.life);this.energy=Math.max(1-d,0)}},destory:function(){var a,b=this.parents.length,c;for(c=0;c<b;c++)this.parents[c].removeBehaviour(this);this.parents=[]}},c.Behaviour=v,w.prototype={init:function(){this.startTime=0,this.nextTime=this.timePan.getValue()},getValue:function(a){this.startTime+=a;if(this.startTime>=this.nextTime){this.startTime=0,this.nextTime=this.timePan.getValue();return this.numPan.b==1?this.numPan.getValue(!1)>.5?1:0:this.numPan.getValue(!0)}return 0}},c.Rate=w,x.prototype.reset=function(){},x.prototype.init=function(a,b){b?this.initialize(b):this.initialize(a)},x.prototype.initialize=function(a){},c.Initialize=x;var y={initialize:function(a,b,d){var e=d.length,f;for(f=0;f<e;f++)d[f]instanceof c.Initialize?d[f].init(a,b):c.InitializeUtil.init(a,b,d[f]);c.InitializeUtil.bindEmitter(a,b)},init:function(a,b,d){c.Util.setPrototypeByObject(b,d),c.Util.setVector2DByObject(b,d)},bindEmitter:function(a,b){a.bindEmitter&&(b.p.add(a.p),b.v.add(a.v),b.a.add(a.a),b.v.rotate(c.MathUtils.degreeTransform(a.rotation)))}};c.InitializeUtil=y,c.Util.inherits(z,c.Initialize),z.prototype.initialize=function(a){this.lifePan.a==Infinity?a.life=Infinity:a.life=this.lifePan.getValue()},c.Life=z,c.Util.inherits(A,c.Initialize),A.prototype.reset=function(a){this.zone=c.Util.initValue(a,new c.PointZone)},A.prototype.initialize=function(a){this.zone.getPosition(),a.p.x=this.zone.vector.x,a.p.y=this.zone.vector.y},c.Position=A,c.P=A,c.Util.inherits(B,c.Initialize),B.prototype.reset=function(a,b,d){this.rPan=c.Util.setSpanValue(a),this.thaPan=c.Util.setSpanValue(b),this.type=c.Util.initValue(d,"vector")},B.prototype.normalizeVelocity=function(a){return a*c.MEASURE},B.prototype.initialize=function(a){if(this.type=="p"||this.type=="P"||this.type=="polar"){var b=new c.Polar2D(this.normalizeVelocity(this.rPan.getValue()),this.thaPan.getValue()*Math.PI/180);a.v.x=b.getX(),a.v.y=b.getY()}else a.v.x=this.normalizeVelocity(this.rPan.getValue()),a.v.y=this.normalizeVelocity(this.thaPan.getValue())},c.Velocity=B,c.V=B,c.Util.inherits(C,c.Initialize),C.prototype.initialize=function(a){a.mass=this.massPan.getValue()},c.Mass=C,c.Util.inherits(D,c.Initialize),D.prototype.reset=function(a,b,d){this.radius=c.Util.setSpanValue(a,b,d)},D.prototype.initialize=function(a){a.radius=this.radius.getValue(),a.transform.oldRadius=a.radius},c.Radius=D,c.Util.inherits(E,c.Initialize),E.prototype.initialize=function(a){var b=this.image.getValue();typeof b=="string"?a.target={width:this.w,height:this.h,src:b}:a.target=b},E.prototype.setSpanValue=function(a){return a instanceof c.ColorSpan?a:new c.ColorSpan(a)},c.ImageTarget=E,c.Util.inherits(F,c.Behaviour),F.prototype.reset=function(a,b,d,e){this.force=this.normalizeForce(new c.Vector2D(a,b)),d&&F._super_.prototype.reset.call(this,d,e)},F.prototype.applyBehaviour=function(a,b,c){F._super_.prototype.applyBehaviour.call(this,a,b,c),a.a.add(this.force)},c.Force=F,c.F=F,c.Util.inherits(G,c.Behaviour),G.prototype.reset=function(a,b,d,e,f){this.targetPosition=c.Util.initValue(a,new c.Vector2D),this.radius=c.Util.initValue(d,1e3),this.force=c.Util.initValue(this.normalizeValue(b),100),this.radiusSq=this.radius*this.radius,this.attractionForce=new c.Vector2D,this.lengthSq=0,e&&G._super_.prototype.reset.call(this,e,f)},G.prototype.applyBehaviour=function(a,b,c){G._super_.prototype.applyBehaviour.call(this,a,b,c),this.attractionForce.copy(this.targetPosition),this.attractionForce.sub(a.p),this.lengthSq=this.attractionForce.lengthSq(),this.lengthSq>4e-6&&this.lengthSq<this.radiusSq&&(this.attractionForce.normalize(),this.attractionForce.multiplyScalar(1-this.lengthSq/this.radiusSq),this.attractionForce.multiplyScalar(this.force),a.a.add(this.attractionForce))},c.Attraction=G,c.Util.inherits(H,c.Behaviour),H.prototype.reset=function(a,b,d,e,f){this.panFoce=new c.Vector2D(a,b),this.panFoce=this.normalizeForce(this.panFoce),this.delay=d,e&&H._super_.prototype.reset.call(this,e,f)},H.prototype.applyBehaviour=function(a,b,d){H._super_.prototype.applyBehaviour.call(this,a,b,d),this.time+=b,this.time>=this.delay&&(a.a.addXY(c.MathUtils.randomAToB(-this.panFoce.x,this.panFoce.x),c.MathUtils.randomAToB(-this.panFoce.y,this.panFoce.y)),this.time=0)},c.RandomDrift=H,c.Util.inherits(I,c.Attraction),I.prototype.reset=function(a,b,c,d,e){I._super_.prototype.reset.call(this,a,b,c,d,e),this.force*=-1},c.Repulsion=I,c.Util.inherits(J,c.Force),J.prototype.reset=function(a,b,c){J._super_.prototype.reset.call(this,0,a,b,c)},c.Gravity=J,c.G=J,c.Util.inherits(K,c.Behaviour),K.prototype.reset=function(a,b,d,e,f){this.emitter=c.Util.initValue(a,null),this.mass=c.Util.initValue(b,!0),this.callback=c.Util.initValue(d,null),this.collisionPool=[],this.delta=new c.Vector2D,e&&K._super_.prototype.reset.call(this,e,f)},K.prototype.applyBehaviour=function(a,b,c){var d=this.emitter?this.emitter.particles.slice(c):this.pool.slice(c),e,f,g,h,i,j=d.length;for(var k=0;k<j;k++)e=d[k],e!==a&&(this.delta.copy(e.p),this.delta.sub(a.p),f=this.delta.lengthSq(),distance=a.radius+e.radius,f<=distance*distance&&(g=distance-Math.sqrt(f),g+=.5,totalMass=a.mass+e.mass,h=this.mass?e.mass/totalMass:.5,i=this.mass?a.mass/totalMass:.5,a.p.add(this.delta.clone().normalize().multiplyScalar(g*-h)),e.p.add(this.delta.normalize().multiplyScalar(g*i)),this.callback&&this.callback(a,e)))},c.Collision=K,c.Util.inherits(L,c.Behaviour),L.prototype.reset=function(a,b,d,e){this.zone=a,this.zone.crossType=c.Util.initValue(b,"dead"),d&&L._super_.prototype.reset.call(this,d,e)},L.prototype.applyBehaviour=function(a,b,c){L._super_.prototype.applyBehaviour.call(this,a,b,c),this.zone.crossing(a)},c.CrossZone=L,c.Util.inherits(M,c.Behaviour),M.prototype.reset=function(a,d,e,f){d==null||d==b?this.same=!0:this.same=!1,this.a=c.Util.setSpanValue(c.Util.initValue(a,1)),this.b=c.Util.setSpanValue(d),e&&M._super_.prototype.reset.call(this,e,f)},M.prototype.initialize=function(a){a.transform.alphaA=this.a.getValue(),this.same?a.transform.alphaB=a.transform.alphaA:a.transform.alphaB=this.b.getValue()},M.prototype.applyBehaviour=function(a,b,c){M._super_.prototype.applyBehaviour.call(this,a,b,c),a.alpha=a.transform.alphaB+(a.transform.alphaA-a.transform.alphaB)*this.energy,a.alpha<.001&&(a.alpha=0)},c.Alpha=M,c.Util.inherits(N,c.Behaviour),N.prototype.reset=function(a,d,e,f){d==null||d==b?this.same=!0:this.same=!1,this.a=c.Util.setSpanValue(c.Util.initValue(a,1)),this.b=c.Util.setSpanValue(d),e&&N._super_.prototype.reset.call(this,e,f)},N.prototype.initialize=function(a){a.transform.scaleA=this.a.getValue(),a.transform.oldRadius=a.radius,this.same?a.transform.scaleB=a.transform.scaleA:a.transform.scaleB=this.b.getValue()},N.prototype.applyBehaviour=function(a,b,c){N._super_.prototype.applyBehaviour.call(this,a,b,c),a.scale=a.transform.scaleB+(a.transform.scaleA-a.transform.scaleB)*this.energy,a.scale<1e-4&&(a.scale=0),a.radius=a.transform.oldRadius*a.scale},c.Scale=N,c.Util.inherits(O,c.Behaviour),O.prototype.reset=function(a,d,e,f,g){d==null||d==b?this.same=!0:this.same=!1,this.a=c.Util.setSpanValue(c.Util.initValue(a,"Velocity")),this.b=c.Util.setSpanValue(c.Util.initValue(d,0)),this.style=c.Util.initValue(e,"to"),f&&O._super_.prototype.reset.call(this,f,g)},O.prototype.initialize=function(a){a.rotation=this.a.getValue(),a.transform.rotationA=this.a.getValue(),this.same||(a.transform.rotationB=this.b.getValue())},O.prototype.applyBehaviour=function(a,b,c){O._super_.prototype.applyBehaviour.call(this,a,b,c);if(!this.same)this.style=="to"||this.style=="TO"||this.style=="_"?a.rotation+=a.transform.rotationB+(a.transform.rotationA-a.transform.rotationB)*this.energy:a.rotation+=a.transform.rotationB;else if(this.a.a=="V"||this.a.a=="Velocity"||this.a.a=="v")a.rotation=a.getDirection()},c.Rotate=O,c.Util.inherits(P,c.Behaviour),P.prototype.reset=function(a,b,c,d){this.color1=this.setSpanValue(a),this.color2=this.setSpanValue(b),c&&P._super_.prototype.reset.call(this,c,d)},P.prototype.initialize=function(a){a.color=this.color1.getValue(),a.transform.beginRGB=c.Util.hexToRGB(a.color),this.color2&&(a.transform.endRGB=c.Util.hexToRGB(this.color2.getValue()))},P.prototype.applyBehaviour=function(a,b,c){this.color2?(P._super_.prototype.applyBehaviour.call(this,a,b,c),a.transform.rgb.r=a.transform.endRGB.r+(a.transform.beginRGB.r-a.transform.endRGB.r)*this.energy,a.transform.rgb.g=a.transform.endRGB.g+(a.transform.beginRGB.g-a.transform.endRGB.g)*this.energy,a.transform.rgb.b=a.transform.endRGB.b+(a.transform.beginRGB.b-a.transform.endRGB.b)*this.energy,a.transform.rgb.r=parseInt(a.transform.rgb.r,10),a.transform.rgb.g=parseInt(a.transform.rgb.g,10),a.transform.rgb.b=parseInt(a.transform.rgb.b,10)):(a.transform.rgb.r=a.transform.beginRGB.r,a.transform.rgb.g=a.transform.beginRGB.g,a.transform.rgb.b=a.transform.beginRGB.b)},P.prototype.setSpanValue=function(a){return a?a instanceof c.ColorSpan?a:new c.ColorSpan(a):null},c.Color=P,c.Util.inherits(Q,c.Behaviour),Q.prototype.reset=function(a,b,d,e){this.distanceVec=new c.Vector2D,this.centerPoint=c.Util.initValue(a,new c.Vector2D),this.force=c.Util.initValue(this.normalizeValue(b),100),d&&Q._super_.prototype.reset.call(this,d,e)},Q.prototype.initialize=function(a){},Q.prototype.applyBehaviour=function(a,b,c){this.distanceVec.set(this.centerPoint.x-a.p.x,this.centerPoint.y-a.p.y);var d=this.distanceVec.lengthSq();if(d!=0){var e=this.distanceVec.length(),f=this.force*b/(d*e);a.v.x+=f*this.distanceVec.x,a.v.y+=f*this.distanceVec.y}},c.GravityWell=Q,R.ID=0,c.Util.inherits(R,c.Particle),c.EventDispatcher.initialize(R.prototype),R.prototype.emit=function(a,b){this.emitTime=0,this.emitTotalTimes=c.Util.initValue(a,Infinity),b==!0||b=="life"||b=="destroy"?a=="once"?this.life=1:this.life=this.emitTotalTimes:isNaN(b)||(this.life=b),this.rate.init()},R.prototype.stopEmit=function(){this.emitTotalTimes=-1,this.emitTime=0},R.prototype.removeAllParticles=function(){for(var a=0;a<this.particles.length;a++)this.particles[a].dead=!0},R.prototype.createParticle=function(a,b){var d=c.pool.get();this.setupParticle(d,a,b),this.dispatchEvent(new c.Event({type:c.PARTICLE_CREATED,particle:d}));return d},R.prototype.addSelfInitialize=function(a){a.init?a.init(this):this.initAll()},R.prototype.addInitialize=function(){var a=arguments.length,b;for(b=0;b<a;b++)this.initializes.push(arguments[b])},R.prototype.removeInitialize=function(a){var b=this.initializes.indexOf(a);b>-1&&this.initializes.splice(b,1)},R.prototype.removeInitializers=function(){c.Util.destroyArray(this.initializes)},R.prototype.addBehaviour=function(){var a=arguments.length,b;for(b=0;b<a;b++)this.behaviours.push(arguments[b]),arguments[b].hasOwnProperty("parents")&&arguments[b].parents.push(this)},R.prototype.removeBehaviour=function(a){var b=this.behaviours.indexOf(a);b>-1&&this.behaviours.splice(b,1)},R.prototype.removeAllBehaviours=function(){c.Util.destroyArray(this.behaviours)},R.prototype.integrate=function(a){var b=1-this.damping;c.integrator.integrate(this,a,b);var d=this.particles.length,e;for(e=0;e<d;e++){var f=this.particles[e];f.update(a,e),c.integrator.integrate(f,a,b),this.dispatchEvent(new c.Event({type:c.PARTICLE_UPDATE,particle:f}))}},R.prototype.emitting=function(a){if(this.emitTotalTimes=="once"){var b=this.rate.getValue(99999),c;for(c=0;c<b;c++)this.createParticle();this.emitTotalTimes="none"}else if(!isNaN(this.emitTotalTimes)){this.emitTime+=a;if(this.emitTime<this.emitTotalTimes){var b=this.rate.getValue(a),c;for(c=0;c<b;c++)this.createParticle()}}},R.prototype.update=function(a){this.age+=a,(this.age>=this.life||this.dead)&&this.destroy(),this.emitting(a),this.integrate(a);var b,d=this.particles.length,e;for(e=d-1;e>=0;e--)b=this.particles[e],b.dead&&(c.pool.set(b),this.particles.splice(e,1),this.dispatchEvent(new c.Event({type:c.PARTICLE_DEAD,particle:b})))},R.prototype.setupParticle=function(a,b,d){var e=this.initializes,f=this.behaviours;b&&(b instanceof Array?e=b:e=[b]),d&&(d instanceof Array?f=d:f=[d]),c.InitializeUtil.initialize(this,a,e),a.addBehaviours(f),a.parent=this,this.particles.push(a)},R.prototype.destroy=function(){this.dead=!0,this.emitTotalTimes=-1,this.particles.length==0&&(this.removeInitializers(),this.removeAllBehaviours(),this.parent&&this.parent.removeEmitter(this))},c.Emitter=R,c.Util.inherits(S,c.Emitter),S.prototype.addSelfBehaviour=function(){var a=arguments.length,b;for(b=0;b<a;b++)this.selfBehaviours.push(arguments[b])},S.prototype.removeSelfBehaviour=function(a){var b=this.selfBehaviours.indexOf(a);b>-1&&this.selfBehaviours.splice(b,1)},S.prototype.update=function(a){S._super_.prototype.update.call(this,a);if(!this.sleep){var b=this.selfBehaviours.length,c;for(c=0;c<b;c++)this.selfBehaviours[c].applyBehaviour(this,a,c)}},c.BehaviourEmitter=S,c.Util.inherits(T,c.Emitter),T.prototype.initEventHandler=function(){var a=this;this.mousemoveHandler=function(b){a.mousemove.call(a,b)},this.mousedownHandler=function(b){a.mousedown.call(a,b)},this.mouseupHandler=function(b){a.mouseup.call(a,b)},this.mouseTarget.addEventListener("mousemove",this.mousemoveHandler,!1)},T.prototype.emit=function(){this._allowEmitting=!0},T.prototype.stopEmit=function(){this._allowEmitting=!1},T.prototype.mousemove=function(a){if(a.layerX||a.layerX==0)this.p.x+=(a.layerX-this.p.x)*this.ease,this.p.y+=(a.layerY-this.p.y)*this.ease;else if(a.offsetX||a.offsetX==0)this.p.x+=(a.offsetX-this.p.x)*this.ease,this.p.y+=(a.offsetY-this.p.y)*this.ease;this._allowEmitting&&T._super_.prototype.emit.call(this,"once")},T.prototype.destroy=function(){T._super_.prototype.destroy.call(this),this.mouseTarget.removeEventListener("mousemove",this.mousemoveHandler,!1)},c.FollowEmitter=T;var U=U||{easeLinear:function(a){return a},easeInQuad:function(a){return Math.pow(a,2)},easeOutQuad:function(a){return-(Math.pow(a-1,2)-1)},easeInOutQuad:function(a){if((a/=.5)<1)return.5*Math.pow(a,2);return-0.5*((a-=2)*a-2)},easeInCubic:function(a){return Math.pow(a,3)},easeOutCubic:function(a){return Math.pow(a-1,3)+1},easeInOutCubic:function(a){if((a/=.5)<1)return.5*Math.pow(a,3);return.5*(Math.pow(a-2,3)+2)},easeInQuart:function(a){return Math.pow(a,4)},easeOutQuart:function(a){return-(Math.pow(a-1,4)-1)},easeInOutQuart:function(a){if((a/=.5)<1)return.5*Math.pow(a,4);return-0.5*((a-=2)*Math.pow(a,3)-2)},easeInSine:function(a){return-Math.cos(a*(Math.PI/2))+1},easeOutSine:function(a){return Math.sin(a*(Math.PI/2))},easeInOutSine:function(a){return-0.5*(Math.cos(Math.PI*a)-1)},easeInExpo:function(a){return a===0?0:Math.pow(2,10*(a-1))},easeOutExpo:function(a){return a===1?1:-Math.pow(2,-10*a)+1},easeInOutExpo:function(a){if(a===0)return 0;if(a===1)return 1;if((a/=.5)<1)return.5*Math.pow(2,10*(a-1));return.5*(-Math.pow(2,-10*--a)+2)},easeInCirc:function(a){return-(Math.sqrt(1-a*a)-1)},easeOutCirc:function(a){return Math.sqrt(1-Math.pow(a-1,2))},easeInOutCirc:function(a){if((a/=.5)<1)return-0.5*(Math.sqrt(1-a*a)-1);return.5*(Math.sqrt(1-(a-=2)*a)+1)},easeInBack:function(a){var b=1.70158;return a*a*((b+1)*a-b)},easeOutBack:function(a){var b=1.70158;return(a=a-1)*a*((b+1)*a+b)+1},easeInOutBack:function(a){var b=1.70158;if((a/=.5)<1)return.5*a*a*(((b*=1.525)+1)*a-b);return.5*((a-=2)*a*(((b*=1.525)+1)*a+b)+2)},setEasingByName:function(a){switch(a){case"easeLinear":return c.ease.easeLinear;case"easeInQuad":return c.ease.easeInQuad;case"easeOutQuad":return c.ease.easeOutQuad;case"easeInOutQuad":return c.ease.easeInOutQuad;case"easeInCubic":return c.ease.easeInCubic;case"easeOutCubic":return c.ease.easeOutCubic;case"easeInOutCubic":return c.ease.easeInOutCubic;case"easeInQuart":return c.ease.easeInQuart;case"easeOutQuart":return c.ease.easeOutQuart;case"easeInOutQuart":return c.ease.easeInOutQuart;case"easeInSine":return c.ease.easeInSine;case"easeOutSine":return c.ease.easeOutSine;case"easeInOutSine":return c.ease.easeInOutSine;case"easeInExpo":return c.ease.easeInExpo;case"easeOutExpo":return c.ease.easeOutExpo;case"easeInOutExpo":return c.ease.easeInOutExpo;case"easeInCirc":return c.ease.easeInCirc;case"easeOutCirc":return c.ease.easeOutCirc;case"easeInOutCirc":return c.ease.easeInOutCirc;case"easeInBack":return c.ease.easeInBack;case"easeOutBack":return c.ease.easeOutBack;case"easeInOutBack":return c.ease.easeInOutBack;default:return c.ease.easeLinear}}};c.ease=U,c.easeLinear="easeLinear",c.easeInQuad="easeInQuad",c.easeOutQuad="easeOutQuad",c.easeInOutQuad="easeInOutQuad",c.easeInCubic="easeInCubic",c.easeOutCubic="easeOutCubic",c.easeInOutCubic="easeInOutCubic",c.easeInQuart="easeInQuart",c.easeOutQuart="easeOutQuart",c.easeInOutQuart="easeInOutQuart",c.easeInSine="easeInSine",c.easeOutSine="easeOutSine",c.easeInOutSine="easeInOutSine",c.easeInExpo="easeInExpo",c.easeOutExpo="easeOutExpo",c.easeInOutExpo="easeInOutExpo",c.easeInCirc="easeInCirc",c.easeOutCirc="easeOutCirc",c.easeInOutCirc="easeInOutCirc",c.easeInBack="easeInBack",c.easeOutBack="easeOutBack",c.easeInOutBack="easeInOutBack",V.prototype={start:function(){this.addEventHandler(),this.renderer.start()},stop:function(){this.renderer.stop()},resize:function(a,b){this.renderer.resize(a,b)},setStroke:function(a,b){this.renderer.hasOwnProperty("stroke")?this.renderer.setStroke(a,b):alert("Sorry this renderer do not suppest stroke method!")},createImageData:function(a){this.renderer instanceof c.PixelRender&&this.renderer.createImageData(a)},setMaxRadius:function(a){this.renderer instanceof c.WebGLRender&&this.renderer.setMaxRadius(a)},blendEquation:function(a){this.renderer instanceof c.WebGLRender&&this.renderer.blendEquation(a)},blendFunc:function(a,b){this.renderer instanceof c.WebGLRender&&this.renderer.blendFunc(a,b)},setType:function(a){this.type=a,this.renderer=this.getRenderer()},getRenderer:function(){switch(this.type){case"dom":return new c.DomRender(this.proton,this.element);case"canvas":return new c.CanvasRender(this.proton,this.element);case"webgl":return new c.WebGLRender(this.proton,this.element);case"easel":return new c.EaselRender(this.proton,this.element);case"easeljs":return new c.EaselRender(this.proton,this.element);case"pixel":return new c.PixelRender(this.proton,this.element);default:return new c.BaseRender(this.proton,this.element)}},render:function(a){this.renderer.render(a)},addEventHandler:function(){this.onProtonUpdate&&(this.renderer.onProtonUpdate=this.onProtonUpdate),this.onParticleCreated&&(this.renderer.onParticleCreated=this.onParticleCreated),this.onParticleUpdate&&(this.renderer.onParticleUpdate=this.onParticleUpdate),this.onParticleDead&&(this.renderer.onParticleDead=this.onParticleDead)}},c.Renderer=V,W.prototype={start:function(){var a=this;this.proton.addEventListener(c.PROTON_UPDATE,function(b){a.onProtonUpdate.call(a)}),this.proton.addEventListener(c.PROTON_UPDATE_AFTER,function(b){a.onProtonUpdateAfter.call(a)}),this.proton.addEventListener(c.EMITTER_ADDED,function(b){a.onEmitterAdded.call(a,b.emitter)}),this.proton.addEventListener(c.EMITTER_REMOVED,function(b){a.onEmitterRemoved.call(a,b.emitter)});var b=this.proton.emitters.length,d;for(d=0;d<b;d++){var e=this.proton.emitters[d];this.addEmitterListener(e)}},resize:function(a,b){},addEmitterListener:function(a){var b=this;a.addEventListener(c.PARTICLE_CREATED,function(a){b.onParticleCreated.call(b,a.particle)}),a.addEventListener(c.PARTICLE_UPDATE,function(a){b.onParticleUpdate.call(b,a.particle)}),a.addEventListener(c.PARTICLE_DEAD,function(a){b.onParticleDead.call(b,a.particle)})},stop:function(){var a=this.proton.emitters.length,b;this.proton.removeAllEventListeners();for(b=0;b<a;b++){var c=this.proton.emitters[b];c.removeAllEventListeners()}},onEmitterAdded:function(a){this.addEmitterListener(a)},onEmitterRemoved:function(a){a.removeAllEventListeners()},onProtonUpdate:function(){},onProtonUpdateAfter:function(){},onParticleCreated:function(a){},onParticleUpdate:function(a){},onParticleDead:function(a){}},c.BaseRender=W,c.Util.inherits(X,c.BaseRender),X.prototype.start=function(){X._super_.prototype.start.call(this)},X.prototype.setStroke=function(a,b){a=c.Util.initValue(a,"#000000"),b=c.Util.initValue(b,1),this.stroke={color:a,thinkness:b}},X.prototype.onProtonUpdate=function(){},X.prototype.onParticleCreated=function(a){if(a.target){var b=this;c.Util.getImage(a.target,a,!1,function(a){b.setImgInDIV.call(b,a)})}else a.transform.canvas=c.DomUtil.createCanvas(a.id+"_canvas",a.radius+1,a.radius+1,"absolute"),a.transform.bakOldRadius=a.radius,this.stroke?(a.transform.canvas.width=2*a.radius+this.stroke.thinkness*2,a.transform.canvas.height=2*a.radius+this.stroke.thinkness*2):(a.transform.canvas.width=2*a.radius+1,a.transform.canvas.height=2*a.radius+1),a.transform.context=a.transform.canvas.getContext("2d"),a.transform.context.fillStyle=a.color,a.transform.context.beginPath(),a.transform.context.arc(a.radius,a.radius,a.radius,0,Math.PI*2,!0),this.stroke&&(a.transform.context.strokeStyle=this.stroke.color,a.transform.context.lineWidth=this.stroke.thinkness,a.transform.context.stroke()),a.transform.context.closePath(),a.transform.context.fill(),this.element.appendChild(a.transform.canvas)},X.prototype.onParticleUpdate=function(a){a.target?a.target instanceof Image&&(a.transform.canvas.style.opacity=a.alpha,c.DomUtil.transformDom(a.transform.canvas,a.p.x-a.target.width/2,a.p.y-a.target.height/2,a.scale,a.rotation)):(a.transform.canvas.style.opacity=a.alpha,a.transform.oldRadius?c.DomUtil.transformDom(a.transform.canvas,a.p.x-a.transform.oldRadius,a.p.y-a.transform.oldRadius,a.scale,a.rotation):c.DomUtil.transformDom(a.transform.canvas,a.p.x-a.transform.bakOldRadius,a.p.y-a.transform.bakOldRadius,a.scale,a.rotation))},X.prototype.onParticleDead=function(a){a.transform.canvas&&this.element.removeChild(a.transform.canvas)},X.prototype.setImgInDIV=function(a){a.transform.canvas=c.DomUtil.createCanvas(a.id+"_canvas",a.target.width+1,a.target.height+1,"absolute",a.p.x-a.radius,a.p.y-a.radius),a.transform.context=a.transform.canvas.getContext("2d"),a.transform.context.drawImage(a.target,0,0,a.target.width,a.target.height),this.element.appendChild(a.transform.canvas)},c.DomRender=X,c.Util.inherits(Y,c.BaseRender),Y.prototype.resize=function(a,b){},Y.prototype.start=function(){Y._super_.prototype.start.call(this)},Y.prototype.onProtonUpdate=function(){},Y.prototype.onParticleCreated=function(a){if(a.target)a.target=a.target.clone(),a.target.parent||(!a.target.image||(a.target.regX=a.target.image.width/2,a.target.regY=a.target.image.height/2),this.element.addChild(a.target));else{var b=new createjs.Graphics;this.stroke&&(this.stroke==!0?b.beginStroke("#000000"):this.stroke instanceof String&&b.beginStroke(this.stroke)),b.beginFill(a.color).drawCircle(0,0,a.radius);var c=new createjs.Shape(b);a.target=c,this.element.addChild(a.target)}},Y.prototype.onParticleUpdate=function(a){a.target&&(a.target.x=a.p.x,a.target.y=a.p.y,a.target.alpha=a.alpha,a.target.scaleX=a.target.scaleY=a.scale,a.target.rotation=a.rotation)},Y.prototype.onParticleDead=function(a){a.target&&a.target.parent&&a.target.parent.removeChild(a.target)},c.EaselRender=Y,c.Util.inherits(Z,c.BaseRender),Z.prototype.resize=function(a,b){this.element.width=a,this.element.height=b},Z.prototype.start=function(){Z._super_.prototype.start.call(this)},Z.prototype.setStroke=function(a,b){a=c.Util.initValue(a,"#000000"),b=c.Util.initValue(b,1),this.stroke={color:a,thinkness:b}},Z.prototype.onProtonUpdate=function(){this.context.clearRect(0,0,this.element.width,this.element.height)},Z.prototype.onParticleCreated=function(a){a.target?c.Util.getImage(a.target,a,!1):a.color=a.color?a.color:"#ff0000"},Z.prototype.onParticleUpdate=function(a){if(a.target){if(a.target instanceof Image){var b=a.target.width*a.scale|0,d=a.target.height*a.scale|0,e=a.p.x-b/2,f=a.p.y-d/2;if(!a.color)this.context.save(),this.context.globalAlpha=a.alpha,this.context.translate(a.p.x,a.p.y),this.context.rotate(c.MathUtils.degreeTransform(a.rotation)),this.context.translate(-a.p.x,-a.p.y),this.context.drawImage(a.target,0,0,a.target.width,a.target.height,e,f,b,d),this.context.globalAlpha=1,this.context.restore();else{a.transform.buffer||(a.transform.buffer=this.getBuffer(a.target));var g=a.transform.buffer.getContext("2d");g.clearRect(0,0,a.transform.buffer.width,a.transform.buffer.height),g.globalAlpha=a.alpha,g.drawImage(a.target,0,0),g.globalCompositeOperation="source-atop",g.fillStyle=c.Util.rgbToHex(a.transform.rgb),g.fillRect(0,0,a.transform.buffer.width,a.transform.buffer.height),g.globalCompositeOperation="source-over",g.globalAlpha=1,this.context.drawImage(a.transform.buffer,0,0,a.transform.buffer.width,a.transform.buffer.height,e,f,b,d)}}}else a.transform.rgb?this.context.fillStyle="rgba("+a.transform.rgb.r+","+a.transform.rgb.g+","+a.transform.rgb.b+","+a.alpha+")":this.context.fillStyle=a.color,this.context.beginPath(),this.context.arc(a.p.x,a.p.y,a.radius,0,Math.PI*2,!0),this.stroke&&(this.context.strokeStyle=this.stroke.color,this.context.lineWidth=this.stroke.thinkness,this.context.stroke()),this.context.closePath(),this.context.fill()},Z.prototype.onParticleDead=function(a){},Z.prototype.getBuffer=function(a){if(a instanceof Image){var b=a.width+"_"+a.height,c=this.bufferCache[b];c||(c=document.createElement("canvas"),c.width=a.width,c.height=a.height,this.bufferCache[b]=c);return c}},c.CanvasRender=Z,c.Util.inherits($,c.BaseRender),$.prototype.resize=function(a,b){this.element.width=a,this.element.height=b},$.prototype.createImageData=function(a){a?this.rectangle=a:this.rectangle=new c.Rectangle(0,0,this.element.width,this.element.height),this.imageData=this.context.createImageData(this.rectangle.width,this.rectangle.height),this.context.putImageData(this.imageData,this.rectangle.x,this.rectangle.y)},$.prototype.start=function(){$._super_.prototype.start.call(this)},$.prototype.onProtonUpdate=function(){this.context.clearRect(this.rectangle.x,this.rectangle.y,this.rectangle.width,this.rectangle.height),this.imageData=this.context.getImageData(this.rectangle.x,this.rectangle.y,this.rectangle.width,this.rectangle.height)},$.prototype.onProtonUpdateAfter=function(){this.context.putImageData(this.imageData,this.rectangle.x,this.rectangle.y)},$.prototype.onParticleCreated=function(a){},$.prototype.onParticleUpdate=function(a){this.imageData&&this.setPixel(this.imageData,Math.floor(a.p.x-this.rectangle.x),Math.floor(a.p.y-this.rectangle.y),a)},$.prototype.setPixel=function(a,b,c,d){var e=d.transform.rgb;if(!(b<0||b>this.element.width||c<0||c>this.elementwidth)){var f=((c>>0)*a.width+(b>>0))*4;a.data[f]=e.r,a.data[f+1]=e.g,a.data[f+2]=e.b,a.data[f+3]=d.alpha*255}},$.prototype.onParticleDead=function(a){},c.PixelRender=$,c.Util.inherits(_,c.BaseRender),_.prototype.resize=function(a,b){this.umat[4]=-2,this.umat[7]=1,this.smat[0]=1/a,this.smat[4]=1/b,this.mstack.set(this.umat,0),this.mstack.set(this.smat,1),this.gl.viewport(0,0,a,b),this.element.width=a,this.element.height=b},_.prototype.setMaxRadius=function(a){this.circleCanvasURL=this.createCircle(a)},_.prototype.getVertexShader=function(){var a=["uniform vec2 viewport;","attribute vec2 aVertexPosition;","attribute vec2 aTextureCoord;","uniform mat3 tMat;","varying vec2 vTextureCoord;","varying float alpha;","void main() {","vec3 v = tMat * vec3(aVertexPosition, 1.0);","gl_Position = vec4(v.x, v.y, 0, 1);","vTextureCoord = aTextureCoord;","alpha = tMat[0][2];","}"].join("\n");return a},_.prototype.getFragmentShader=function(){var a=["precision mediump float;","varying vec2 vTextureCoord;","varying float alpha;","uniform sampler2D uSampler;","uniform vec4 color;","uniform bool useTexture;","uniform vec3 uColor;","void main() {","vec4 textureColor = texture2D(uSampler, vTextureCoord);","gl_FragColor = textureColor * vec4(uColor, 1.0);","gl_FragColor.w *= alpha;","}"].join("\n");return a},_.prototype.initVar=function(){this.mstack=new c.MStack,this.umat=c.Mat3.create([2,0,1,0,-2,0,-1,1,1]),this.smat=c.Mat3.create([.01,0,1,0,.01,0,0,0,1]),this.texturebuffers={}},_.prototype.start=function(){_._super_.prototype.start.call(this),this.resize(this.element.width,this.element.height)},_.prototype.blendEquation=function(a){this.gl.blendEquation(this.gl[a])},_.prototype.blendFunc=function(a,b){this.gl.blendFunc(this.gl[a],this.gl[b])},_.prototype.getShader=function(a,b,c){var d;c?d=a.createShader(a.FRAGMENT_SHADER):d=a.createShader(a.VERTEX_SHADER),a.shaderSource(d,b),a.compileShader(d);if(!a.getShaderParameter(d,a.COMPILE_STATUS)){alert(a.getShaderInfoLog(d));return null}return d},_.prototype.initShaders=function(){var a=this.getShader(this.gl,this.getFragmentShader(),!0),b=this.getShader(this.gl,this.getVertexShader(),!1);this.sprogram=this.gl.createProgram(),this.gl.attachShader(this.sprogram,b),this.gl.attachShader(this.sprogram,a),this.gl.linkProgram(this.sprogram),this.gl.getProgramParameter(this.sprogram,this.gl.LINK_STATUS)||alert("Could not initialise shaders"),this.gl.useProgram(this.sprogram),this.sprogram.vpa=this.gl.getAttribLocation(this.sprogram,"aVertexPosition"),this.sprogram.tca=this.gl.getAttribLocation(this.sprogram,"aTextureCoord"),this.gl.enableVertexAttribArray(this.sprogram.tca),this.gl.enableVertexAttribArray(this.sprogram.vpa),this.sprogram.tMatUniform=this.gl.getUniformLocation(this.sprogram,"tMat"),this.sprogram.samplerUniform=this.gl.getUniformLocation(this.sprogram,"uSampler"),this.sprogram.useTex=this.gl.getUniformLocation(this.sprogram,"useTexture"),this.sprogram.color=this.gl.getUniformLocation(this.sprogram,"uColor"),this.gl.uniform1i(this.sprogram.useTex,1)},_.prototype.initBuffers=function(){this.unitIBuffer=this.gl.createBuffer(),this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,this.unitIBuffer);var a=[0,3,1,0,2,3];this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(a),this.gl.STATIC_DRAW);var b=[];for(var c=0;c<100;c++)b.push(c);idx=new Uint16Array(b),this.unitI33=this.gl.createBuffer(),this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,this.unitI33),this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER,idx,this.gl.STATIC_DRAW),b=[];for(c=0;c<100;c++)b.push(c,c+1,c+2);idx=new Uint16Array(b),this.stripBuffer=this.gl.createBuffer(),this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,this.stripBuffer),this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER,idx,this.gl.STATIC_DRAW)},_.prototype.createCircle=function(a){this.circleCanvasRadius=c.WebGLUtil.nhpot(c.Util.initValue(a,32));var b=c.DomUtil.createCanvas("circle_canvas",this.circleCanvasRadius*2,this.circleCanvasRadius*2),d=b.getContext("2d");d.beginPath(),d.arc(this.circleCanvasRadius,this.circleCanvasRadius,this.circleCanvasRadius,0,Math.PI*2,!0),d.closePath(),d.fillStyle="#FFF",d.fill();return b.toDataURL()},_.prototype.setImgInCanvas=function(a){var b=a.target.width,d=a.target.height,e=c.WebGLUtil.nhpot(a.target.width),f=c.WebGLUtil.nhpot(a.target.height),g=a.target.width/e,h=a.target.height/f;this.texturebuffers[a.transform.src]||(this.texturebuffers[a.transform.src]=[this.gl.createTexture(),this.gl.createBuffer(),this.gl.createBuffer()]),a.transform.texture=this.texturebuffers[a.transform.src][0],a.transform.vcBuffer=this.texturebuffers[a.transform.src][1],a.transform.tcBuffer=this.texturebuffers[a.transform.src][2],this.gl.bindBuffer(this.gl.ARRAY_BUFFER,a.transform.tcBuffer),this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array([0,0,g,0,0,h,h,h]),this.gl.STATIC_DRAW),this.gl.bindBuffer(this.gl.ARRAY_BUFFER,a.transform.vcBuffer),this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array([0,0,b,0,0,d,b,d]),this.gl.STATIC_DRAW);var i=a.transform.canvas.getContext("2d"),j=i.getImageData(0,0,e,f);this.gl.bindTexture(this.gl.TEXTURE_2D,a.transform.texture),this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA,this.gl.RGBA,this.gl.UNSIGNED_BYTE,j),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MAG_FILTER,this.gl.LINEAR),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MIN_FILTER,this.gl.LINEAR_MIPMAP_NEAREST),this.gl.generateMipmap(this.gl.TEXTURE_2D),a.transform.textureLoaded=!0,a.transform.textureWidth=b,a.transform.textureHeight=d},_.prototype.setStroke=function(a,b){},_.prototype.onProtonUpdate=function(){},_.prototype.onParticleCreated=function(a){var b=this;a.transform.textureLoaded=!1,a.transform.tmat=c.Mat3.create(),a.transform.tmat[8]=1,a.transform.imat=c.Mat3.create(),a.transform.imat[8]=1,a.target?c.Util.getImage(a.target,a,!0,function(a){b.setImgInCanvas.call(b,a),a.transform.oldScale=1}):c.Util.getImage(this.circleCanvasURL,a,!0,function(a){b.setImgInCanvas.call(b,a),a.transform.oldScale=a.radius/b.circleCanvasRadius})},_.prototype.onParticleUpdate=function(a){a.transform.textureLoaded&&(this.updateMatrix(a),this.gl.uniform3f(this.sprogram.color,a.transform.rgb.r/255,a.transform.rgb.g/255,a.transform.rgb.b/255),this.gl.uniformMatrix3fv(this.sprogram.tMatUniform,!1,this.mstack.top()),this.gl.bindBuffer(this.gl.ARRAY_BUFFER,a.transform.vcBuffer),this.gl.vertexAttribPointer(this.sprogram.vpa,2,this.gl.FLOAT,!1,0,0),this.gl.bindBuffer(this.gl.ARRAY_BUFFER,a.transform.tcBuffer),this.gl.vertexAttribPointer(this.sprogram.tca,2,this.gl.FLOAT,!1,0,0),this.gl.bindTexture(this.gl.TEXTURE_2D,a.transform.texture),this.gl.uniform1i(this.sprogram.samplerUniform,0),this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,this.unitIBuffer),this.gl.drawElements(this.gl.TRIANGLES,6,this.gl.UNSIGNED_SHORT,0),this.mstack.pop())},_.prototype.onParticleDead=function(a){},_.prototype.updateMatrix=function(a){var b=c.WebGLUtil.makeTranslation(-a.transform.textureWidth/2,-a.transform.textureHeight/2),d=c.WebGLUtil.makeTranslation(a.p.x,a.p.y),e=a.rotation*(Math.PI/180),f=c.WebGLUtil.makeRotation(e),g=a.scale*a.transform.oldScale,h=c.WebGLUtil.makeScale(g,g),i=c.WebGLUtil.matrixMultiply(b,h);i=c.WebGLUtil.matrixMultiply(i,f),i=c.WebGLUtil.matrixMultiply(i,d),c.Mat3.inverse(i,a.transform.imat),i[2]=a.alpha,this.mstack.push(i)},c.WebGLRender=_,ba.prototype={getPosition:function(){},crossing:function(a){}},c.Zone=ba,c.Util.inherits(bb,c.Zone),bb.prototype.getPosition=function(){this.random=Math.random(),this.vector.x=this.x1+this.random*this.length*Math.cos(this.gradient),this.vector.y=this.y1+this.random*this.length*Math.sin(this.gradient);return this.vector},bb.prototype.getDirection=function(a,b){var c=this.dy,d=-this.dx,e=this.dot,f=d==0?1:d;return(c*a+d*b+e)*f>0?!0:!1},bb.prototype.getDistance=function(a,b){var c=this.dy,d=-this.dx,e=this.dot,f=c*a+d*b+e;return f/Math.sqrt(this.xxyy)},bb.prototype.getSymmetric=function(a){var b=a.getGradient(),c=this.getGradient(),d=2*(c-b),e=a.x,f=a.y;a.x=e*Math.cos(d)-f*Math.sin(d),a.y=e*Math.sin(d)+f*Math.cos(d);return a},bb.prototype.getGradient=function(){return Math.atan2(this.dy,this.dx)},bb.prototype.getRange=function(a,b){var c=Math.abs(this.getGradient());c<=Math.PI/4?a.p.x<this.maxx&&a.p.x>this.minx&&b():a.p.y<this.maxy&&a.p.y>this.miny&&b()},bb.prototype.getLength=function(){return Math.sqrt(this.dx*this.dx+this.dy*this.dy)},bb.prototype.crossing=function(a){var b=this;this.crossType=="dead"?this.direction==">"||this.direction=="R"||this.direction=="right"||this.direction=="down"?this.getRange(a,function(){b.getDirection(a.p.x,a.p.y)&&(a.dead=!0)}):this.getRange(a,function(){b.getDirection(a.p.x,a.p.y)||(a.dead=!0)}):this.crossType=="bound"?this.getRange(a,function(){b.getDistance(a.p.x,a.p.y)<=a.radius&&(b.dx==0?a.v.x*=-1:b.dy==0?a.v.y*=-1:b.getSymmetric(a.v))}):this.crossType=="cross"&&this.alert&&(alert("Sorry lineZone does not support cross method"),this.alert=!1)},c.LineZone=bb,c.Util.inherits(bc,c.Zone),bc.prototype.getPosition=function(){this.random=Math.random(),this.angle=Math.PI*2*Math.random(),this.vector.x=this.x+this.random*this.radius*Math.cos(this.angle),this.vector.y=this.y+this.random*this.radius*Math.sin(this.angle);return this.vector},bc.prototype.setCenter=function(a,b){this.center.x=a,this.center.y=b},bc.prototype.crossing=function(a){var b=a.p.distanceTo(this.center);this.crossType=="dead"?b-a.radius>this.radius&&(a.dead=!0):this.crossType=="bound"?b+a.radius>=this.radius&&this.getSymmetric(a):this.crossType=="cross"&&this.alert&&(alert("Sorry CircleZone does not support cross method"),this.alert=!1)},bc.prototype.getSymmetric=function(a){var b=a.v.getGradient(),c=this.getGradient(a),d=2*(c-b),e=a.v.x,f=a.v.y;a.v.x=e*Math.cos(d)-f*Math.sin(d),a.v.y=e*Math.sin(d)+f*Math.cos(d)},bc.prototype.getGradient=function(a){return-Math.PI/2+Math.atan2(a.p.y-this.center.y,a.p.x-this.center.x)},c.CircleZone=bc,c.Util.inherits(bd,c.Zone),bd.prototype.getPosition=function(){this.vector.x=this.x,this.vector.y=this.y;return this.vector},bd.prototype.crossing=function(a){this.alert&&(alert("Sorry PointZone does not support crossing method"),this.alert=!1)},c.PointZone=bd,c.Util.inherits(be,c.Zone),be.prototype.getPosition=function(){this.vector.x=this.x+Math.random()*this.width,this.vector.y=this.y+Math.random()*this.height;return this.vector},be.prototype.crossing=function(a){this.crossType=="dead"?(a.p.x+a.radius<this.x?a.dead=!0:a.p.x-a.radius>this.x+this.width&&(a.dead=!0),a.p.y+a.radius<this.y?a.dead=!0:a.p.y-a.radius>this.y+this.height&&(a.dead=!0)):this.crossType=="bound"?(a.p.x-a.radius<this.x?(a.p.x=this.x+a.radius,a.v.x*=-1):a.p.x+a.radius>this.x+this.width&&(a.p.x=this.x+this.width-a.radius,a.v.x*=-1),a.p.y-a.radius<this.y?(a.p.y=this.y+a.radius,a.v.y*=-1):a.p.y+a.radius>this.y+this.height&&(a.p.y=this.y+this.height-a.radius,a.v.y*=-1)):this.crossType=="cross"&&(a.p.x+a.radius<this.x&&a.v.x<=0?a.p.x=this.x+this.width+a.radius:a.p.x-a.radius>this.x+this.width&&a.v.x>=0&&(a.p.x=this.x-a.radius),a.p.y+a.radius<this.y&&a.v.y<=0?a.p.y=this.y+this.height+a.radius:a.p.y-a.radius>this.y+this.height&&a.v.y>=0&&(a.p.y=this.y-a.radius))},c.RectZone=be,c.Util.inherits(bf,c.Zone),bf.prototype.reset=function(a,b,d,e){this.imageData=a,this.x=c.Util.initValue(b,0),this.y=c.Util.initValue(d,0),this.d=c.Util.initValue(e,2),this.vectors=[],this.setVectors()},bf.prototype.setVectors=function(){var a,b,c=this.imageData.width,d=this.imageData.height;for(a=0;a<c;a+=this.d)for(b=0;b<d;b+=this.d){var e=((b>>0)*c+(a>>0))*4;this.imageData.data[e+3]>0&&this.vectors.push({x:a+this.x,y:b+this.y})}return this.vector},bf.prototype.getBound=function(a,b){var c=((b>>0)*this.imageData.width+(a>>0))*4;return this.imageData.data[c+3]>0?!0:!1},bf.prototype.getPosition=function(){return this.vector.copy(this.vectors[Math.floor(Math.random()*this.vectors.length)])},bf.prototype.getColor=function(a,b){a-=this.x,b-=this.y;var c=((b>>0)*this.imageData.width+(a>>0))*4;return{r:this.imageData.data[c],g:this.imageData.data[c+1],b:this.imageData.data[c+2],a:this.imageData.data[c+3]}},bf.prototype.crossing=function(a){this.crossType=="dead"?this.getBound(a.p.x-this.x,a.p.y-this.y)?a.dead=!0:a.dead=!1:this.crossType=="bound"&&(this.getBound(a.p.x-this.x,a.p.y-this.y)||a.v.negate())},c.ImageZone=bf;var bg=function(){if(a.console&&a.console.log){var b=arguments;if(typeof arguments[0]=="string")if(arguments[0].indexOf("+")==0){var c=parseInt(arguments[0]);bg.once<c&&(delete b[0],console.log(b),bg.once++)}else console.log(b);else console.log(b)}};bg.once=0,c.log=bg;var bh=bh||{addEventListener:function(a,b){a.addEventListener(c.PROTON_UPDATE,function(a){b()})},setStyle:function(a){var b=a||"#ff0000",d=c.Util.hexToRGB(b),e="rgba("+d.r+","+d.g+","+d.b+","+.5+")";return e},drawZone:function(a,b,d,e){var f=b.getContext("2d"),g=this.setStyle();this.addEventListener(a,function(){e&&f.clearRect(0,0,b.width,b.height),d instanceof c.PointZone?(f.beginPath(),f.fillStyle=g,f.arc(d.x,d.y,10,0,Math.PI*2,!0),f.fill(),f.closePath()):d instanceof c.LineZone?(f.beginPath(),f.strokeStyle=g,f.moveTo(d.x1,d.y1),f.lineTo(d.x2,d.y2),f.stroke(),f.closePath()):d instanceof c.RectZone?(f.beginPath(),f.strokeStyle=g,f.drawRect(d.x,d.y,d.width,d.height),f.stroke(),f.closePath()):d instanceof c.CircleZone&&(f.beginPath(),f.strokeStyle=g,f.arc(d.x,d.y,d.radius,0,Math.PI*2,!0),f.stroke(),f.closePath())})},drawEmitter:function(a,b,c,d){var e=b.getContext("2d"),f=this.setStyle();this.addEventListener(a,function(){d&&e.clearRect(0,0,b.width,b.height),e.beginPath(),e.fillStyle=f,e.arc(c.p.x,c.p.y,10,0,Math.PI*2,!0),e.fill(),e.closePath()})},test:{},setTest:function(a,b){this.test[a]=b},getTest:function(a){return this.test.hasOwnProperty(a)?this.test[a]:!1}};c.Debug=bh})(window),function(){var a=0,b=["ms","moz","webkit","o"];for(var c=0;c<b.length&&!window.requestAnimationFrame;++c)window.requestAnimationFrame=window[b[c]+"RequestAnimationFrame"],window.cancelAnimationFrame=window[b[c]+"CancelAnimationFrame"]||window[b[c]+"CancelRequestAnimationFrame"];window.requestAnimationFrame||(window.requestAnimationFrame=function(b,c){var d=(new Date).getTime(),e=Math.max(0,16-(d-a)),f=window.setTimeout(function(){b(d+e)},e);a=d+e;return f}),window.cancelAnimationFrame||(window.cancelAnimationFrame=function(a){clearTimeout(a)})}()

var canvas;
var context;
var proton;
var renderer;
var emitter;

function makeFireworks() {
	canvas = document.getElementById("fwYay");
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	context = canvas.getContext('2d');
	//context.globalCompositeOperation = "lighter";

	createProton();
	tick();
}

function createProton(image) {
	proton = new Proton;
	emitter = new Proton.Emitter();
	emitter.rate = new Proton.Rate(new Proton.Span(1, 3), 1);
	emitter.addInitialize(new Proton.Mass(1));
	emitter.addInitialize(new Proton.Radius(2, 4));
	emitter.addInitialize(new Proton.P(new Proton.LineZone(10, canvas.height, canvas.width - 10, canvas.height)));
	emitter.addInitialize(new Proton.Life(1, 1.5));
	emitter.addInitialize(new Proton.V(new Proton.Span(4, 6), new Proton.Span(0, 0, true), 'polar'));
	emitter.addBehaviour(new Proton.Gravity(1));
	emitter.addBehaviour(new Proton.Color('#ff0000', 'random'));
	emitter.emit();
	proton.addEmitter(emitter);

	renderer = new Proton.Renderer('canvas', proton, canvas);
	renderer.onProtonUpdate = function() {
		context.fillStyle = "rgba(0, 0, 0, 0.1)";
		context.fillRect(0, 0, canvas.width, canvas.height);
	};
	renderer.start();

	////NOTICE :you can only use two emitters do this effect.In this demo I use more emitters want to test the emtter's life
	emitter.addEventListener(Proton.PARTICLE_DEAD, function(e) {
		if (Math.random() < .7)
			createFirstEmitter(e.particle);
		else
			createSecendEmitter(e.particle);
	});
}

function createFirstEmitter(particle) {
	var subemitter = new Proton.Emitter();
	subemitter.rate = new Proton.Rate(new Proton.Span(250, 300), 1);
	subemitter.addInitialize(new Proton.Mass(1));
	subemitter.addInitialize(new Proton.Radius(1, 2));
	subemitter.addInitialize(new Proton.Life(1, 3));
	subemitter.addInitialize(new Proton.V(new Proton.Span(2, 4), new Proton.Span(0, 360), 'polar'));
	subemitter.addBehaviour(new Proton.RandomDrift(10, 10, .05));
	subemitter.addBehaviour(new Proton.Alpha(1, 0));
	subemitter.addBehaviour(new Proton.Gravity(3));
	var color = Math.random() > .3 ? Proton.MathUtils.randomColor() : 'random';
	subemitter.addBehaviour(new Proton.Color(color));
	subemitter.p.x = particle.p.x;
	subemitter.p.y = particle.p.y;
	subemitter.emit('once', true);
	proton.addEmitter(subemitter);
}

function createSecendEmitter(particle) {
	var subemitter = new Proton.Emitter();
	subemitter.rate = new Proton.Rate(new Proton.Span(100, 120), 1);
	subemitter.addInitialize(new Proton.Mass(1));
	subemitter.addInitialize(new Proton.Radius(4, 8));
	subemitter.addInitialize(new Proton.Life(1, 2));
	subemitter.addInitialize(new Proton.V([1, 2], new Proton.Span(0, 360), 'polar'));
	subemitter.addBehaviour(new Proton.Alpha(1, 0));
	subemitter.addBehaviour(new Proton.Scale(1, .1));
	subemitter.addBehaviour(new Proton.Gravity(1));
	var color = Proton.MathUtils.randomColor();
	subemitter.addBehaviour(new Proton.Color(color));
	subemitter.p.x = particle.p.x;
	subemitter.p.y = particle.p.y;
	subemitter.emit('once', true);
	proton.addEmitter(subemitter);
}

function tick() {
	requestAnimationFrame(tick);
	proton.update();
}
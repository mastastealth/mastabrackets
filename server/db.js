Meteor.publish('Players', function() {
	return Players.find({});
});

Meteor.publish('Matches', function() {
	return Matches.find({});
});

Meteor.publish('Matchups', function() {
	return Matchups.find({});
});

Meteor.publish('Signup', function() {
	return Signup.find({});
});
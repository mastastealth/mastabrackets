Meteor.publish('Players', function() {
	return Players.find({});
});

Meteor.publish('Matches', function() {
	return Matches.find({});
});
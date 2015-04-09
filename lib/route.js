// Default template
Router.route('/', function() {
	this.render('index');
});

Router.route('/signup', function () {
	this.render('signup');
});
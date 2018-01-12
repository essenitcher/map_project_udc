(function () {

	// represents a single place item
	var Point = function (title, location) {
		this.title = ko.observable(title);
		this.location = ko.observable(location);
	};

	
	// our main view model
	var ViewModel = function (points) {
		// map array of passed in points to an observableArray of Point objects
		this.points = ko.observableArray(points.map(function (point) {
			return new Point(point.title, point.location);
		}));
	}
	
	var items = [
          {title: 'Casa de Mauro', location: {lat: -34.520204, lng: -58.486014}},
          {title: 'Casa de Cesar y Luis', location: {lat: -34.525064, lng: -58.485940}},
          {title: 'Estación VTe lopez', location: {lat: -34.524057, lng: -58.473375}}
        ];
	
	// bind a new instance of our view model to the page
	var viewModel = new ViewModel(items);
	ko.applyBindings(viewModel);

	
}());

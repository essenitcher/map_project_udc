function initView(){

	var self;
	
	// represents a single place item
	var Point = function (title, location, placeId) {
		this.title = title;
		this.location = location;
		this.placeId = placeId;
		this.marker;
	};

	
	//icons
	var icon = {
		path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
		scale: 5,
		strokeWeight:2,
		strokeColor:"#B40404"
	};


	var iconBigSelected = {
		path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
		scale: 8,
		strokeWeight:8,
		strokeColor:"#0000FF"
	};		
	
	var map2 = null;
	
	
	// main view model
	var ViewModel = function (points) {
		
		self = this;
		
		//Window with extra information about the place
		this.largeInfowindow = new google.maps.InfoWindow();
		
		// map array of passed in points to an observableArray of Point objects
		this.points = ko.observableArray(points.map(function (point) {
			return new Point(point.title, point.location, point.placeId);
		}));
		
		//input used for filtering
		this.filterText = ko.observable();
		
		//Bounds of the  map
		this.bounds = new google.maps.LatLngBounds();
		this.bounds.extend({lat: -34.6113641, lng: -58.4721043});

		//displays the markers on the map
		this.displayMarkers = function(newPoints){
			var extended = false;
			
			//hide all markeres
			for (var i = 0; i < this.points().length; i++) {
				//The first time there are no markers, so gotta check for undefined
				if(this.points()[i].marker !== undefined){
					this.points()[i].marker.setMap(null);
				}
			}				
			
			this.bounds = new google.maps.LatLngBounds();
			//iterate the list of filtered points and make them visible
			for (var j = 0; j < newPoints.length; j++) {
				if(newPoints[j].marker !== undefined){
					newPoints[j].marker.setMap(this.map);
					this.bounds.extend(newPoints[j].marker.position);
					extended = true;
				}
			}
			if(extended){
				this.map.fitBounds(this.bounds);
			}
			
		};		
		
		
		//declare the filtered list which will refresh automatically
		this.filteredPoints = ko.computed(() => {
			if (!this.filterText()) {
				// No input found, return all places
				this.displayMarkers(this.points());
				return this.points();
			} else {
				// input found, match keyword to filter
				var newPoints = ko.utils.arrayFilter(this.points(), (point) => {
					return point.title.toLowerCase().indexOf(self.filterText().toLowerCase()) !== -1;
				});
				//display the markers on the map
				this.displayMarkers(newPoints);
				return newPoints;
			} //.conditional
		}); //.filteredPoints 
		

		//the map
		this.map = new google.maps.Map(document.getElementById('map'), {
			center: {lat: -34.6113641, lng: -58.4721043},
			zoom: 12,
			mapTypeControl: false
		});		
		
		//add window resizing listener to the map
		google.maps.event.addDomListener(window, 'resize', function() {
			self.map.fitBounds(self.bounds);
		});
		
		//Function that create all markers
		this.createMarkers = function(){
			// The following group uses the location array to create an array of markers on initialize.
			for (var i = 0; i < this.points().length; i++) {
				this.createMarker(i);
			}
			//Display them
			this.displayMarkers(this.filteredPoints());
		}; // end createmarkers
		
		//Creates a single marker
		this.createMarker = function(pos){
			// Get the position from the location array.
			var position = this.points()[pos].location;
			var title = this.points()[pos].title;
			// Create a marker per location, and put into markers array.
			var marker = new google.maps.Marker({
				position: position,
				title: title,
				animation: google.maps.Animation.DROP,
				icon: icon,
				id: pos
				});
			
			//add the marker to the Point
			this.points()[pos].marker = marker;
			
			// Create an onclick event to open the large infowindow at each marker.
			marker.addListener('click', function() {
				this.setIcon(iconBigSelected);
				self.populateInfoWindow(this, self.largeInfowindow);
			});
		
		}
		
		//Click on location on the list
		this.clickLocation = function(){
			//Populate the infowindow
			self.populateInfoWindow(this.marker, self.largeInfowindow);
		};
		
		
		this.resetIcons = function(){
			//iterate the list of points and reset its icon
			for (var i = 0; i < this.points().length; i++) {		
				this.points()[i].marker.setIcon(icon);
				this.points()[i].marker.setAnimation(null);
			}			
			
		};
		
		// This function populates the infowindow when the marker is clicked. We'll only allow
		// one infowindow which will open at the marker that is clicked, and populate based
		// on that markers position.
		this.populateInfoWindow = function(marker, infowindow) {
			//prevents that all icons remain selected
			self.resetIcons();
			//set the selected icon for this location
			marker.setIcon(iconBigSelected);	
			marker.setAnimation(google.maps.Animation.BOUNCE);
				
			// Check to make sure the infowindow is not already opened on this marker.
			if (infowindow.marker != marker) {
				// Clear the infowindow content to give the streetview time to load.
				infowindow.setContent('');
				infowindow.marker = marker;

				// Make sure the marker property is cleared if the infowindow is closed.
				infowindow.addListener('closeclick', function() {
					infowindow.marker = null;
					marker.setIcon(icon);
					marker.setAnimation(null);
				});

				//Get the lat long from the marker
				var latitude=marker.getPosition().lat();               
				var longitude=marker.getPosition().lng();
							
				//Call foursquare api to get close places
				$.ajax({
					type: "GET",
					dataType: "jsonp",
					cache: false,
					url: 'https://api.foursquare.com/v2/venues/explore?ll='+latitude+','+longitude+'&v=20170801&categoryId=4d4b7105d754a06374d81259' + '&limit=5&client_id=2H4LW0YJSQFPWTH5AAAOCFEOKUZX5XI51VJXGNG1I5D4YYBX&client_secret=IMQDW4C3FGF0NQPUS3GA4AOUCMXOF5U4C0P5N23N2PQICAST',
					success: function(result){
						var content = '<h2>' + marker.title + '</h2>';
						if (result.meta.code === 200){
							content += '<p>Places to eat nearby</p>';
							content += '<ul>';
							//Create the infowindow with information about the places nearby to eat
							for(var i = 0; i < result.response.groups[0].items.length; i++){
								var place = result.response.groups[0].items[i].venue;
								content += '<li>'+ place.name + ", " + place.location.address;
								if(place.contact.phone !== undefined){
									content += ", " + place.contact.phone;
								}
								content += '</li>';
							}
							content += '</ul>';
						}else{
							//IF the place has no reviews, show it
							content += '<p>No places found</p>';							
						}
						infowindow.setContent(content);
						infowindow.open(map,marker);
					},
					error: function(){
						//In case of error just open the window with the name of the place
						var content = '<h2>' + marker.title + '</h2>';
						content += '<p>No places found</p>';	
						infowindow.setContent(content);
						infowindow.open(map,marker);						
					}
				});
					
				
			}
		};	
	};
	
	var items = [
		{title: 'CCK', location: {lat: -34.6036589, lng: -58.369497}, placeId : 'ChIJAYdZgzI1o5URUlEv3u3nFP8'},
		{title: 'Obelisco', location: {lat: -34.6037389, lng: -58.3815703}, placeId : 'ChIJ217apvCpSgARi1VOI06tvhE'},
		{title: 'Estación Vte Lopez', location: {lat: -34.524057, lng: -58.473375}, placeId : 'ChIJU-jLFq22vJURL4QAOy0Lefc'},
		{title: 'Casa Rosada', location: {lat: -34.608056, lng: -58.3702782}, placeId : 'ChIJdW8nviw1o5URbfhFBe8haeE'},
		{title: 'Planetario Galileo Galilei', location: {lat: -34.5696763, lng: -58.4116258}, placeId : 'ChIJRVL9dXS1vJUR10Mxdc3T714'}, 
		{title: 'Jardin Japones', location: {lat: -34.5762987, lng: -58.4094975}, placeId : 'ChIJx8VHQXq1vJURH4ffL_cLk_w'},
		{title: 'Estadio Monumental', location: {lat: -34.5453062, lng: -58.4497749}, placeId : 'ChIJ340B5jq0vJURijD6W6dgfz0'},
		{title: 'Cementerio de la Recoleta', location: {lat: -34.5874834, lng: -58.3934409}, placeId : 'ChIJs5EH8aLKvJURw6UX3MYKGKE'},
		{title: 'Floraris Genérica', location: {lat: -34.5816857, lng: -58.3939298}, placeId : 'ChIJyT6XBKDKvJUR_V_s-F1pU_8'},  
		{title: 'Quinta Presidencial', location: {lat: -34.5172516, lng: -58.4872399}, placeId : 'ChIJQcwlFjixvJURmXmnzaN1bbk'},
		{title: 'Congreso de La Nación', location: {lat: -34.6098208, lng: -58.3926061}, placeId : 'ChIJA5WFzcLKvJURRrnyrvraXAc'},
		{title: 'Parque Centenario', location: {lat: -34.6067198, lng: -58.4357797}, placeId : 'ChIJYeuUiWjKvJURbqivfQrfVdA'}
		];



	// bind a new instance of our view model to the page
	var viewModel = new ViewModel(items);
	viewModel.createMarkers();
		
	ko.applyBindings(viewModel);

}


function errorOnMap(){
	alert("Error loading Map");
}

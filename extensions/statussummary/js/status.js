/*
 Licensed Materials - Property of IBM
 status.js
 © Copyright IBM Corporation 2014

U.S. Government Users Restricted Rights:  Use, duplication or disclosure restricted by GSA ADP Schedule Contract with IBM Corp. 
*/

// a reference to the module.

function clearDisplay() {
	d3.select("svg").remove();
	d3.selectAll(".label").remove();
	d3.select(".simpleBarChart").html("");			
}

RM.Event.subscribe(RM.Event.ARTIFACT_OPENED, function(ref) {
	checkFormatAndProceed(ref);
});

d3.select("#pickModuleOrCollection").on("click", function() {
	RM.Client.showArtifactPicker(function(result) {
		if (result.code === RM.OperationResult.OPERATION_OK) {
			var refs = result.data;
			if (refs.length === 1) {
				checkFormatAndProceed(refs[0]);
			}
		}
	});
});

function checkFormatAndProceed(ref) {
	RM.Data.getAttributes(ref, [RM.Data.Attributes.NAME, RM.Data.Attributes.FORMAT], function(opResult) {
		if (opResult.code === RM.OperationResult.OPERATION_OK) {
			var attrs = opResult.data[0];
			if (attrs.values[RM.Data.Attributes.FORMAT] === RM.Data.Formats.MODULE
				||	attrs.values[RM.Data.Attributes.FORMAT] === RM.Data.Formats.COLLECTION) {
				clearDisplay();
				getStatusAndDrawGraph(ref, attrs.values[RM.Data.Attributes.NAME]);
			} else {
				// should probably clear out the display here.
				clearDisplay();
			}
		}
	});
}

function getStatusAndDrawGraph(moduleOrCollectionRef, name) {
	// Read the value of "Status" for all artifacts in the module identified
	// by moduleOrCollectionRef.
	
	d3.select(".title").html("Status of objects in "+name+" (bar chart)");
	d3.select(".pieTitle").html("Status of objects in "+name+" (pie chart)");
	
	// we could use any enumerated attribute here in place of Status
	RM.Data.getContentsAttributes(moduleOrCollectionRef, "Status", function(opResult) {

		var map = {}, // an object of the form {"Approved": 15}
		dataset = [];
		// an array of objects of form { name: "Approved", value: 15}
		// to pass to the graph drawing function.

		if (opResult.code === RM.OperationResult.OPERATION_OK) {

			// the operation was a success so process each row (ArtifactAttributes)
			opResult.data.forEach(function(aa) {

				var status = aa.values["Status"];
				if (status) {
					// increment the current count for the object tracking this value
					var val = map[status];
					if (!val) {
						// first time we found a status with this value...
						val = {
							name : status,
							value : 1
						};
						map[status] = val;
					} else {
						val.value = val.value + 1;
					}
				}
			});

			for (var prop in map) {
				if (map.hasOwnProperty(prop)) {
					dataset.push(map[prop]);
				}
			}

			graphStatusBar(dataset);
			graphStatusPie(dataset);
		}
	});
}



function graphStatusBar(dataset) {

	var maxOutputRange = 400, // the highest number permitted to be
							  // returned by our scale function, tweak to
							  // change the width of the bar chart.
		barChart,
		scale = d3.scale.linear().domain([0, d3.max(dataset, function(e) {
			return e.value;
		})])// input "domain" is range of possible input values
		.range([0, maxOutputRange]);
		// output "range" is range of possible output values.

	// Make our bar chart as wide as the widest possible bar given our scale function
	maxOutputRange = 500, // the highest number permitted to be returned by our scale function
	barChart,
		scale = d3.scale.linear()
				.domain([0, d3.max(dataset, function(e) {
					return e.value;
				})]) // input "domain" is range of possible input values
				.range([0, maxOutputRange]); // output "range" is range of possible output values.


	// Make our bar chart as wide as the widest possible bar given our scale function
	barChart = d3.select(".simpleBarChart");
	barChart.style("height", maxOutputRange+"px"); 

	function createBars() {
		// this code creates an empty div for each entry in the data set
		// these will be the bars in the chart.
		barChart.selectAll("div")
			.data(dataset)
			.enter()
		    .append("div")
			.attr("class", function(d) {
				return "bar "+d.name.replace(" ", "-");
			})
			.attr("title", function(d) {
				return d.name + ": "+ d.value;
			})
			.style("height", function(d) {
				// the width of the bar is the datset value
				// scaled by our function.
	       		return scale(d.value)+ "px";
	     	});
	     	
	}
	
	function createYAxisTicks() {
		// this function creates the X axis ticks
		barChart.selectAll(".marker")
	    	.data(scale.ticks(15)) // get 15 ticks in the range of our scale function
	  		.enter()
	  		.append("span") // make a new span for each tick
	  		.attr("class", "marker") // class it up
	    	.text(function(tick) {
	    		return tick; // the text
	    	})
	    	.style("top", function(tick) {
	    		return (maxOutputRange - scale(tick) - this.offsetHeight/2)+"px"; // position the thing absolutely relative to the left edge
	    	});
	    	
	}
	
	function createLabels() {
		d3.select(".labels")
			.selectAll(".label")
			.data(dataset)
			.enter()
			.append("span")
			.attr("class", "label")
			.text(function(d) {
				return d.name;
			})
	}
		
	
	createBars();
	createYAxisTicks();
	createLabels();

}

function graphStatusPie(dataset) {
	var w = 500, //width
		h = 500, //height
		r = 200, //radius
		color = d3.scale.category20c();
		//builtin range of colors

	var data = dataset;

	var vis = d3.select("body").append("svg:svg")//create the SVG element inside the <body>
		.data([data])//associate our data with the document
		.attr("width", w)//set the width and height of our visualization (these will be attributes of the <svg> tag
		.attr("height", h).append("svg:g")//make a group to hold our pie chart
		.attr("transform", "translate(" + r + "," + r + ")")//move the center of the pie chart from 0, 0 to radius, radius

	var arc = d3.svg.arc()//this will create <path> elements for us using arc data
		.outerRadius(r);

	var pie = d3.layout.pie()//this will create arc data for us given a list of values
		.value(function(d) {
			return d.value;
		});
	//we must tell it out to access the value of each element in our data array

	var arcs = vis.selectAll("g.slice")//this selects all <g> elements with class slice (there aren't any yet)
		.data(pie)//associate the generated pie data (an array of arcs, each having startAngle, endAngle and value properties)
		.enter()//this will create <g> elements for every "extra" data element that should be associated with a selection. The result is creating a <g> for every object in the data array
		.append("svg:g")//create a group to hold each slice (we will have a <path> and a <text> element associated with each slice)
		.attr("class", function(d) {
			return "slice "+d.data.name.replace(" ", "-");
		});
		//allow us to style things in the slices (like text)

	arcs.append("svg:path")
	.attr("d", arc);
	//this creates the actual SVG path using the associated data (pie) with the arc drawing function

	arcs.append("svg:text")//add a label to each slice
	.attr("transform", function(d) {//set the label's origin to the center of the arc
		//we have to make sure to set these before calling arc.centroid
		d.innerRadius = 0;
		d.outerRadius = r;
		return "translate(" + arc.centroid(d) + ")";
		//this gives us a pair of coordinates like [50, 50]
	}).attr("text-anchor", "middle")//center the text on it's origin
		.text(function(d, i) {
			return data[i].name; //get the label from our original data array
	});
	

}

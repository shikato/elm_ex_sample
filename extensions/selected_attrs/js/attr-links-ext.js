/*
 Licensed Materials - Property of IBM
 attr-links-exp.js
 © Copyright IBM Corporation 2013

U.S. Government Users Restricted Rights:  Use, duplication or disclosure restricted by GSA ADP Schedule Contract with IBM Corp. 
*/

// On selecting an artifact, display all well known attributes and links on it table form.


/* Main Operating Function */

$(function() {
	// this function is run when the document is ready.
	
	RM.Event.subscribe(RM.Event.ARTIFACT_SELECTED, function(selected) {
		if (selected.length == 1) {
			// If a single artifact has been selected, retrieve and display the
			// attribute and link information for it.
			fetchAttributes(selected[0]);
			fetchLinks(selected[0]);
		} else {
			// Otherwise, clear our display.
			$("#attributes").empty();
			$("#links").empty();
		}		
	});
	
});

/* Primary Attribute and Link Display Functionality */

function fetchAttributes(/*RM.ArtifactRef*/ attrRef) {
	// Summary: Fetches all well know attributes of the artifact and displays
	// the values in table form.
	RM.Data.getAttributes(attrRef, function(attrResult) {
		if (attrResult.code != RM.OperationResult.OPERATION_OK){
			return;
		}
		// Clear the existing content and prepare a new table for displaying the
		// attribute information.
		$("#attributes").empty();
		
		var table = makeNamedTable("attrTable");
		var headingClass = "titleRow";
		addTableRows(["Attribute", "Value"], table, [headingClass, headingClass]);
		
		// Build up a list of all the attributes we have information on for the artifact.
		var attrs = attrResult.data[0];
		var keys = [];
		for (var key in attrs.values){
			keys.push(key);
		}
		
		RM.Data.getValueRange(attrRef, keys, function (valResult) {
			// Retrieve the value range for attributes so that opaque reference
			// objects can be identified and further queried to extract
			// information suitable for display for them.
			if (valResult.code != RM.OperationResult.OPERATION_OK){
				return;
			}
			for (var i = 0; i < keys.length; i++) {
				// Get and display the information for each attribute in turn.
				var key = valResult.data[i].attributeKey;
				
				var name = getPrintableWellKnownAttribute(key);

				getValue(table, valResult.data[i], attrs, name);
			}

			// Add the table we have constructed to the attributes section of the gadget.
			$("#attributes").append(table);
		});
	});
};

function fetchLinks(/*RM.ArtifactRef*/ref) {
	// Summary: Fetches all links on the artifact and displays their targets in
	// table form, showing identifiers for well known link types.
	RM.Data.getLinkedArtifacts(ref, [], function(linksResult) {
		if (linksResult.code != RM.OperationResult.OPERATION_OK){
			return;
		}
		// Clear the existing content and prepare a new table for displaying the
		// links information.
		$("#links").empty();
		
		// Skip displaying a table if the artifact had no internal or external links.
		if (linksResult.data.artifactLinks.length == 0 && linksResult.data.externalLinks.length == 0) {
			return;
		}

		var table = makeNamedTable("linkTable");
		var headingClass = "titleRow";
		addTableRows(["Link Type", "Target"], table, [headingClass, headingClass]);
		
		// Build up a list of all the artifacts that are linked to by our artifact.  It may link to 
		// the same artifact more than once with different link types, so we want to avoid 
		// duplication when fetching further information about the RM.ArtifactRef values.
		var artifactIndex = [];
		linksResult.data.artifactLinks.forEach(function(linkDefinition) {
			linkDefinition.targets.forEach(function(ref) {
				indexArtifact(artifactIndex, ref);
			});
		});
		
		RM.Data.getAttributes(artifactIndex, [RM.Data.Attributes.NAME, RM.Data.Attributes.IDENTIFIER], function(attrResult) {
			// Query the targets of the discovered links so that we can gather information 
			// about them suitable for display in the table view.
			if (attrResult.code != RM.OperationResult.OPERATION_OK){
				return;
			}
			
			linksResult.data.artifactLinks.forEach(function(linkDefinition) {
				// Display retrieved information for links to known RM artifacts.
				var linkTypeName = getPrintableWellKnownLinkType(linkDefinition.linktype);
				var targetNames = [];
				// Construct a list of display names for each target that this link type
				// links to.
				linkDefinition.targets.forEach(function(target) {
					targetNames.push(getRefName(target, attrResult.data));
				});
				// Display the link type and the display name of the first artifact it
				// link to.
				addTableRows([linkTypeName, targetNames[0]], table, ["nameCell", ""]);
				if (targetNames.length > 1) {
					// If the link type links to multiple other artifacts, show each subsequent
					// artifact on its own line, with the link type value left blank to show we 
					// are still referring to the same link type.
					for (var i = 1; i < targetNames.length; i++) {
						addTableRows(["", targetNames[i]], table, ["", ""]);
					}
				}
			});
			
			linksResult.data.externalLinks.forEach(function(linkDefinition) {
				// Display information for links to external targets.
				var linkTypeName = getPrintableWellKnownLinkType(linkDefinition.linktype);
				var targetNames = linkDefinition.targets;
				// Show links and any multiple targets the same as for internal links.
				addTableRows([linkTypeName, targetNames[0]], table, ["nameCell", ""]);
				if (targetNames.length > 1) {
					for (var i = 1; i < targetNames.length; i++) {
						addTableRows(["", targetNames[i]], table, ["", ""]);
					}
				}
			});
			
			// Add the table we have constructed to the links section of the gadget.
			$("#links").append(table);
		});
	});
};

/* Utility Functions */

function getValue(/*Element*/ table, /*RM.ValueRange*/ range, /*RM.ArtifactAttributes*/ attrs, /*String*/ name) {
	// Summary: Gets the values for returned attributes and add them to the
	// table, following opaque references to RM.ArtifactRef or RM.UserRef
	// instances to retrieve data suitable for display for them.
	
	// Get the value for the attribute we are interested in.
	var value = attrs.values[range.attributeKey];
	
	// Check if it is an opaque reference that we need to retrieve more information about.
	switch(range.valueType){
		case RM.Data.ValueTypes.USER:
			// Retrieve the name of the user for an RM.UserRef instance.
			RM.Data.getUserDetails(value, function(result){
				if (result.code != RM.OperationResult.OPERATION_OK){
					return;
				}
				addTableRows([name, result.data.name], table, ["nameCell", ""]);
			});
			break;
			
		case RM.Data.ValueTypes.ARTIFACT:
			// Retrieve the name of an artifact for an RM.ArtifactRef isntance
			RM.Data.getAttributes(value, [RM.Data.Attributes.NAME], function(result) {
				if (result.code != RM.OperationResult.OPERATION_OK){
					return;
				}
				addTableRows([name, result.data[0].values[RM.Data.Attributes.NAME]], table, ["nameCell", ""]);
			});
			break;
			
		default:
			// Otherwise display either the value we have retrieved for it, or a
			// blank entry in the table if it is an attribute the artifact had
			// no value assigned for.
			if (value == null) {
				value = "";
			}
			addTableRows([name, value], table, ["nameCell", ""]);
	}
};

function indexArtifact(/*RM.ArtifactRef[]*/ refs, /*RM.ArtifactRef*/ ref) {
	// Summary: Maintains a non-duplicating array of RM.ArtifactRef objects.
	var refPresent = false;
	for (var i = 0; i < refs.length; i++) {
		if (refs[i].equals(ref)) {
			refPresent = true;
		}
	}
	if (!refPresent) {
		refs.push(ref);
	}
};

function getRefName(/*RM.ArtifactRef*/ ref, /*RM.ArtifactAttributes*/ attrs) {
	// Summary: Constructs a suitable display name for an RM.ArtifactRef target
	// of a link, comprised of its identifier and name.
	for (var i = 0; i < attrs.length; i++) {
		if (attrs[i].ref.equals(ref)) {
			return attrs[i].values[RM.Data.Attributes.IDENTIFIER] + ":" + attrs[i].values[RM.Data.Attributes.NAME];
		}
	}
};

/* Formatting functions */

function makeNamedTable(/*String*/ name) {
	// Summary: Constructs a simple html table element with the specified id.
	var table = $("<table id=\"" + name + "\">");
	return table;
};

function addTableRows(/*String[]*/ values, /*Element*/ table, /*String[]*/ classes) {
	// Summary: Adds a table row with the specified text content to a given
	// table, applying the specified css class identifiers to the table cells.
	var rowString= "<tr>";
	
	for (var i = 0; i < values.length; i++ ) {
		rowString = rowString + "<td class=\"" + classes[i] + "\">" + values[i] + "</td>";
	}
	
	rowString = rowString + "</tr>";	
	table.append(rowString);
};

function getPrintableWellKnownLinkType(/*RM.LinkTypeDefinition||String*/ linkTypeDefinition) {
	// Summary: Gives a suitable display value for a well known RM.Data.LinkTypes constant
	// or string label.
	if (typeof linkTypeDefinition === "string") {
		return linkTypeDefinition;
	}
	
	for (var name in RM.Data.LinkTypes) {
		if (RM.Data.LinkTypes[name].equals(linkTypeDefinition)) {
			return constantToDisplayName(name);
		}
	}
	return linkTypeDefinition.ref + ":" + linkTypeDefinition.direction;
};

function getPrintableWellKnownAttribute(/*String*/ attribute) {
	// Summary: Gives a suitable display value for a well known RM.Data.Attributes constant.
	for (var name in RM.Data.Attributes) {
		if (RM.Data.Attributes[name] == attribute) {
			return constantToDisplayName(name);
		}
	}
	return attribute;
};

function constantToDisplayName(/*String*/ constantKey) {
	// Summary: Converts a constant name of the format 'CONSTANT_NAME' into the
	// the display format 'Constant Name'.
	return constantKey
				.toLowerCase()
				.replace("_", " ")
				.replace(/\b([a-z])/g, function(match) { 
					return match.toUpperCase(); 
				});
};

/*
 Licensed Materials - Property of IBM
 asil.js
 © Copyright IBM Corporation 2014

U.S. Government Users Restricted Rights:  Use, duplication or disclosure
restricted by GSA ADP Schedule Contract with IBM Corp. 
*/

////////////////////////////////////////////////////////////////
//
//
//  asil.js
//  
//  This extension provides some process guidance, helping users
//  enter the correct value for the "ASIL" attribute.
// 
//  It has the following features :
//
//  1. Responds to user selection, for selection of a single object
//     check whether the ASIL value is correct for that object.
//  2. Can correct the ASIL value of objects that have the incorrect value.
//  3. Check the entire module and produce a clickable list of objects that
//     have the wrong ASIL value.
//  4. Correct all incorrect ASIL values in the module in one go.
//  5. Respond to the save event and check whether the ASIL value for the just
//     saved row is correct.
//  
//  It should be trivial to extend this example so that it auto corrects any
//  newly added artifacts



// a reference to the module.
var moduleRef;


$(function() {
	gadgets.window.adjustHeight();
});
// Subscribe to the Artifact Selection event 
RM.Event.subscribe(RM.Event.ARTIFACT_SELECTED, function(selected) {
	if (selected.length === 1) {
		// good, the user selected one thing, fetch it's attributes
		// and figure out whether the ASIL value is correct.
		fetchAttributesAndCheckASIL(selected[0]);
	} else {
		// clear the display area...
		clearSelectedInfo();
		// inform the user that they need to select only one thing.
		$(".asilResult").html("Select one object, or click \"Check All\".");
	}		
});

RM.Event.subscribe(RM.Event.ARTIFACT_OPENED, function(ref) {
    // subscribe to the artifact opened event, and check whether
    // the format of the opened artifact is MODULE.
    RM.Data.getAttributes(ref, RM.Data.Attributes.FORMAT, checkIfModule);	
});

RM.Event.subscribe(RM.Event.ARTIFACT_SAVED, function(ref) {
	// set the selection which will trigger a selection event
	// and our ASIL checking logic.
	RM.Client.setSelection(ref);
});

function checkIfModule(opResult) {
	// Summary:
	//    This function is called in response to a getAttributes call
	//    that asked for the FORMAT of an artifact.
	//    
	//    If the artifact turns out to be a module, enable the
	//    checkModule and correctAll buttons, otherwise disable
	//    those buttons.

	if (opResult.code === RM.OperationResult.OPERATION_OK) {
	    var attrs = opResult.data[0];
	    if (attrs.values[RM.Data.Attributes.FORMAT] === RM.Data.Formats.MODULE) {
			// enable the check all button.
			$("#checkModule").removeAttr("disabled").on("click", checkASILForModule);
			$("#correctAll").removeAttr("disabled").on("click", correctASILForModule);
			// keep a reference to our module.
			moduleRef = attrs.ref;
	    } else {
	    	$("#checkModule").addAttr("disabled").off("click");
			$("#correctAll").addAttr("disabled").off("click");
	    }
	}
};

function fetchAttributesAndCheckASIL(ref) {
	// read the attributes for a single artifact, specified
	// by the argument ref.
	RM.Data.getAttributes(ref, 
		["Controllability Class", 
		 "Probability Class",
		 "Severity Class",
		 "ASIL"], function(result) {
		 	if (result.code === RM.OperationResult.OPERATION_OK) {
				// get the RM.ArtifactAttributes object from the result
				var attrs = result.data[0];
				// invoke our processASIL function with that object :
				checkASILForObject(attrs);
			}
	});
}

function checkASILForObject(artifactAttributes) {

	var severity = artifactAttributes.values["Severity Class"],
		exposure = artifactAttributes.values["Probability Class"],
		controllabilty = artifactAttributes.values["Controllability Class"],
		ASIL = artifactAttributes.values["ASIL"];
		
	clearSelectedInfo();

	if (typeof ASIL === "undefined") {
		// an attribute value of undefined means that the type system does not
		// state that the selected artifact has a value for that attribute. i.e.
		// the attribute definition does not exist for this type.
		$(".asilResult").html("Selected row does not have ASIL attribute");
	} else {

		// look up the cell in our table for what ASIL should be
		var expected = getExpectedASILValue(artifactAttributes);
		
		if (expected === ASIL) {
			$(".asilResult")
				.addClass("correct")
				.html("ASIL value is correct. "+severity +", "+exposure+", "+controllabilty+" => "+ASIL);
			// hide the "Correct" button as the value does not need to be fixed.
			$(".correctButton")
				.css("display", "none")
				.off("click");

			// light up the table cell.
			lightUpTableCell(severity, exposure, controllabilty);
		} else {
			$(".asilResult").addClass("incorrect").html("ASIL value is not correct, should be "+expected+" but is "+ASIL);
			// show as an error in the table...
			lightUpTableCell(severity, exposure, controllabilty, true);

			
			$(".correctButton").css("display", "inline").on("click", function() {
				// set the asil attribute to the correct value...
				artifactAttributes.values["ASIL"] = expected;
				RM.Data.setAttributes(artifactAttributes, function(result) {
					// then get the attributes again and verify the value is now correct...
					fetchAttributesAndCheckASIL(artifactAttributes.ref);
				});
			});
		}
	}	
};

function correctASILForModule() {

	RM.Data.getContentsAttributes(moduleRef, ["Controllability Class", 
		 "Probability Class",
		 "Severity Class",
		 "ASIL"],  function(result) {
	
		if (result.code === RM.OperationResult.OPERATION_OK) {
			var attrsToSet = [];
			result.data.forEach(function(aa) {
				if (typeof aa.values["ASIL"] !== "undefined") {
					if (aa.values["ASIL"] !== getExpectedASILValue(aa)) {
						aa.values["ASIL"] = getExpectedASILValue(aa);
						attrsToSet.push(aa);
					}
				} 
			});
			
			clearSelectedInfo();
			$(".asilResult").html("Correcting ASIL for " + attrsToSet.length + " objects");
				// now set the attributes for the incorrect objects
			RM.Data.setAttributes(attrsToSet, function(r) {
				$(".asilResult").html("Select one object, or click \"Check All\".");
			});

			
		}	 	
	});
}

function clearSelectedInfo () {
	// function to clear the UI, called
	// whenever the user makes a new selection
	// or presses the "Check Whole Module" button.
	$(".asilResult").
		removeClass("incorrect correct").
		html("");
	
	$(".selected, .error").removeClass("selected error");
	$(".correctButton").css("display", "none");
}

function lightUpTableCell(severity, exposure, controllability, error) {
	// function to light up the table cell with correct ASIL
	// value based on severity, exposure and controllability
	$("."+severity+"."+exposure+"."+controllability).addClass(error ? "error" : "selected");
}

function processASILForModule(operationResult) {
	
	// calculates the state of the ASIL for the entire module.
	// called in response to RM.Data.getContentsAttributes
	if (operationResult.code === RM.OperationResult.OPERATION_OK) {
		// if the API call was a success....
		var rows = operationResult.data,
			wrongASIL = [], // an array of strings built up to describe the rows with incorrect values
			wrongASILRefs = []; // the RM.ArtifactRef of the offending object

		// iterate over each row in the module, extracting the
		// severity, exposure, controllability and ASIL attributes.
		rows.forEach(function(row) {
			var ASIL = row.values["ASIL"],
				expected;
				
			if (typeof ASIL !== "undefined") {
				// look up the cell in our table for what ASIL should be
				expected = getExpectedASILValue(row);
			}
			
			if (expected !== ASIL) {
				// if the expected value does not match the actual value,
				// remember the ID and Name of the offending row for our report.
				wrongASIL.push(row.values[RM.Data.Attributes.IDENTIFIER] +": "+
							   row.values[RM.Data.Attributes.NAME]);
				// remember the ref as well, so we can select it.
				wrongASILRefs.push(row.ref);
			}
		});
		
		if (wrongASIL.length > 0) {
			// we had some rows with bad ASIL values, show these to the user.
			$(".asilResult").addClass("incorrect").html(
					"<p><b>There are "+wrongASIL.length+" objects with the wrong ASIL value</b></p>");
			// iterate over the incorrect ASIL array...
			wrongASIL.forEach(function(rowDescription, idx) {
				$("<p class='incorrectTitle'></p>")
					.html(rowDescription)
					.appendTo(".asilResult")
					.on("click", function() {
						// when the user clicks on this <p> we'll navigate 
						// to the row by using the setSelection method passing
						// the given ref. (Note that this will trigger the ARTIFACT_SELECTED event)
						RM.Client.setSelection(wrongASILRefs[idx]);
					});
			});

		} else {
			$(".asilResult")
				.addClass("correct")
				.html("ASIL value is correct for all objects in this module");


		}

		gadgets.window.adjustHeight();

	}
}

function checkASILForModule() {
	// get the value of the attributes :
	// Severity, Exposure Probability, Controllability, ASIL
	// Name and Identifier for each row in the module, invoke
	// the function "processASILForModule" when done.
	// 
	RM.Data.getContentsAttributes(moduleRef, 
			["Controllability Class", 
			 "Probability Class",
			 "Severity Class",
			 "ASIL",
			 RM.Data.Attributes.NAME,
			 RM.Data.Attributes.IDENTIFIER], processASILForModule);

	$(".correctButton").css("display", "none");
};

function getExpectedASILValue(artifactAttributes) {
	if (artifactAttributes.values["Severity Class"] == "S1")
	{
		if (artifactAttributes.values["Probability Class"] == "E1")
		{
			if (artifactAttributes.values["Controllability Class"] == "C1")
			{
				return "QM"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C2")
			{
				return "QM"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C3")
			{
				return "QM"
			}
			else
			{
				return "UNDETERMINED"
			}
		}
		else if (artifactAttributes.values["Probability Class"] == "E2")
		{
			if (artifactAttributes.values["Controllability Class"] == "C1")
			{
				return "QM"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C2")
			{
				return "QM"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C3")
			{
				return "QM"
			}
			else
			{
				return "UNDETERMINED"
			}
		}
		else if (artifactAttributes.values["Probability Class"] == "E3")
		{
			if (artifactAttributes.values["Controllability Class"] == "C1")
			{
				return "QM"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C2")
			{
				return "QM"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C3")
			{
				return "A"
			}
			else
			{
				return "UNDETERMINED"
			}
		}
		else if (artifactAttributes.values["Probability Class"] == "E4")
		{
			if (artifactAttributes.values["Controllability Class"] == "C1")
			{
				return "QM"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C2")
			{
				return "A"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C3")
			{
				return "B"
			}
			else
			{
				return "UNDETERMINED"
			}
		}
		else
		{
			return "UNDETERMINED"
		}
	}
	// S2
	else if (artifactAttributes.values["Severity Class"] == "S2")
	{
		if (artifactAttributes.values["Probability Class"] == "E1")
		{
			if (artifactAttributes.values["Controllability Class"] == "C1")
			{
				return "QM"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C2")
			{
				return "QM"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C3")
			{
				return "QM"
			}
			else
			{
				return "UNDETERMINED"
			}
		}
		else if (artifactAttributes.values["Probability Class"] == "E2")
		{
			if (artifactAttributes.values["Controllability Class"] == "C1")
			{
				return "QM"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C2")
			{
				return "QM"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C3")
			{
				return "A"
			}
			else
			{
				return "UNDETERMINED"
			}
		}
		else if (artifactAttributes.values["Probability Class"] == "E3")
		{
			if (artifactAttributes.values["Controllability Class"] == "C1")
			{
				return "QM"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C2")
			{
				return "A"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C3")
			{
				return "B"
			}
			else
			{
				return "UNDETERMINED"
			}
		}
		else if (artifactAttributes.values["Probability Class"] == "E4")
		{
			if (artifactAttributes.values["Controllability Class"] == "C1")
			{
				return "A"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C2")
			{
				return "B"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C3")
			{
				return "C"
			}
			else
			{
				return "UNDETERMINED"
			}
		}
		else
		{
			return "UNDETERMINED"
		}
	}
	//S3
	else if (artifactAttributes.values["Severity Class"] == "S3")
	{
		if (artifactAttributes.values["Probability Class"] == "E1")
		{
			if (artifactAttributes.values["Controllability Class"] == "C1")
			{
				return "QM"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C2")
			{
				return "QM"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C3")
			{
				return "A"
			}
			else
			{
				return "UNDETERMINED"
			}
		}
		else if (artifactAttributes.values["Probability Class"] == "E2")
		{
			if (artifactAttributes.values["Controllability Class"] == "C1")
			{
				return "QM"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C2")
			{
				return "A"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C3")
			{
				return "B"
			}
			else
			{
				return "UNDETERMINED"
			}
		}
		else if (artifactAttributes.values["Probability Class"] == "E3")
		{
			if (artifactAttributes.values["Controllability Class"] == "C1")
			{
				return "A"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C2")
			{
				return "B"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C3")
			{
				return "C"
			}
			else
			{
				return "UNDETERMINED"
			}
		}
		else if (artifactAttributes.values["Probability Class"] == "E4")
		{
			if (artifactAttributes.values["Controllability Class"] == "C1")
			{
				return "B"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C2")
			{
				return "C"
			}
			else if (artifactAttributes.values["Controllability Class"] == "C3")
			{
				return "D"
			}
			else
			{
				return "UNDETERMINED"
			}
		}
		else
		{
			return "UNDETERMINED"
		}
	}
	//N/A
	else if (artifactAttributes.values["Probability Class"] == "N/A" && artifactAttributes.values["Severity Class"] == "N/A" && artifactAttributes.values["Controllability Class"] == "N/A")
	{
		return "N/A"
	}
	//if one value is not set to a specific value or N/A
	else
	{
		return "UNDETERMINED"
	}
}





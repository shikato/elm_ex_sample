//function checkIfModule(opResult) {
//	// Summary:
//	//    This function is called in response to a getAttributes call
//	//    that asked for the FORMAT of an artifact.
//	//    
//	//    If the artifact turns out to be a module, enable the
//	//    checkModule and correctAll buttons, otherwise disable
//	//    those buttons.
//
//	if (opResult.code === RM.OperationResult.OPERATION_OK) {
//	    var attrs = opResult.data[0];
//	    if (attrs.values[RM.Data.Attributes.FORMAT] === RM.Data.Formats.MODULE) {
//			// enable the check all button.
//			$("#checkModule").removeAttr("disabled").on("click", checkASILForModule);
//			$("#correctAll").removeAttr("disabled").on("click", correctASILForModule);
//			// keep a reference to our module.
//			moduleRef = attrs.ref;
//	    } else {
//	    	$("#checkModule").addAttr("disabled").off("click");
//			$("#correctAll").addAttr("disabled").off("click");
//	    }
//	}
//};




var selected;
RM.Event.subscribe(RM.Event.ARTIFACT_SELECTED, function(selected) {
  console.log("selected artifact_");
  console.log("selected", selected);

	RM.Data.getAttributes(selected[0], 
		["A", "C", "D",
		 "B"], function(result) {
		 	if (result.code === RM.OperationResult.OPERATION_OK) {
        console.log("result__", result);
				// get the RM.ArtifactAttributes object from the result
				var attrs = result.data[0];
				// invoke our processASIL function with that object :
        console.log("attrs__", attrs);

        var id = attrs.values["ID"];
        attrs.values["D"] = 
          Number(attrs.values["A"] + attrs.values["B"] + attrs.values["C"]);
        console.log("D=", attrs.values["D"]);

        selected = attrs;

//        RM.Data.setAttributes(selected, function(r) {
//          console.log("save result when select", r);
//        });
      }
	});

//	if (selected.length === 1) {
//	} else {
//		// clear the display area...
//		clearSelectedInfo();
//		// inform the user that they need to select only one thing.
//		$(".asilResult").html("Select one object, or click \"Check All\".");
//	}		
});

$(function() {
  console.log("set click event");
  $("#calcBtn").on("click", () => {
    console.log("on click!");

    RM.Data.setAttributes(selected, function(r) {
      console.log("save result when click", r);
    });
  });
});

RM.Event.subscribe(RM.Event.ARTIFACT_OPENED, function(ref) {
  console.log("opened artifact");
  console.log("ref", ref);


//	RM.Data.getAttributes(ref, 
//		["ID", 
//		 "Contents"], function(result) {
//		 	if (result.code === RM.OperationResult.OPERATION_OK) {
//        console.log("result", result);
//				// get the RM.ArtifactAttributes object from the result
//				var attrs = result.data[0];
//				// invoke our processASIL function with that object :
//        console.log("attrs", attrs);
//			}
//	});
    // subscribe to the artifact opened event, and check whether
    // the format of the opened artifact is MODULE.
//    RM.Data.getAttributes(ref, RM.Data.Attributes.FORMAT, checkIfModule);	
});

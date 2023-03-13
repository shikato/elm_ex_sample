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



$(function() {
	gadgets.window.adjustHeight();
});


RM.Event.subscribe(RM.Event.ARTIFACT_SELECTED, function(selected) {
  console.log("selected artifact");
//	if (selected.length === 1) {
//	} else {
//		// clear the display area...
//		clearSelectedInfo();
//		// inform the user that they need to select only one thing.
//		$(".asilResult").html("Select one object, or click \"Check All\".");
//	}		
});

RM.Event.subscribe(RM.Event.ARTIFACT_OPENED, function(ref) {
  console.log("opened artifact");
    // subscribe to the artifact opened event, and check whether
    // the format of the opened artifact is MODULE.
//    RM.Data.getAttributes(ref, RM.Data.Attributes.FORMAT, checkIfModule);	
});

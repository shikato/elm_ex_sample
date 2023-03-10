/*
 Licensed Materials - Property of IBM
 import-repair.js
 © Copyright IBM Corporation 2014

U.S. Government Users Restricted Rights:  Use, duplication or disclosure restricted by GSA ADP Schedule 
Contract with IBM Corp. 
*/

/* Given an imported module, from Excel for instance, with a flat hierarchy but a per-artifact attribute
 * that indicates depth restructure the module to restore the pre-import hierarchy
 */

/* Helper function for simple output */

function println(string) {
	var p = document.createElement("p");
	p.innerHTML = string;
	$(p).appendTo("#result");
};

/* Recursive function to iterate over each entry in the module in order, moving them to their appropriate
 * depth and then moving on.  It tracks the last node it has seen at each depth it encounters, down to
 * the depth it is currently at.  This allows it to preserve the order of the entries in the module.
 * 
 * When it goes down a level in the hierarchy it moves the entry to be a child of its preceding parent.  In
 * Any other case it moves the entry to be a sibling of the previous node at that depth level.  Having done
 * this, it updates the last entry seen at that level to be the entry it just moved to that level, and
 * repeats the process until all entries are processed.
 */

function processSequence(nodeList, previousNode, referenceTracker, depthAttr, currentDepth, count) {
	if (nodeList[count]) {
		var strategy;
		var currentNode = nodeList[count];
		count++
		// Determine depth change
		var newDepth = parseInt(currentNode.values[depthAttr]);
		
		if (newDepth) {
			// Determine tracker assignments		
			// Determine move operation
			if (newDepth === currentDepth + 1) {
				// Dropping down a level of indentation
				referenceTracker[newDepth] = currentNode;
				strategy = new RM.LocationSpecification(previousNode.ref, RM.Data.PlacementStrategy.BELOW);
				currentDepth = newDepth;
			} else if (newDepth > currentDepth) {
				// We do not expect the module to jump from e.g. Depth 1 to Depth 4, as this is not consistent
				// with the structure allowed in Modules.
				println("Invalid depth change detected, terminating repair process.");
				return;
			} else if (newDepth === currentDepth) {
				// Continuing at the same level
				referenceTracker[currentDepth] = currentNode;
				strategy = new RM.LocationSpecification(previousNode.ref, RM.Data.PlacementStrategy.AFTER);
			} else if (newDepth < currentDepth) {
				// Stepping back up one or more levels of indentation
				strategy = new RM.LocationSpecification(referenceTracker[newDepth].ref, 
						RM.Data.PlacementStrategy.AFTER);
				referenceTracker[newDepth] = currentNode;
				currentDepth = newDepth;
			}

			// Perform the move operation
			RM.Data.Module.moveArtifact(currentNode.ref, strategy, function(result) {
				if (result.code === RM.OperationResult.OPERATION_OK) {				
					// The function calls itself from within its own body so that it can both wait for the
					// RM.Data.Module.moveArtifact call to complete and be able handle an arbitrary number
					// of moves.  
					// The call has to wait until the move has been completed or the server might not be up
					// to date indexing and further calls to make moves could cause errors from the inconsistency.
					processSequence(nodeList, currentNode, referenceTracker, depthAttr, currentDepth, count);
				} else {
					// Error reporting
					$("#result").css({"border-color": "red"});
					println("Unable to complete move, terminating repair process.");
				}
			});
		} else {
			$("#result").css({"border-color": "red"});
			println("Unable to read value for depth attribute, terminating repair process: " + depthAttr);
		}
	} else {
		// Show completion message
		$("#result").css({"border-color": "green"});
		println("Repairs complete.");
	}
};

/* Kick-off function for the recursive move function call */

function repairModule(aa, attr) {
	println("Beginning repair process ...");
	
	var tracker = {};
	tracker[1] = aa[0];
	
	processSequence(aa, aa[0], tracker, attr, 1, 1);
};

/* Main Operating Function */

$(function() {
	// this function is run when the document is ready.
	var currentArtifact;
	
	var targetAttr = "DepthVal";
	
	$("#repairDocument").on("click", function() {
		// Allow the user to input an attribute to search for depth on, or use the gadget's default.
		var attrInput = $("#attrInput").val();
		if (attrInput) {
			targetAttr = attrInput;
		}
		
		$("#result").empty();
		$("#result").css({"display": "block", "border-color": "black"});
		println("Attribute being used for depth repair: " + targetAttr);
		
		RM.Client.getCurrentArtifact(function(response) {
			if (response.code === RM.OperationResult.OPERATION_OK) {
				if (response.data.values[RM.Data.Attributes.FORMAT] === "Module") {
					RM.Data.getContentsAttributes(response.data.ref, targetAttr, 
							function(attrResponse) {
						if (attrResponse.code === RM.OperationResult.OPERATION_OK) {
							repairModule(attrResponse.data, targetAttr);
						}
					});
				} else {
					println("Repair function only works on Modules, not on a: " + 
							response.data.values[RM.Data.Attributes.FORMAT]);
				}
			} else {
				println("Unable to determine current artifact. " + response.message);
			}
		});
	});
	
});
var _selected;

// Artifactが選択されると呼ばれる
RM.Event.subscribe(RM.Event.ARTIFACT_SELECTED, function(selected) {
  console.log("selected", selected);

  // 選択したArtifactから指定した属性値の値を読み込む
  RM.Data.getAttributes(selected[0], 
    ["A", "C", "D", "B"], function(result) {
      if (result.code === RM.OperationResult.OPERATION_OK) {
        console.log("getting attr result", result);
        // get the RM.ArtifactAttributes object from the result
        var attrs = result.data[0];
        // invoke our processASIL function with that object :
        console.log("attrs", attrs);

        var id = attrs.values["ID"];
        attrs.values["D"] = 
          Number(attrs.values["A"] + attrs.values["B"] + attrs.values["C"]);
        console.log("D=", attrs.values["D"]);

        // 変数上で更新した属性値はボタン押下時に使うためグローバル変数に格納
        _selected = attrs;
      }
  });
});

$(function() {
  console.log("set click event");
  // #calcBtnボタンにクリックイベントを定義
  $("#calcBtn").on("click", () => {
    console.log("on click #calcBtn");

    // #calcBtnボタンが押下されたら属性値を更新 
    RM.Data.setAttributes(_selected, function(r) {
      console.log("setting attr result when click", r);
    });
  });
});

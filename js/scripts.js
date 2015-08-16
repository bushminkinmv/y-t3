$("document").ready(function(){
	v = new Visualizer();
	v.init();
	v.setEQ('classic');
	$("#f").change( function(){
	    var files = this.files;
	    var file = URL.createObjectURL(files[0]); 
	    v.start(files[0]);
		$(".track-name").html("<div class='track-name-align'>" + files[0].name + "</div>");

		ID3.loadTags(files[0].name, function () {
			tags = ID3.getAllTags(files[0].name);
			title = tags.title || "Unknown title";
			artist = tags.artist || "Unknown artist";
			album = tags.album || "Unknown album";
			
			
		}, {
    dataReader: FileAPIReader(files[0])
});
	});

	$(".upload-button").click(function () {
		$("#f").click();
	});

	$(".play-button").click(function () {
		v.play();	
	});

	$(".stop-button").click(function () {
		v.stop();
	});
	
	$(".eq").click(function () {
		v.setEQ($(this).text());
	});
});
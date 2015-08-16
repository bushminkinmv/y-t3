var Visualizer = function() {
    this.file = null; 
    this.fileName = null; 
    this.audioContext = null;
    this.source = null; 
    this.animationId = null;
    this.status = 0; 
    this.forceStop = false;
    this.allCapsReachBottom = false;
    this.audioBufferSouceNode = null;
	this.eq = null;
};



Visualizer.prototype = {
    init: function() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
        window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
        window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.msCancelAnimationFrame;
        try {
            ctx = this.audioContext = new AudioContext();
        } catch (e) {
            // Your browser does not support AudioContext
            console.log(e);
        }
		var frequencies = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
		this.eq = frequencies.map(function (frequency) {
		  var filter = ctx.createBiquadFilter();
			 
		  filter.type = 'peaking';
		  filter.frequency.value = frequency;
		  filter.Q.value = 1;
		  filter.gain.value = 0;

		  return filter;
		});

		this.eq.reduce(function (prev, curr) {
			prev.connect(curr);
			return curr;
		});
    },
    start: function(file) {
        this.file = file;
        //read and decode the file into audio array buffer 
        var fr = new FileReader(),
            that = this;
        fr.onload = function(e) {
            var fileResult = e.target.result;
            var audioContext = that.audioContext;
            if (audioContext === null) {
                return;
            };
            // Decoding the audio
            audioContext.decodeAudioData(fileResult, function(buffer) {
                // Decode succussfully,start the visualizer
                that._visualize(audioContext, buffer);
            }, function(e) {
                // Fail to decode the file
                console.log(e);
            });
        };
        fr.onerror = function(e) {
            // !Fail to read the file
            console.log(e);
        };
        //assign the file to the reader
        // Starting read the file
        fr.readAsArrayBuffer(this.file);
    },
    play: function() {
        if(this.file != null)
            this.start(this.file);
    },
    stop: function() {
		if(this.source != null)
			this.source.stop();
    },
	setEQ: function(type) {
		gains = [];
		switch(type)
		{
			case 'rock':
				gains = [2, 1, 2, 3, 3, 4, 3, 2, 1, 1];
				break;
			case 'pop':
				gains = [5, 4, 3, 2, 1, 2, 3, 3, 4, 5];
				break;
			case 'classic':
				gains = [2, 2, 1, 0, 0, -0.5, -1, -1.5, -2, -3];
				break;
			case 'normal':
				gains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
				break;
			case 'jazz':
				gains = [0, -1, 0, 1, 1.5, 2, 2.5, 3.5, 3, 2.5];
				break;
		}
		
		for(i = 0; i < gains.length; i++)
			this.eq[i].gain.value = gains[i];
	},
    _visualize: function(audioContext, buffer) {
        var audioBufferSouceNode = audioContext.createBufferSource(),
            analyser = audioContext.createAnalyser(),
            that = this;
        //connect the source to the analyser
		audioBufferSouceNode.connect(this.eq[0]);
		// а последний фильтр - к выходу
		this.eq[this.eq.length - 1].connect(analyser);
        //connect the analyser to the destination(the speaker), or we won't hear the sound
        analyser.connect(audioContext.destination);
        //then assign the buffer to the buffer source node
        audioBufferSouceNode.buffer = buffer;
        //play the source
        if (!audioBufferSouceNode.start) {
            audioBufferSouceNode.start = audioBufferSouceNode.noteOn //in old browsers use noteOn method
            audioBufferSouceNode.stop = audioBufferSouceNode.noteOff //in old browsers use noteOff method
        };
        //stop the previous sound if any
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.source !== null) {
            this.source.stop(0);
        }
        audioBufferSouceNode.start(0);
        this.status = 1;
        this.source = audioBufferSouceNode;
        audioBufferSouceNode.onended = function() {
            that._audioEnd(that);
        };
        // Playing 
        this._drawSpectrum(analyser);
    },
    _drawSpectrum: function(analyser) {
        var that = this,
            canvas = document.getElementById('spectrum'),
            cwidth = canvas.width,
            cheight = canvas.height - 2,
            meterWidth = 10, //width of the meters in the spectrum
            gap = 2, //gap between meters
            capHeight = 2,
            capStyle = '#fff',
            meterNum = 100 / (10 + 2), //count of the meters
            capYPositionArray = []; ////store the vertical position of hte caps for the preivous frame
        ctx = canvas.getContext('2d'),
        gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(1, '#0f0');
        gradient.addColorStop(0.5, '#ff0');
        gradient.addColorStop(0, '#f00');
        var drawMeter = function() {
            var array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            if (that.status === 0) {
                //fix when some sounds end the value still not back to zero
                for (var i = array.length - 1; i >= 0; i--) {
                    array[i] = 0;
                };
                allCapsReachBottom = true;
                for (var i = capYPositionArray.length - 1; i >= 0; i--) {
                    allCapsReachBottom = allCapsReachBottom && (capYPositionArray[i] === 0);
                };
                if (allCapsReachBottom) {
                    cancelAnimationFrame(that.animationId); //since the sound is stoped and animation finished, stop the requestAnimation to prevent potential memory leak,THIS IS VERY IMPORTANT!
                    return;
                };
            };
            var step = Math.round(array.length / meterNum); //sample limited data from the total array
            ctx.clearRect(0, 0, cwidth, cheight);
            for (var i = 0; i < meterNum; i++) {
                var value = array[i * step];
                if (capYPositionArray.length < Math.round(meterNum)) {
                    capYPositionArray.push(value);
                };
                ctx.fillStyle = capStyle;
                //draw the cap, with transition effect
                if (value < capYPositionArray[i]) {
                    ctx.fillRect(i * 12, cheight - (--capYPositionArray[i]), meterWidth, capHeight);
                } else {
                    ctx.fillRect(i * 12, cheight - value, meterWidth, capHeight);
                    capYPositionArray[i] = value;
                };
                ctx.fillStyle = gradient; //set the filllStyle to gradient for a better look
                ctx.fillRect(i * 12 /*meterWidth+gap*/ , cheight - value + capHeight, meterWidth, cheight); //the meter
            }
            that.animationId = requestAnimationFrame(drawMeter);
        }
        this.animationId = requestAnimationFrame(drawMeter);
    },
    _audioEnd: function(instance) {
        if (this.forceStop) {
            this.forceStop = false;
            this.status = 1;
            return;
        };
        this.status = 0;
    }
};
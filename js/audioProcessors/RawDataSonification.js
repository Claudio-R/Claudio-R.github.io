class RawDataSonification {

    /**
     * At the end, we will have the complete grain buffer
     * @param {*} numChannels 
     * @param {*} parameters 
     */
    constructor(multiChannelInputBuffer, parameters) {

        this.state = "idle";

        this.parameters = parameters;
        this.numChannels = multiChannelInputBuffer.numberOfChannels;
        
        this.outputWindow = document.querySelector('.output-window-content');
        this.outputWindow.innerHTML = "RAW DATA SONIFICATION<br/>";
        this.outputWindow.innerHTML += "Generating Grains...";

        this.createGrains().then((config) => {
            this.renderGrains(config).then((singleChannelGrainBuffer) => {         
                this.getMultiChannelGrainBuffer(singleChannelGrainBuffer).then((multiChannelGrainBuffer) => {
                    this.multiChannelGrainBuffer = multiChannelGrainBuffer;
                    this.process(multiChannelInputBuffer).then((multiChannelOutputBuffer) => {
                        console.log(multiChannelOutputBuffer);
                        this.sonifiedSignals = multiChannelOutputBuffer;
                        this.play();
                    });
                });
            });
        });
    }

    /**
     * Synthetize the grains
     * @param {*} numChannels 
     * @param {*} parameters 
     * @returns 
     */
    createGrains() {
        return new Promise((resolve) => {

            var offlineCtx = new OfflineAudioContext(1, this.numChannels * this.parameters.Duration * 48000, 48000);

            var oscillators = [];
            var envNodes = []

            for(var i = 0; i < this.numChannels; i++) {
                let oscillator = offlineCtx.createOscillator();
                let frequency = Math.floor(this.parameters.Frequency * (i + 1) + Math.random() * this.parameters.Detune * this.parameters.Frequency)
                oscillator.frequency.value = frequency;
                
                this.outputWindow.innerHTML += "<br/>Grain " + i + ": FREQUENCY: " + frequency;
                
                oscillator.type = 'sine';

                let envNode = offlineCtx.createGain();
                envNode.gain.value = 0;
                oscillator.connect(envNode);
                envNode.connect(offlineCtx.destination);
            
                oscillators.push(oscillator);
                envNodes.push(envNode);
            }

            const config = {
                "offlineCtx": offlineCtx,
                "oscillators": oscillators,
                "envNodes": envNodes,
            };

            return resolve(config);
        });
    }

    createPanningArray(num_channels) {
        switch(num_channels) {
            case 1:
                return [0];
            case 2:
                return [-1, 1];
            case 3:
                return [-1, 0, 1];
            case 4:
                return [-1, -0.5, 0.5, 1];
            case 5:
                return [-1, -0.5, 0, 0.5, 1];
            case 6:
                return [-1, -0.5, -0.25, 0.25, 0.5, 1];
        }
    }

    /**
     * Render the grains on a single channel buffer
     * @param {*} config configuration object definiing the grains
     * @returns 
     */
    renderGrains(config) {
        return new Promise((resolve, reject) => {
            
            const offlineCtx = config.offlineCtx;
            var startTime = Number(offlineCtx.currentTime);
            var duration = this.parameters.Duration;

            function waitForGrain(grainIndex) {
                return new Promise((resolve, reject) => {
                    if(grainIndex < config.oscillators.length) {
                        var start = startTime + (grainIndex * duration);
                        var end = start + duration;
                        config.oscillators[grainIndex].start(start);
                        config.envNodes[grainIndex].gain.setValueCurveAtTime(new Float32Array([0, 1, 0.5, 0]), start, duration);
                        config.oscillators[grainIndex].stop(end);                        
                        resolve(waitForGrain(grainIndex + 1));
                    } else {
                        offlineCtx.startRendering().then((singleChannelGrainBuffer) => {
                            resolve(singleChannelGrainBuffer);
                        });
                    }
                });
            }

            waitForGrain(0).then((singleChannelGrainBuffer) => {
                resolve(singleChannelGrainBuffer);
            });
        });
    }

    /**
     * Split the rendered array into a multiChannelBuffer
     * @param {*} renderedBuffer single channel buffer containing the rendered grains
     * @param {*} parameters 
     * @returns 
     */
    getMultiChannelGrainBuffer(singleChannelGrainBuffer) {
        return new Promise((resolve) => {
            var audioContext = new AudioContext();
            var multiChannelGrainBuffer = audioContext.createBuffer(this.numChannels, this.parameters.Duration * audioContext.sampleRate, audioContext.sampleRate);
            for(var i = 0; i < this.numChannels; i++) {
                var channelBuffer = multiChannelGrainBuffer.getChannelData(i);
                var startIndex = i * this.parameters.Duration * audioContext.sampleRate;
                for(var j = 0; j < channelBuffer.length; j++) {
                    channelBuffer[j] = singleChannelGrainBuffer.getChannelData(0)[startIndex + j];
                }
            }
            resolve(multiChannelGrainBuffer);
        })
    }

    /**
     * Once the grains are created and stored in a multiChannelBuffer, they can be used to create an output buffer
     * which will be played by the audio context.
     * @param {*} audioContext 
     * @param {*} multiChannelInputBuffer multiChannelBuffer containing the signals to be processed, actually this could also be a 2D array
     * @param {*} parameters dictionary containing the parameters of the synthesis
     */
    process(multiChannelInputBuffer) {
        return new Promise((resolve) => {

            /** By principle, we can  use grains of different sizes passing a grainDuration parameter, but for now we assume the same duration for each grain */
            const audioContext = new AudioContext();
            const duration = 15;

            // Define the minimum length which allow the buffer to be played at audio rate for the whole desired duration
            const N_ar = audioContext.sampleRate * duration; 
            const overSamplingFactor = Math.round(N_ar / multiChannelInputBuffer.getChannelData(0).length);
            // Define the minimum length to contain the data
            const N_data = multiChannelInputBuffer.getChannelData(0).length * overSamplingFactor + this.multiChannelGrainBuffer.getChannelData(0).length - overSamplingFactor;
            
            const outputBufferLength = Math.max(N_ar, N_data)
            
            var outputNumberOfChannels = multiChannelInputBuffer.numberOfChannels;

            const multiChannelOutputBuffer = audioContext.createBuffer(outputNumberOfChannels, outputBufferLength, audioContext.sampleRate);
            
            for(let channelNum = 0; channelNum < multiChannelInputBuffer.numberOfChannels; channelNum++) {
                
                let channelBuffer = multiChannelInputBuffer.getChannelData(channelNum);
                let grainBuffer = this.multiChannelGrainBuffer.getChannelData(channelNum);
                let outputBuffer = multiChannelOutputBuffer.getChannelData(channelNum);
                
                for(let i = 0; i < channelBuffer.length; i++) {
                    // if the value is not zero, we can add the grain, otherwise we just copy the data
                    if(channelBuffer[i] > 0) {
                        let grainStartIndex = i * overSamplingFactor;
                        let grainEndIndex = grainStartIndex + grainBuffer.length;

                        for(let j = grainStartIndex; j < grainEndIndex; j++) {
                            outputBuffer[j] += grainBuffer[j - grainStartIndex];
                        }
                    } else {
                        for(let j = 0; j < overSamplingFactor; j++) {
                            outputBuffer[j + i * overSamplingFactor] += 0;
                        }
                    }
                }  
                
                // Normalize the output buffer
                let maxValue = 1;
                for(let i = 0; i < outputBuffer.length; i++) {
                    if(outputBuffer[i] > maxValue) {
                        maxValue = outputBuffer[i];
                    }
                }
                console.log("Normalization factor: " + 1.0 / maxValue);
                for(let i = 0; i < outputBuffer.length; i++) {
                    outputBuffer[i] = outputBuffer[i] * (1 / maxValue);
                }
            }

            this.outputWindow.innerHTML += "<br/>Sonification Completed!";
            resolve(multiChannelOutputBuffer);

        });
    }

    play(buffer) {
        
        if(this.state === "playing") {
            this.stop();
        }
        this.state = "playing";

        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        
        if(!buffer) { 
            buffer = this.sonifiedSignals;
        }
        
        const panningArray = this.createPanningArray(buffer.numberOfChannels);
        for (let i = 0; i < buffer.numberOfChannels; i++) {
            
            let singleChannelBuffer = this.audioCtx.createBuffer(1, buffer.length, this.audioCtx.sampleRate);
            singleChannelBuffer.getChannelData(0).set(buffer.getChannelData(i));
            
            let source = this.audioCtx.createBufferSource();
            source.buffer = singleChannelBuffer;

            let gainNode = this.audioCtx.createGain();
            gainNode.gain.value = this.parameters.Gain;
            
            let pannerNode = this.audioCtx.createStereoPanner();
            pannerNode.pan.value = panningArray[i];
            
            source.connect(gainNode);
            gainNode.connect(pannerNode);
            pannerNode.connect(this.audioCtx.destination);
            
            source.start(0);
            source.stop(0 + buffer.duration);
        }

        this.launchTimeCursor(buffer.duration)
    }

    launchTimeCursor(bufferDuration) {

        const duration = bufferDuration - this.multiChannelGrainBuffer.duration;

        var cursor_samples = 10000
        var cursor_sampleRate = cursor_samples/duration
        var cursor_samplingPeriod = 1/cursor_sampleRate

        var igv_column = document.querySelector(".igv-column")
        var timeCursor = document.createElement("div")
        timeCursor.classList.add("time-cursor")

        igv_column.appendChild(timeCursor)
        
        timeCursor.style.left = "0%"

        function moveCursor(i) {
            setTimeout(() => {
                timeCursor.style.left = `${i/cursor_samples * 100}%`
            }, i * cursor_samplingPeriod * 1000)
        }

        for (var i = 0; i < cursor_samples; i++) {
            moveCursor(i)
        }

        setTimeout(() => {
            timeCursor.remove()
            this.state = "idle"
        }, bufferDuration * 1000)

        // return(timeCursor)
    }

    stop() {
        document.querySelector(".time-cursor").remove()
        this.audioCtx.close();
    }
}

export default RawDataSonification;
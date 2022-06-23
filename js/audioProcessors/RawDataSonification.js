class RawDataSonification {

    constructor(signals, config) {
        this.state = "idle";

        this.outputWindow = document.querySelector('.output-window-content');
        this.outputWindow.innerHTML = "RAW DATA SONIFICATION<br/>";

        var input_buffer = this.configureProcessor(signals, config);
        this.outputWindow.innerHTML += "Configuration Completed<br/>";

        this.outputWindow.innerHTML += "Generating Grains...";
        this.createGrains().then((args) => {
            this.listen(args[0]); /** The grains are presented to the listener */
            this.grainDuration = args[1];
            this.deserialize(args[0], args[1]).then((multiChannelGrainsBuffer) => {
                this.process(input_buffer, multiChannelGrainsBuffer).then((processedBuffer) => {
                    this.sonifiedSignals = processedBuffer;
                });
            });
        });
    }

    /**
     * This function is used to collect the binary data and configure the processor.
     * @param signals a reference to a 2D array containing the whole dataset
     * @param config a JSON object containing the names of the signal to sonify, the region of interest and the parameters
     * @returns an audio buffer with the correct binary data
     */
    configureProcessor(signals, config) {
        var signals_names = config.signals;
        /** due to a mismatch in dimension, the locus retrieved by the browser must be divided by 1000 */
        var startIndex = config.locus[0]/1000;
        var endIndex = config.locus[1]/1000;

        var num_channels = signals_names.length;
        var buffer_length = endIndex - startIndex;
        var sample_rate = 48000;
        var offlineCtx = new OfflineAudioContext(num_channels, buffer_length, sample_rate);
        var input_buffer = offlineCtx.createBuffer(num_channels, buffer_length, offlineCtx.sampleRate);

        for(let j = 0; j < signals_names.length; j++) {
            var name = signals_names[j];
            var channel_data = input_buffer.getChannelData(j);
            for(var i = 0; i < signals.length; i++) {
                if(signals[i]["name"] === name) {
                    var trimmed_signal = signals[i]["binary_data"].slice(startIndex, endIndex)
                    for(var k = 0; k < trimmed_signal.length; k++) {
                        channel_data[k] = trimmed_signal[k];
                    }
                }
            }
        }

        this.parameters = config.params;
        this.numChannels = num_channels;

        return input_buffer;
    }

    /**
     * This function partizions the stereo space, according to the width defined by the user.
     * @param w the width of the stereo space  
     * @returns an array of panning values
     */
    createPanningArray(w) {
        var pan_array = [];
        if(this.numChannels == 1){
            pan_array.push(0);
        }
        else {
            const step = 2*w / (this.numChannels - 1);
            for(let i = 0; i < this.numChannels; i++) {
                let pan = -w + i * step;
                pan_array.push(pan);
            }
        }
        console.log(pan_array);
        return pan_array;
    }
    
    /**
     * @returns a promise that resolves to a single-channel buffer containing the rendered grains
     * This function is called by the constructor. It is useful to allow the user to listen to the grains before they are processed.
     */
    createGrains() {
        return new Promise((resolve, reject) => {

            /** Compute amplitude compensation according to a_weighting */
            function a_weighting(frequency) {
                //return Math.pow(frequency, 3) / (Math.pow(frequency, 3) + Math.pow(20.6, 3) + 1.07 * 20.6 * Math.pow(frequency, 2) + 1.07 * Math.pow(20.6, 2) * frequency + 1.07 * Math.pow(20.6, 2) * Math.pow(frequency, 2));
                var k =  3.5041384e16;
                var c1 = 424.31867740601;
                var c2 = 11589.093052022;
                var c3 = 544440.67046057;
                var c4 = 148698928.24309;
        
                var f_square = frequency * frequency;
                var m1 = Math.pow(f_square, 4);
                var n1 = Math.pow(f_square + c1, 2);
                var n2 = c2 + f_square;
                var n3 = c3 + f_square;
                var n4 = Math.pow(f_square + c4, 2);
                var attenuation_squared = k * m1 / (n1 * n2 * n3 * n4);
                var gain = 1/Math.sqrt(attenuation_squared);
                return gain;
            }
            
            const root = this.parameters.Frequency;
            const detune = this.parameters.Detune;
            const attack = this.parameters.Attack;
            const release = this.parameters.Release;
            const sustain = this.parameters.Sustain;
            const decay = this.parameters.Decay;
            const stereo_width = this.parameters["Stereo Width"];
            const gain0 = this.parameters.Gain;

            const duration = attack + sustain + decay + 5*release;
            const pan_array = this.createPanningArray(stereo_width);

            const num_channels = this.numChannels;
            const num_samples = num_channels * duration * 48000;
            const sample_rate = 48000;

            /** 
             * An offline Audio Context is needed in order to store the grains into a buffer.
             * Modify here to make a multi-channel buffer. Also, modify the startTime parameter.
             */
            const offlineCtx = new OfflineAudioContext(2, num_samples, sample_rate);
            
            /** We can generate one grain at a time because all of these are promises and return immediately */
            function createGrain(index) {
                const outputWindow = document.querySelector('.output-window-content');
                return new Promise((resolve) => {
                    if(index < num_channels) {
                        
                        /** change this also to create a multi-channel buffer */
                        //let startTime = 0;
                        let startTime = index * duration; 
                        let endTime = startTime + duration;

                        /** Create the nodes */
                        let oscNode = offlineCtx.createOscillator();
                        let envNode = offlineCtx.createGain();
                        let gainNode = offlineCtx.createGain();
                        let panNode = offlineCtx.createStereoPanner();
                        
                        /** Create harmonic frequencies and allow for detuning */
                        let frequency = Math.floor(root * (index + 1) + Math.random() * detune * root)
                        oscNode.frequency.value = frequency;
                        
                        /** Create the envelope */
                        envNode.gain.setValueAtTime(0, startTime);
                        envNode.gain.setTargetAtTime(1, startTime, attack);
                        envNode.gain.setTargetAtTime(sustain, startTime + attack, decay);
                        envNode.gain.setTargetAtTime(0, startTime + attack + decay + sustain, release);
                        
                        /** Use an amplitude compensation mechanism */
                        // gainNode.gain.value = Math.pow((root / frequency), 0.3333);
                        /** modified empirically */
                        let gain = gain0 * 0.01 * frequency * a_weighting(frequency);
                        gainNode.gain.value = gain;

                        /** Set panning */
                        panNode.pan.value = pan_array[index];

                        /** Connect the nodes */
                        oscNode.connect(envNode);
                        envNode.connect(gainNode);
                        gainNode.connect(panNode);
                        panNode.connect(offlineCtx.destination);
                        //gainNode.connect(offlineCtx.destination);

                        outputWindow.innerHTML += "<br/>### Grain " + index + " ###";
                        outputWindow.innerHTML += "<br/>Frequency: " + frequency;
                        outputWindow.innerHTML += "<br/>Gain: " + gain.toFixed(2);
                        outputWindow.innerHTML += "<br/>Pan: " + pan_array[index].toFixed(2);

                        /** Set start and stop times for the grains*/
                        oscNode.start(startTime);
                        oscNode.stop(endTime);
                        resolve(createGrain(index + 1));

                    } else {
                        offlineCtx.startRendering().then((singleChannelGrainBuffer) => {
                            resolve(singleChannelGrainBuffer);
                        });
                    }
                });
            }

            createGrain(0).then((singleChannelGrainBuffer) => {
                this.outputWindow.innerHTML += "<br/>### Processing... ###";
                resolve([singleChannelGrainBuffer, duration]);
            });
        });
    }

    /**
     * Apply multichannel expansion to a single-channel buffer.
     * @param {*} grainsBuffer storing the grains in series
     * @param {*} duration is used to determine the number of channels and the length of the buffer
     * @returns a promise that resolves to a multi-channel buffer
     */
    deserialize(grainsBuffer, duration) {

        return new Promise((resolve, reject) => {

            const sample_rate = grainsBuffer.sampleRate;
            const num_samples = duration * sample_rate;
            const num_channels = Math.round(grainsBuffer.length / num_samples);

            const offlineCtx = new OfflineAudioContext(num_channels, num_samples, sample_rate);
            
            /** Add to get a mono signal */
            const leftChannel = grainsBuffer.getChannelData(0);
            const rightChannel = grainsBuffer.getChannelData(1);
            const monoChannel = new Float32Array(grainsBuffer.length);
            for(let i = 0; i < grainsBuffer.length; i++) {
                monoChannel[i] = (leftChannel[i] + rightChannel[i]);
            }
            
            const multi_channel_buffer = offlineCtx.createBuffer(num_channels, num_samples, sample_rate);

            /** Split the buffer into a multichannel buffer, where each channel is dedicated to a grain */
            for(let i = 0; i < num_channels; i++) {
                var startIndex = i * duration * sample_rate;
                var endIndex = startIndex + duration * sample_rate;
                multi_channel_buffer.copyToChannel(monoChannel.slice(startIndex, endIndex), i);
            }

            resolve(multi_channel_buffer);

        });
    }

    /**
     * Process the input signals using the grains synthesized before.
     * @param {*} signals is an AudioBuffer containing the signals to be processed, actually this could also be a 2D array.
     * @param {*} grains is an AudioBuffer containing the grains to use for the processing.
     */
    process(signals, grains) {
        return new Promise((resolve) => {

            /** The overall sonification duration is fixed, but could be set by the user in a master control */
            const sonification_duration = 15;

            const sample_rate = grains.sampleRate;
            const minimum_num_samples = sonification_duration * sample_rate;
            
            const signals_length = signals.length;
            
            /** To allow for a proper playback, upsampling may be necessary */
            let resampling_factor;
            (minimum_num_samples > signals_length) ? resampling_factor = Math.round(minimum_num_samples / signals_length) : resampling_factor = 1;
    
            /** Simply, consider the worst case that the last bit is a 1 */
            const num_samples = (signals_length - 1) * resampling_factor + grains.length;
            const num_channels = grains.numberOfChannels;

            /** Create the output audio buffer */
            const offlineCtx = new OfflineAudioContext(num_channels, num_samples, sample_rate);
            let outputBuffer = offlineCtx.createBuffer(num_channels, num_samples, sample_rate);

            /** Fill in the output buffer */
            for(let channel_num = 0; channel_num < num_channels; channel_num++) {
                
                let signal = signals.getChannelData(channel_num);
                let grain = grains.getChannelData(channel_num);
                let output = outputBuffer.getChannelData(channel_num);
                
                for(let j = 0; j < signals_length; j++) {
                    /** Add a grain each time the signal gives 1 */
                    if(signal[j] == 1) {
                        grain.forEach((element, index) => {
                            output[j * resampling_factor + index] += element;
                        });
                    } else {
                        for(let k = 0; k < resampling_factor; k++) {
                            output[j * resampling_factor + k] += 0;
                        }
                    }
                }  
                
                /** Normalize the output to avoid distortio due to too many overlapping grains */
                let maxValue = 1;
                output.forEach((element) => {
                    if(element > maxValue) {
                        maxValue = element;
                    }
                });
                output.forEach((element, index) => {
                    output[index] = element / maxValue;
                });
            }
            
            this.outputWindow.innerHTML += "<br/>Sonification Completed!<br/>Press 'Play' to hear the result.";
            resolve(outputBuffer);

        });
    }

    /** 
     * Helper function to listen to the intermediate products.
     * !This is not used in the final version, since panning does not work well with multiple channels.
     * @param {*} audioBuffer to listen to.
     */
    listen(audioBuffer) {
        return new Promise((resolve) => {
            console.log(audioBuffer);
            var audioContext = new AudioContext();
            var source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();
            resolve();
        });
    }
    
    /**
     * The main function to play the sonification. 
     * It takes any multiple-channel audio buffer as input and applies the correct panning.
     * @param {*} buffer is the input audio buffer to play.
     */
    play(buffer) {
        
        if(this.state === "playing") {
            this.stop();
        }
        this.state = "playing";

        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        
        if(!buffer) { 
            buffer = this.sonifiedSignals;
        }
        
        const stereo_width = this.parameters["Stereo Width"];

        const pan_array = this.createPanningArray(stereo_width);
        console.log(pan_array);

        for (let i = 0; i < buffer.numberOfChannels; i++) {
            
            let singleChannelBuffer = this.audioCtx.createBuffer(1, buffer.length, this.audioCtx.sampleRate);
            singleChannelBuffer.getChannelData(0).set(buffer.getChannelData(i));
            
            let source = this.audioCtx.createBufferSource();
            source.buffer = singleChannelBuffer;
            let gainNode = this.audioCtx.createGain();
            gainNode.gain.value = this.parameters.Gain;
            
            let pannerNode = this.audioCtx.createStereoPanner();
            pannerNode.pan.value = pan_array[i];
            
            source.connect(pannerNode);
            pannerNode.connect(this.audioCtx.destination);
            
            source.start(0);
            source.stop(0 + buffer.duration);
        }

        this.launchTimeCursor(buffer.duration)
    }

    /**
     * This function is used to instantiate a time cursor.
     * It would be better to move this to a separate class.
     * @param {*} bufferDuration is the duration of the buffer to be played, used to define the cursor speed.
     */
    launchTimeCursor(bufferDuration) {

        const duration = bufferDuration - this.grainDuration;

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
    }

    /**
     * This function is used to stop the sonification.
     */
    stop() {
        let cursorOn = document.querySelectorAll(".time-cursor")
        for (let i = 0; i < cursorOn.length; i++) {
            cursorOn[i].setAttribute("style", "border-left-color: transparent")
        } 
        this.audioCtx.close().then(() => {
            this.state = "idle"
        });
    }
}

export default RawDataSonification;
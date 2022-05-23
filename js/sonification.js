import RawDataSonification from './audioProcessors/RawDataSonification.js';
import mySonifications from './resources/mySonifications.js';
import epigenomes from './resources/epigenomes.js';

export class Sonification {

    constructor(browser) {

        this.browser = browser
        this.chr = this.browser.referenceFrameList[0]['chr']
        
        for(let epigenome of epigenomes) {
            if(epigenome["chr"] === this.chr) {
                this.signals = epigenome["histones"]
                break;
            }
        }

        for(let sonification of mySonifications) {
            if(sonification["chr"] === this.chr) {
                this.sonifications = sonification["sonifications"]
                break;
            }
        }

        this.createView()

        // this.loadTracks().then(() => {
        //     console.log("Tracks loaded")
        // })
        
        console.log(this.signals)
        console.log(this.sonifications)

        this.cache = {}

    }

    /** Load tracks with respect to the selected chromosome */
    loadTracks() {
        return new Promise((resolve, reject) => {
            var colors = ["#ee3333", "#33ee33", "#3333ee", "#eeee33", "#33eeee", "#ee33ee"];
            for(var i = 0; i < this.signals.length; i++) {
                var signal = this.signals[i]
                console.log(signal["url_track"])
                this.browser.loadTrack({
                    url: signal["url_track"],
                    name: signal["name"],
                    autoHeight: true,
                    color: colors[i],
                    displayMode: "COLLAPSED"
                })
            }
            resolve()
        })
    }

    createView() {

        this.$sonification_container = document.createElement("div");
        this.$sonification_container.classList.add("sonification-container");

        this.$igv_div = document.getElementById("igv-main");
        // this.$igv_div = document.querySelector(".row");
        this.$igv_div.appendChild(this.$sonification_container);
        this.$igv_div.addEventListener('change', (e) => { 
            if(e.target.getAttribute("name") === "chromosome-select-widget") {
                this.chromosomeChanged() 
            }
        });

        let topContainer = document.createElement("div");
        let bottomContainer = document.createElement("div");
        this.$sonification_container.appendChild(topContainer);
        this.$sonification_container.appendChild(bottomContainer);

        topContainer.classList.add("sonification-top-container");
        for(var i = 0; i < this.signals.length; i++) {
            var column = document.createElement("div");
            column.classList.add("signal-box");
            topContainer.appendChild(column);

            var label = document.createElement("div");
            label.classList.add("signal-label");
            label.innerHTML = this.signals[i]["name"];
            column.appendChild(label);

            var checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.classList.add("signal-checkbox");
            checkbox.id = this.signals[i]["name"];
            column.appendChild(checkbox);
        }

        bottomContainer.classList.add("sonification-bottom-container");
        
        let leftContainer = document.createElement("div");
        leftContainer.classList.add("sonification-left-container");

        let rightContainer = document.createElement("div");
        rightContainer.classList.add("sonification-right-container");

        bottomContainer.appendChild(leftContainer);
        bottomContainer.appendChild(rightContainer);

        for(let sonification of this.sonifications) {

            var type = sonification["type"]
            var formatted_name = sonification["formatted_name"];

            var sonification_column = document.createElement("div")
            sonification_column.classList.add("sonification-column")
            sonification_column.setAttribute("id", `${formatted_name}-column`)
            leftContainer.appendChild(sonification_column);

            var btn = document.createElement("button")
            btn.classList.add("sonification-button");
            btn.setAttribute("id", `${formatted_name}-btn`);
            if(formatted_name != "raw-data-sonification") {
                btn.setAttribute("disabled", "disabled");
            }
            btn.innerHTML = type;
            btn.onclick = (e) => {
                var checkboxes = document.getElementsByClassName("signal-checkbox");
                var selected_signals_names = [];
                for(var i = 0; i < checkboxes.length; i++) {
                    if(checkboxes[i].checked) {
                        selected_signals_names.push(checkboxes[i].id);
                    }
                }
                var selected_btn = e.target
                var sonificationConfig = {
                    "formatted_name": selected_btn.id.slice(0, -4),
                    "signals_names": selected_signals_names,
                    "locus": [this.browser.referenceFrameList[0]['start'], this.browser.referenceFrameList[0]['end']],
                    "params": sonification["init_params"],
                }
                this.configureSonification(sonificationConfig)
            };

            sonification_column.appendChild(btn)

            var sonification_controller = document.createElement("div")
            sonification_controller.classList.add("sonification-controller")
            sonification_controller.setAttribute("id", `${formatted_name}-controller`)
            this.createController(sonification_controller, formatted_name, sonification["init_params"])
            sonification_column.appendChild(sonification_controller)
            
        }

        var outputWindow = document.createElement("div");
        outputWindow.classList.add("output-window");
        rightContainer.appendChild(outputWindow);

        var outputWindowTitle = document.createElement("div");
        outputWindowTitle.classList.add("output-window-title");
        outputWindowTitle.innerHTML = "POST WINDOW";
        outputWindow.appendChild(outputWindowTitle);

        var outputWindowContent = document.createElement("div");
        outputWindowContent.classList.add("output-window-content");
        outputWindow.appendChild(outputWindowContent);
        this.outputWindow = outputWindowContent;

        this.outputWindow.innerHTML = "SYSTEM BOOTED<br/>SonicIGV is ready to sonify!";

    }

    createController(sonification_controller, formatted_name, params) {
        
        function sliderFactory(parentDiv, formatted_name, config) {

            var slider_name = config["name"]
            var min = config["min"]
            var max = config["max"]
            var step = config["step"]
            var value = config["value"]
    
            var slider_container = document.createElement("div");
            slider_container.classList.add("slider-container");
            parentDiv.appendChild(slider_container);
    
            var slider_label = document.createElement("label")
            slider_label.classList.add("slider-label");
            slider_label.setAttribute("id", `${formatted_name}-${slider_name}-label`)
            slider_label.innerHTML = `${slider_name}: ${value}`;
            slider_container.appendChild(slider_label)
        
            var slider = document.createElement("input");
            slider.type = "range";
            slider.classList.add("sonification-slider");
            slider.setAttribute("id", `${formatted_name}-${slider_name}-slider`);
            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = value;
    
            slider.oninput = (e) => {
                slider_label.innerHTML = `${slider_name}: ${e.target.value}`;
            }
            
            if(formatted_name != "raw-data-sonification") {
                slider.setAttribute("disabled", "disabled");
            }

            slider_container.appendChild(slider);
        }
        
        for(let param of params) {
            sliderFactory(sonification_controller, formatted_name, param);
        }
    }

    configureSonification(sonification) {

        // REQUIRED SONIFICATION
        var formatted_name = sonification["formatted_name"];
        var signals_names = sonification["signals_names"]
        var start = sonification["locus"][0] / 1000;
        var end = sonification["locus"][1] / 1000;
        var params = sonification["params"]

        if(signals_names.length === 0) {
            //console.log("No signals to play")
            this.outputWindow.innerHTML = "No signals to play";
            return
        }
        
        // RETRIEVE CURRENT CONTROL PARAMETERS FROM UI
        var params_dict = {}
        for (let param of params) {
            var param_name = param["name"]
            var slider = document.getElementById(`${formatted_name}-${param_name}-slider`)
            var value = Number(slider.value)
            params_dict[param_name] = value        
        }

        var sonificationDuration = 15;

        // CHECK IF THE SONIFICATION IS CACHED
        if(this.sonificationIsCached(formatted_name, signals_names, params_dict, sonification["locus"], sonificationDuration)) {
            // PLAY THE CACHED DATA
            //console.log("Playing cached data")
            
            this.outputWindow.innerHTML = "RAW DATA SONIFICATION<br/>Playing Cached Data...";

            this.cache[formatted_name]["processor"].play();
            return;
        }
        
        // ELSE RETRIEVE AND TRIM THE SIGNALS TO SONIFY
        var signals_toProcess = []
        for(let signal of signals_names) {
            for(var i = 0; i < this.signals.length; i++) {
                if(this.signals[i]["name"] === signal) {
                    var trimmed_signal = this.signals[i]["binary_data"].slice(start, end)
                    signals_toProcess.push(trimmed_signal)
                }
            }
        }

        this.play(formatted_name, signals_toProcess, params_dict, sonificationDuration).then((processor) => {
            this.cache[formatted_name] = {
                "signals": signals_names,
                "params": params_dict,
                "locus": sonification["locus"],
                "duration": sonificationDuration,
                "processor": processor
            }
        })
    }

    /**
     * The General idea is to load the data to process into a buffer and feed the proper audio processor
     * @param {*} formatted_name sonification formatted name
     * @param {*} signal_toProcess multi-dimensional array of data to process
     * @param {*} params_dict dictionary of control parameters
     * @param {*} duration duration of the overall sonification
     */
    play(formatted_name, signals_toProcess, params_dict, duration) {
        return new Promise((resolve, reject) => {
            // CREATE MULTI CHANNEL BUFFER
            var num_channels = signals_toProcess.length;
            var buffer_length = signals_toProcess[0].length;
            var offlineCtx = new OfflineAudioContext(num_channels, buffer_length, 48000);
            var multiChannelInputbuffer = offlineCtx.createBuffer(num_channels, buffer_length, offlineCtx.sampleRate);
            
            // LOAD THE DATA INTO THE BUFFER
            for(var i = 0; i < num_channels; i++) {
                var channel = multiChannelInputbuffer.getChannelData(i);
                for(var j = 0; j < buffer_length; j++) {
                    channel[j] = signals_toProcess[i][j]
                }
            }
                        
            // CREATE A NEW SONIFICATION INSTANCE AND STORE NEW CACHES
            resolve(new RawDataSonification(multiChannelInputbuffer, params_dict))
        })
    }

    sonificationIsCached(formatted_name, signals_names, params_dict, locus, duration) {

        function signalsAreCached(oldSignals, newSignals){
            if(oldSignals.length !== newSignals.length) {
                return false
            }
            for(var i = 0; i < oldSignals.length; i++) {
                if(oldSignals[i] !== newSignals[i]) {
                    return false
                }
            }
            return true
        }

        function paramsAreCached(oldParams, newParams) {
            for(var key in oldParams) {
                if(oldParams[key] !== newParams[key]) {
                    return false
                }
            }
            return true
        }

        var isCached = false;
        if(this.cache[formatted_name] !== undefined) {
            var cached_signals = this.cache[formatted_name]["signals"]
            var cached_params = this.cache[formatted_name]["params"]
            var cached_locus = this.cache[formatted_name]["locus"]
            var cached_duration = this.cache[formatted_name]["duration"]
            if(signalsAreCached(cached_signals, signals_names) && paramsAreCached(cached_params, params_dict) && cached_locus[0] === locus[0] && cached_locus[1] === locus[1] && cached_duration === duration) {
                isCached = true;
            }
        }

        return isCached;

    }
        
    chromosomeChanged() {
        let delay = 250;
        new Promise(resolve => setTimeout(resolve, delay)).then(() => {
            this.chr = this.browser.referenceFrameList[0]['chr']
            this.getSignals(this.epigenomes_url, this.chr).then(() => {
                this.getAvailableSonifications(this.sonifications_url).then(() => {
                    this.updateView()
                })
            })
        })
    }

    updateView() {
        if(this.signals) {
            console.log(this.chr, this.signals.length)
        }
    }

}

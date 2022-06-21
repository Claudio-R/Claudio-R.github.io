/** The RawDataSonificationProcessor is loaded */
import RawDataSonification from './audioProcessors/RawDataSonification.js';

/** The binary data and initial configuration are stored into json files and loaded */
import mySonifications from './resources/mySonifications.js';
import epigenomes from './resources/epigenomes.js';

export class Sonification {

    constructor(browser) {

        this.browser = browser
        this.chr = this.browser.referenceFrameList[0]['chr']
        this.sonification_column = this.init();
        
        this.cache = {}

    }

    /**
     * Initialize the sonification system interface
     * @returns {HTMLElement} sonification_column div element containing the sonification modules
     */
    init() {
        const sonicIGV = document.createElement("div");
        sonicIGV.classList.add("sonicIGV-container");
        const navBar = document.querySelector("nav");
        navBar.after(sonicIGV);
        const igvMain = document.querySelector("#igv-main");
        igvMain.style.width = "60%";
        sonicIGV.appendChild(igvMain);

        const sonification_column = document.createElement("div");
        sonification_column.classList.add("sonification-column");
        sonification_column.style.width = "40%";

        sonicIGV.appendChild(sonification_column);
        
        sonicIGV.addEventListener('change', (e) => {
            /** This should also take into account selection made through the "all" canvas */
            if(e.target.getAttribute("name") === "chromosome-select-widget") {
                console.log("Chromosome changed")

                new Promise(resolve => setTimeout(resolve, 250)).then(() => {
                    this.chr = this.browser.referenceFrameList[0]['chr']
                    this.loadTracks().then(() => {
                        this.createView(this.sonification_column)
                    })
                })
            }
        });

        return sonification_column;
    }

    /** 
     * Load tracks with respect to the selected chromosome (by now, only the epigenome binaries relative to chr1 are available )
     * @returns {Promise} Promise that resolves when the tracks are loaded
    */
    loadTracks() {
        return new Promise((resolve, reject) => {
            this.browser.removeAllTracks();
            if(this.chr != "chr1") {
                this.signals = undefined;
                this.sonifications = undefined;
                resolve()
            }

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

            console.log(this.signals)
            console.log(this.sonifications)
            
            var colors = ["#ee3333", "#33ee33", "#3333ee", "#eeee33", "#33eeee", "#ee33ee"];
            for(var i = 0; i < this.signals.length; i++) {
                var signal = this.signals[i]
                this.browser.loadTrack({
                    url: signal["url_track"],
                    name: signal["name"],
                    autoHeight: true,
                    color: colors[i],
                    displayMode: "COLLAPSED",
                })
            }
            resolve()
        })
    }

    createView(sonification_column) {

        if(this.signals === undefined || this.sonifications === undefined) {
            return
        }

        // DIVIDE THE SONIFICATION COLUMN INTO TWO PORTIONS
        let topContainer = document.createElement("div");
        let bottomContainer = document.createElement("div");
        sonification_column.appendChild(topContainer);
        sonification_column.appendChild(bottomContainer);

        // TOP CONTAINER CONTAINS THE LIST OF SIGNALS
        topContainer.classList.add("sonification-top-container");
        for(var i = 0; i < this.signals.length; i++) {
            var column = document.createElement("div");
            column.classList.add("signal-box");
            topContainer.appendChild(column);

            var signal_button = document.createElement("button");
            signal_button.classList.add("signal-button");
            signal_button.innerHTML = this.signals[i]["name"];
            signal_button.setAttribute("id", `${this.signals[i]["name"]}-signal-button`);
            signal_button.onclick = (e) => {
                e.target.classList.toggle("signal-button-selected");
            }
            column.appendChild(signal_button);
        }

        // BOTTOM CONTAINER IS DIVIDED INTO TWO PARTS
        bottomContainer.classList.add("sonification-bottom-container");
        let leftContainer = document.createElement("div");
        leftContainer.classList.add("sonification-left-container");
        let rightContainer = document.createElement("div");
        rightContainer.classList.add("sonification-right-container");
        bottomContainer.appendChild(leftContainer);
        bottomContainer.appendChild(rightContainer);

        // LEFT CONTAINER CONTAINS THE SONIFICATION MODULES
        for(let sonification of this.sonifications) {

            var type = sonification["type"]
            var formatted_name = sonification["formatted_name"];

            var sonification_module = document.createElement("div")
            sonification_module.classList.add("sonification-module")
            sonification_module.setAttribute("id", `${formatted_name}-module`)
            leftContainer.appendChild(sonification_module);

            var button_container = document.createElement("div");
            button_container.classList.add("button-container");
            sonification_module.appendChild(button_container);
            
            var btn = document.createElement("button")
            btn.classList.add("sonification-button");
            btn.setAttribute("id", `${formatted_name}-btn`);
            if(formatted_name != "raw-data-sonification") {
                btn.setAttribute("disabled", "disabled");
            }
            btn.innerHTML = type;
            btn.onclick = (e) => {
                var selected_signals_names = [];

                for(var i = 0; i < this.signals.length; i++) {
                    var signal_button = document.getElementById(`${this.signals[i]["name"]}-signal-button`);
                    if(signal_button.classList.contains("signal-button-selected")) {
                        selected_signals_names.push(this.signals[i]["name"]);
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

            button_container.appendChild(btn);

            var play_btn = document.createElement("button")
            play_btn.classList.add("sonification-button");
            play_btn.setAttribute("id", `${formatted_name}-play-btn`);
            play_btn.innerHTML = "Play";
            if(formatted_name != "raw-data-sonification") {
                play_btn.setAttribute("disabled", "disabled");
            }
            play_btn.onclick = (e) => {
                var sonification_name = e.target.id.slice(0, -9);
                this.playSonification(sonification_name)
            };
            
            button_container.appendChild(play_btn);

            var stop_btn = document.createElement("button")
            stop_btn.classList.add("sonification-button");
            stop_btn.setAttribute("id", `${formatted_name}-stop-btn`);
            stop_btn.innerHTML = "Stop";
            if(formatted_name != "raw-data-sonification") {
                stop_btn.setAttribute("disabled", "disabled");
            }
            stop_btn.onclick = (e) => {
                var sonification_name = e.target.id.slice(0, -9);
                this.stopSonification(sonification_name)
            };
            
            button_container.appendChild(stop_btn);
            
            var sonification_controller = document.createElement("div")
            sonification_controller.classList.add("sonification-controller")
            sonification_controller.setAttribute("id", `${formatted_name}-controller`)
            this.createController(sonification_controller, formatted_name, sonification["init_params"])
            sonification_module.appendChild(sonification_controller)

        }

        // RIGHT CONTAINER CONTAINS THE OUTPUT WINDOW
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

    /**
     * This function is called when the user clicks on the "Play" button of a sonification module.
     * It checks if the sonification is cached, otherwise it instantiate a new sonification object.
     */
    configureSonification(sonification) {

        // REQUIRED SONIFICATION
        var formatted_name = sonification["formatted_name"];
        var signals_names = sonification["signals_names"]
        var start = sonification["locus"][0] / 1000;
        var end = sonification["locus"][1] / 1000;
        var params = sonification["params"]

        if(signals_names.length === 0) {
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
            this.outputWindow.innerHTML += "</br>Sonification is cached, press 'Play' to play cached data<br/>";
            return;
        }

        // ELSE INSTANTIATE A NEW SONIFICATION OBJECT
        var config = {
            "signals": signals_names,
            "params": params_dict,
            "locus": sonification["locus"],
            "duration": sonificationDuration,
        };

        var processor;
        if(formatted_name === "raw-data-sonification") {
            processor = (new RawDataSonification(this.signals, config))
        }

        config["processor"] = processor;

        this.cache[formatted_name] = config;

        // // ELSE RETRIEVE AND TRIM THE SIGNALS TO SONIFY
        // var signals_toProcess = []
        // for(let signal of signals_names) {
        //     for(var i = 0; i < this.signals.length; i++) {
        //         if(this.signals[i]["name"] === signal) {
        //             var trimmed_signal = this.signals[i]["binary_data"].slice(start, end)
        //             signals_toProcess.push(trimmed_signal)
        //         }
        //     }
        // }

        // // SONIFY THE SIGNALS
        // this.instatiateSonifier(formatted_name, signals_toProcess, params_dict, sonificationDuration).then((processor) => {
        //     this.cache[formatted_name] = {
        //         "signals": signals_names,
        //         "params": params_dict,
        //         "locus": sonification["locus"],
        //         "duration": sonificationDuration,
        //         "processor": processor
        //     }
        // })
    }

    /**
     * The General idea is to load the data to process into a buffer and feed the proper audio processor
     * @param {*} formatted_name sonification formatted name
     * @param {*} signal_toProcess multi-dimensional array of data to process
     * @param {*} params_dict dictionary of control parameters
     */
    instatiateSonifier(formatted_name, signals_toProcess, params_dict) {
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
            /** Modify here if additional sonification processors are included */
            if(formatted_name === "raw-data-sonification") {
                resolve(new RawDataSonification(multiChannelInputbuffer, params_dict))
            }
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

    playSonification(formatted_name) {
        if(this.cache[formatted_name] !== undefined) {
            this.cache[formatted_name]["processor"].play();
        }
        else {
            this.outputWindow.innerHTML = "No sonification to play";
        }
    }

    stopSonification(formatted_name) {
        if(this.cache[formatted_name] !== undefined) {
            this.cache[formatted_name]["processor"].stop();
        }
    }
}

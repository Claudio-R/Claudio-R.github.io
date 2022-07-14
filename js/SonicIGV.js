/** The RawDataSonificationProcessor is loaded */
import RawDataSonification from './audioProcessors/RawDataSonification.js';

/** The binary data and initial configuration are stored into json files and loaded */
import index from './resources/index.js';
import epigenomes from './resources/epigenomes.js';

export class SonicIGV {
    /**
     * The SonicIGV acts as a sort of decorator for the whole IGV platform. It needs a reference to the igv browser to modify the GUI
     * @param {IGVBrowser} browser the igv browser instantiated at the creation of the app
     */
    constructor(browser) {
        this.browser = browser
        this.chr = this.browser.referenceFrameList[0]['chr']
        this.sonification_column = this.init();   
        this.cache = {}
    }

    /**
     * Initialize the sonification system interface
     * @returns {HTMLElement} a div element used as a container for the sonification modules
     */
    init() {
        const sonicIGV = document.createElement("div");
        sonicIGV.classList.add("sonicIGV-container");
        document.querySelector("nav").after(sonicIGV);

        const igvMain = document.querySelector("#igv-main");
        igvMain.style.width = "60%";
        sonicIGV.appendChild(igvMain);

        const sonification_column = document.createElement("div");
        sonification_column.classList.add("sonification-column");
        sonification_column.style.width = "40%";

        sonicIGV.appendChild(sonification_column);
        
        sonicIGV.addEventListener('change', (e) => {
            /** 
             * BUG: This should also take into account selection made through the "all" canvas
             * also, setTimeout sometimes fails and the thread is locked
             */
            if(e.target.getAttribute("name") === "chromosome-select-widget") {
                /** wait a few milliseconds to retrieve the correct chromosome */
                new Promise(resolve => setTimeout(resolve, 250)).then(() => {
                    var chr = this.browser.referenceFrameList[0]['chr']
                    // console.log("Chromosome changed ", chr)
                    this.loadTracks(chr).then(() => {
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
    loadTracks(chr) {
        return new Promise((resolve, reject) => {
            this.browser.removeAllTracks();
            if(chr != "chr1") {
                this.signals = undefined;
                this.sonifications = undefined;
                resolve()
            }

            for(let epigenome of epigenomes) {
                if(epigenome["chr"] === chr) {
                    this.signals = epigenome["histones"]
                    break;
                }
            }
    
            for(let element of index) {
                if(element["chr"] === chr) {
                    this.sonifications = element["sonifications"]
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
                    displayMode: "EXPANDED",
                })
            }
            resolve()
        })
    }

    createView(sonification_column) {

        while(sonification_column.firstChild){
            sonification_column.remove(sonification_column.firstChild)
        }
        
        if(this.signals == undefined || this.sonifications == undefined) {
            return
        }

        // DIVIDE THE SONIFICATION COLUMN INTO TWO PORTIONS
        let topContainer = document.createElement("div");
        let bottomContainer = document.createElement("div");
        sonification_column.appendChild(topContainer);
        sonification_column.appendChild(bottomContainer);

        // TOP CONTAINER CONTAINS THE LIST OF SIGNALS
        topContainer.classList.add("sonification-top-container");
        var row1 = document.createElement("div");
        row1.classList.add("sonification-row");
        topContainer.appendChild(row1)
        for(let i = 0; i < this.signals.length; i++) {
            let column = document.createElement("div");
            column.classList.add("signal-box");
            row1.appendChild(column);

            let signal_button = document.createElement("button");
            signal_button.classList.add("signal-button");
            signal_button.innerHTML = this.signals[i]["name"];
            signal_button.setAttribute("id", `${this.signals[i]["name"]}-signal-button`);
            signal_button.onclick = (e) => {
                e.target.classList.toggle("signal-button-selected");
            }
            column.appendChild(signal_button);
        }

        // TOP CONTAINER CONTAINS ALSO THE POSSIBLE SONIFICATIONS
        var row2 = document.createElement("div");
        row2.classList.add("sonification-row");
        topContainer.appendChild(row2)
        for(let i = 0; i < this.sonifications.length; i++) {
            let column = document.createElement("div");
            column.classList.add("signal-box");
            row2.appendChild(column);

            let sonification_button = document.createElement("button");
            sonification_button.classList.add("sonification-button");
            sonification_button.innerHTML = this.sonifications[i]["type"];
            sonification_button.setAttribute("id", `${this.sonifications[i]["formatted_name"]}-sonification-button`);
            sonification_button.classList.add("signal-button-selected")
            sonification_button.onclick = (e) => {
                var formatted_name = e.target.getAttribute("id").slice(0, -20);
                console.log(formatted_name)
                var module = document.querySelector(`#${formatted_name}-module`)
                module.classList.toggle("notvisible")
                e.target.classList.toggle("signal-button-selected")
            }
            column.appendChild(sonification_button);
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
            this.createModule(sonification["formatted_name"])
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

    createModule(formatted_name) {

        var container = document.querySelector(".sonification-left-container");

        var sonification;
        for(let sonification_ of this.sonifications) {
            if(sonification_["formatted_name"] == formatted_name){
                sonification = sonification_;
                break;
            }
        }

        var sonification_module = document.createElement("div")
        sonification_module.classList.add("sonification-module")
        sonification_module.setAttribute("id", `${formatted_name}-module`)
        container.appendChild(sonification_module);
    
        var button_container = document.createElement("div");
        button_container.classList.add("button-container");
        sonification_module.appendChild(button_container);
        
        var btn = document.createElement("button")
        btn.classList.add("sonification-button");
        btn.setAttribute("id", `${formatted_name}-btn`);
        if(formatted_name != "raw-data-sonification") {
            btn.setAttribute("disabled", "disabled");
        }
        
        btn.innerHTML = sonification["type"];
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

        // console.log(container)
    }


    /**
     * This function creates the sliders used to interact with the sonification module
     * @param {HTMLElement} sonification_controller parent div the sliders are attached to
     * @param {String} formatted_name uniquely defined string for each sonification module 
     * @param {JSON} params contains information about the sliders to create 
     */
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
     * It retrieves the current value from the sliders and checks if the sonification is cached. If it is not, a new sonification processor is instantiated.
     * @param {JSON} sonificationConfig a configuration object for the new sonification
     */
    configureSonification(sonificationConfig) {

        // REQUIRED SONIFICATION
        var formatted_name = sonificationConfig["formatted_name"];
        var signals_names = sonificationConfig["signals_names"]
        var params = sonificationConfig["params"]

        if(signals_names.length === 0) {
            this.outputWindow.innerHTML = "No signals to play";
            return
        }

        // RETRIEVE CURRENT CONTROL PARAMETERS FROM UI
        var current_params = {}
        for (let param of params) {
            var param_name = param["name"]
            var slider = document.getElementById(`${formatted_name}-${param_name}-slider`)
            var value = Number(slider.value)
            current_params[param_name] = value
        }

        var sonificationDuration = 15;

        // CHECK IF THE SONIFICATION IS CACHED
        if(this.sonificationIsCached(formatted_name, signals_names, current_params, sonificationConfig["locus"], sonificationDuration)) {
            // PLAY THE CACHED DATA
            this.outputWindow.innerHTML += "</br>Sonification is cached, press 'Play' to play cached data<br/>";
            return;
        }

        // ELSE INSTANTIATE A NEW SONIFICATION OBJECT
        var config = {
            "signals": signals_names,
            "params": current_params,
            "locus": sonificationConfig["locus"],
            "duration": sonificationDuration,
        };

        var processor;
        // MODIFY BELOW IF OTHER PROCESSOR ARE CREATED
        if(formatted_name === "raw-data-sonification") {
            processor = (new RawDataSonification(this.signals, config))
        }

        config["processor"] = processor;

        this.cache[formatted_name] = config;

    }

    /**
     * Check if the sonification is cached. Only the last sonification is stored.
     * @param {String} formatted_name 
     * @param {List} signals_names 
     * @param {JSON} current_params 
     * @param {String} locus 
     * @param {Number} duration 
     * @returns 
     */
    sonificationIsCached(formatted_name, signals_names, current_params, locus, duration) {

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
            if(signalsAreCached(cached_signals, signals_names) && paramsAreCached(cached_params, current_params) && cached_locus[0] === locus[0] && cached_locus[1] === locus[1] && cached_duration === duration) {
                isCached = true;
            }
        }

        return isCached;

    }

    /**
     * Play the last sonification produced or alert the user if no sonification have been played before
     * @param {String} formatted_name 
     */
    playSonification(formatted_name) {
        if(this.cache[formatted_name] !== undefined) {
            this.cache[formatted_name]["processor"].play();
        }
        else {
            this.outputWindow.innerHTML = "No sonification to play";
        }
    }

    /**
     * Call the stop() method on the last stored sonification 
     * @param {String} formatted_name 
     */
    stopSonification(formatted_name) {
        if(this.cache[formatted_name] !== undefined) {
            this.cache[formatted_name]["processor"].stop();
        }
    }
}

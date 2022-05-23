var mySonifications = 
[
    {
        "chr": "chr1",
        "sonifications": [
            {
                "type": "Raw Data Sonification",
                "formatted_name": "raw-data-sonification",
                "init_params": [
                    {
                        "name": "Gain",
                        "value": 0.5,
                        "min": 0.0,
                        "max": 1.0,
                        "step": 0.001
                    },
                    {
                        "name": "Frequency",
                        "value": 250.0,
                        "min": 50.0,
                        "max": 500.0,
                        "step": 1.0
                    },
                    {
                        "name": "Duration",
                        "value": 0.5,
                        "min": 0.01,
                        "max": 1.0,
                        "step": 0.01
                    },
                    {
                        "name": "Detune",
                        "value": 0.0,
                        "min": 0.0,
                        "max": 0.20,
                        "step": 0.01
                    }
                ]
            },
            {
                "type": "High-level Feature Sonification",
                "formatted_name": "high-level-features-sonification",
                "init_params": [
                    {
                        "name": "Volume",
                        "value": 1.0,
                        "min": 0.0,
                        "max": 1.0,
                        "step": 0.1
                    },
                    {
                        "name": "Pitch",
                        "value": 1.0,
                        "min": 0.0,
                        "max": 1.0,
                        "step": 0.1
                    },
                    {
                        "name": "Duration",
                        "value": 1.0,
                        "min": 0.0,
                        "max": 1.0,
                        "step": 0.1
                    }
                ]
            }
        ]
    }
]

export default mySonifications;
# IGV-Web App

The IGV-Web app is a pure-client "genome browser" application based on [igv.js](https://github.com/igvteam/igv.js).  It is developed by the [Integrative Genomics Viewer (IGV)](https://igv.org) team. You can use our hosted app at https://igv.org/app, or follow the directions below to install your own.

**Note:  the instructions below are for developers or others wishing to install a copy of the IGV-Web app.  For user documentation see [https://igvteam.github.io/igv-webapp/](https://igvteam.github.io/igv-webapp/).** A link to the user documentation is also provided in the app's Help menu.

## Supported Browsers

The IGV-Web app and igv.js require a modern web browser with support for JavaScript ECMAScript 2015.

## Installation

IGV-Web is a pure client web application consisting entirely of static files and can be served from virtually any 
web server, e.g.  Apache, Flask, Tomcat, nginx, or Amazon S3. You can install it from a pre-built distribution package or by building it from source code. To run the app, refer to your web server documentation for information on serving web content. Some examples are provided 
in the section on **Running the app** below.

### 1. Prebuilt packages

A pre-built web content directory for the current  release can be downloaded from 
[https://igv.org/app-archive/igv-webapp.1.4.6.zip](https://igv.org/app-archive/igv-webapp.1.4.6.zip). Older versions of the app can also be found in at the same https://igv.org/app-archive location.


### 2. Building from source code

* Requirements
  * Node >= v8.11.4
  * NPM >= v5.6.0

* Clone this repository
````
git clone git@github.com:igvteam/igv-webapp.git
````
* Change directories to project
````
cd ./igv-webapp
````
* Install
````
npm install
````
* Build
````
npm run build
````

## Running the app

As noted above, refer to your web server documentation for instructions on serving the web content.  As examples, 
instructions for use with the NPM package http-server and Amazon S3 follow.  

### 1. http-server

Instructions for running with http-server.  For more options, including
installing http-server locally, see the [http-server documentation](https://www.npmjs.com/package/http-server).

* Start http-server on the web content directory (i.e., the downloaded pre-packaged distribution described above, or the `dist` directory if building from source )
````
npx http-server -a localhost <web content directory>
````

* Open a browser and enter the following
````
localhost:8080
````
or
````
localhost:8080/index.html
````

### 2. Amazon S3

To serve the app from Amazon S3, simply upload the contents from the IGV-Web content directory (i.e., the pre-packaged distribution described above, or the `dist` directory if building from source ) to an Amazon S3 bucket.  Keep the 
directory structure intact, and make all files public.  Example of an S3 hosted app is at  
https://s3.amazonaws.com/igv.org.app/app/index.html.   Note this is an example and is not kept up-to-date.


## Configuration

**NOTE:**  
* If you installed a **pre-built** distribution package, the configuration files referred to below can be found in the ```resources``` directory. 
* If you **built from the source code**, you must rebuild the `dist` directory with ``` npm run build``` after making any changes to configuration files in ```resources```.  Alternatively, you can manually copy the changed files to ```dist/resources```,  or just edit ```dist/resources``` directly. Note however, if you make changes directly to files in ```dist/resources```, they will be overwritten the next time you do a build.


The IGV-Web app is configured with the global **igvwebConfig** defined in _igvwebConfig.js_.  The following properties
are customizable.

* `genomes` - URL to a JSON file containing a list of genome configuration objects.  This list populates the _Genomes_ 
pulldown menu.  The default genomes file is ```resources/genomes.json```. For a description of the genome configuration object, see the [igv.js wiki](https://github.com/igvteam/igv.js/wiki/Reference-Genome) .  

* `trackRegistryFile` - URL to a configuration file for the _Tracks_ pulldown menu.  Use this to define custom track menus.  The file contains
a JSON object with genomeIDs as keys and an array of URLs to JSON files defining menu entries in the _Tracks_ pulldown menu.
The default track registry file is ```resources/tracks/trackRegistry.json```.  Further details on configuring the tracks menu are available [below](#track-registry).

* `igvConfg` - An igv.js configuration object.   See the [igv.js wiki](https://github.com/igvteam/igv.js/wiki/Browser-Creation) for details.

* `clientId` - (_optional_) A Google clientId, used to enable OAuth for the Google picker and access to protected
Google resources.  See [Google Support](https://developers.google.com/identity/sign-in/web/sign-in) for
instructions on obtaining a clienId.  OAuth requests from igv.js will include the following scopes.

    * https://www.googleapis.com/auth/devstorage.read_only 
    * https://www.googleapis.com/auth/userinfo.profile 
    * https://www.googleapis.com/auth/drive.readonly'
  
* `urlShortener` - An object or function defining a URL shortener to shorten links created by the **Share** button.  The value of this property can be replaced with a function, taking a single argument (the long URL) and returning the shortened URL, or an Object. 

### Default configuration

```javascript


var igvwebConfig = {
    genomes: "resources/genomes.json",
    trackRegistryFile: "resources/tracks/trackRegistry.json",
    igvConfig:
        {
            queryParametersSupported: true,
            showChromosomeWidget: true,
            genome: "hg19",
            showSVGButton: false,
            tracks: [
                // TODO (optional) -- add default tracks here.  See github.com/igvteam/igv.js/wiki for details
                // {
                //     name: "CTCF - string url",
                //     type: "wig",
                //     format: "bigwig",
                //     url: "https://www.encodeproject.org/files/ENCFF563PAW/@@download/ENCFF563PAW.bigWig"
                // }
            ]
        },

    // Provide a URL shorterner function or object.   This is optional.  If not supplied
    // sharable URLs will not be shortened .
    urlShortener: {
        provider: "tinyURL"
    }
};
```

### Track Registry

The _Tracks_ pulldown menu is different depending on the currently selected reference genome. A track registry file defines the menu. It consists of a map linking genome IDs to lists of track configuration files. Each track configuration file defines a menu item in the pulldown menu. For example, the registry below will result in two items for the _Tracks_ menu when the hg19 genome is seleted, and a single menu item for hg38.

```json
{
  "hg19" : [
    "resources/tracks/hg19_annotations.json",
    "resources/tracks/hg19_platinum_genomes.json"
  ],

  "hg38" : [
    "resources/tracks/hg38_annotations.json"
  ]
}
```
The label of each menu item is specifed in the track configuration file, along with an optional description, and either a list of one or more tracks or a type property. 
The example below defines a menu item labeled "Annotations" with a single track, a BED file of gene annotations. The details of the track are defined by a track configuration object as documented in the [igv.js wiki](https://github.com/igvteam/igv.js/wiki/Tracks-2.0).

```json
{
  "label": "Annotations",
  "description": "Annotations - source <a href=http://hgdownload.soe.ucsc.edu/downloads.html target=_blank>UCSC Genome Browser</a>",
  "tracks": [
	{
	  "type": "bed",
	  "url": "https://s3.dualstack.us-east-1.amazonaws.com/igv.org.test/data/gencode.v18.collapsed.bed",
	  "indexURL": "https://s3.dualstack.us-east-1.amazonaws.com/igv.org.test/data/gencode.v18.collapsed.bed.idx",
	  "name": "Gencode V18"
	}]
}
	
```

The type property can be used in lieu of a track list to trigger pre-defined lists of tracks for special data sources.
Currently the only recognized value is "ENCODE".   This property can be used to populate an ENCODE load widget for any
genome assembly with data hosted by the [ENCODE project](https://www.encodeproject.org/).   Currently this includes
assemblies for human (hg19, GRCh38),  mouse (mm10), worm (ce11), and fly (dm6).

```json
{
  "label": "ENCODE",
  "type": "ENCODE",
  "description": "<a href=hhttps://www.encodeproject.org/ target=_blank>Encylopedia of Genomic Elements</a>",
  "genomeID": "hg19"
}

```

### Data Servers

IGV-Web uses igv.js, a JavasScript client. Servers for track data must support CORS access and Range requests.  See https://github.com/igvteam/igv.js/wiki/Data-Server-Requirements  for more details.  


## License
The IGV-Web app is [MIT](/LICENSE) licensed.


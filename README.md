# mame-api
MAME-API is a REST API that provides various emulator and software datasets in JSON format.

## Important Information
This API It is largely experimental at this stage.

Breaking changes may occur without notice. If you have built anything that consumes it the wheels might fall off one day.

At any time it may just break or the data becomes stale.

If you are consuming it please get in touch to know what's going on.

## Usage

### Service Location

https://api.spludlow.net:777/

The root GET serves up the swagger YAML. If you can't see it, in a browser, then it's paggered.

### Documentation

You can swagger it here.

https://mame.spludlow.co.uk/swagger-ui/

The swagger-ui is fully working, you can run tests against end points and grab the curl or whatever.

NOTE: No response schemas are present in the swagger, just look at the body, not the mantelpiece.

### Authentication & Security
All endpoints are currently anonymous, they do not require authentication.

CORS Access control is as permissive as possible. __Access-Control-Allow-Origin: *__

## DataSets
The following datasets are provided:

### MAME
Best Emulator on the planet.

https://www.mamedev.org/

https://github.com/mamedev/mame

Very active project, new stuff continuously added, updated monthly.

### TOSEC
TOSEC is not an Emulator but a catalogue of old software, firmware, and some documentation.

https://www.tosecdev.org/

Gets updated about once a year.

It is a very useful resource, you can find many software collections (https://archive.org/) that are based on TOSEC. This is a good way of grabbing software collection for other emulators that just load any ROM given.

You can trust the collections based on TOSEC, well some software will be infected with target system viruses.

Casually browse the TOSEC dataset here https://mame.spludlow.co.uk/Others/TOSEC/

### HBMAME 
Based on MAME with various silly ROM hacks and other antics.

NOTE: Hardly implemented only providing data on the /data/machine_filter end point.

https://hbmame.1emulation.com/

https://github.com/Robbbert/hbmame

Updated monthly.

### FBNeo
Similar project to MAME but more focused on gaming performance, unlike MAME which is more focused on fidelity and history.

https://neo-source.com/

https://github.com/finalburnneo/FBNeo

The MAME-API FBNeo endpoints are not currently being maintained, I did have it updating from the daily builds (https://github.com/finalburnneo/FBNeo/releases/tag/latest) but lost interest. If anyone is interested let me know.

These boys seem to ride the nightly builds, looks like they gave up on stable releases (https://github.com/finalburnneo/FBNeo/releases) last one is from 2021.

## Concept
After working with a Node.js API for 2 years commercially, with no prior JS experience, I kind of liked it and wanted to build something on my own terms.

I've got plenty of data around, lets wrap it in a Node.js REST API for the lolz.

My only real design goals where:

 - Make it swagger driven, none of that fiddling about with controllers.
 - Use few dependencies, I don’t need no express.js, I want full control over the request / response.
 - Use TypeScript, don’t go mad typing everything, a JS any is a beautiful thing.

If you haven't guessed this is the opposite of what I was previously working on.

There is also some code in there for authentication and sessions, but all the endpoints are anonymous at the moment.

It also supports web sockets, pushing messages to client, but that's not currently in use.

## Workings
The routes are built from the swagger schema, using the __operationId__ property see https://github.com/sam-ludlow/mame-api/blob/main/src/Tools/Server.ts

You can specify endpoints __operationId__ to run either static methods or instance methods that match the instance objects defined here https://github.com/sam-ludlow/mame-api/blob/main/src/index.ts

JSON caches are then created from SQL Server queries that are kept in memory and saved out to the filesystem. I haven’t automated version bumps yet, I manually delete cache files and restart, so I forget sometimes.

API queries just hit the in-memory datasets, with a few exceptions. I would like to plum in SOLR, maybe one day, just wanted to see what doing it all in Node.js worked out like first.

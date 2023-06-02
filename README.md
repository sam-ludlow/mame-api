# mame-api
MAME-API is a REST API that provides various emulator and software datasets in JSON format.

## Important Information
This API It is largely experimental at this stage.

Breaking changes may occur without notice. If you have built anything that consumes it the wheels might fall off one day.

If you are consuming it please get in touch to know what's going on.

## DataSets
The following datasets are provided:

### MAME
Best Emulator on the planet.

Very active project, new stuff continuously added, updated monthly.

### HBMAME 
Based on MAME with various silly ROM hacks and other antics. Updated monthly.

### TOSEC
TOSEC is not an Emulator but a catalogue of old software, firmware, and some documentation. https://www.tosecdev.org/

Gets updated about once a year.

It is a very useful resource, you can find many software collections (https://archive.org/) that are based on TOSEC. This is a good way of grabbing software collection for other emulators that just load any ROM given.

You can trust the collections based on TOSEC, well some software will be infected with target system viruses.

Casually browse the TOSEC dataset here https://mame.spludlow.co.uk/Others/TOSEC/

### FBNeo
Similar project to MAME but more focused on gaming performance, unlike MAME which is more focused on fidelity and history.

The MAME-API FBNeo endpoints are not currently being maintained, I did have it updating from the daily builds (https://github.com/finalburnneo/FBNeo/releases/tag/latest) but lost interest. If anyone is interested let me know.

These boys seem to ride the nightly builds, looks like they gave up on stable releases (https://github.com/finalburnneo/FBNeo/releases) last one is from 2021.

## Usage

### Service Location

https://api.spludlow.net:777/

The root GET serves up the swagger YAML. If you can't see it, in a browser, then it's paggered.

### Documentation

You can swagger it here.

https://mame.spludlow.co.uk/swagger-ui/

The swagger-ui is fully working, you can run tests against end points and grab the curl or whatever.

NOTE: No response schemas are present in the swagger, just looks at the body.


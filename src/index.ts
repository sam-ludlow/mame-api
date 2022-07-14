import fs from "fs";

import * as Model from './Model';
import * as Tools from './Tools';
import * as Logic from './Logic';

const spludlowPublicServerConfig: Model.ServerConfig = {
	name: 'Spludlow MAME API - Public Server',
	schemaFilename: './src/Schema.yaml',
	applicationServers: [
		{
			key: 'MAME_MACHINE',
			cacheBuilder: Logic.MameMachines.BuildCache,
			classDefinition: Logic.MameMachines.MameApplicationServer,
		},
		{
			key: 'MAME_SOFTWARE',
			cacheBuilder: Logic.MameSoftwareLists.BuildCache,
			classDefinition: Logic.MameSoftwareLists.MameSoftwareListsApplicationServer,
		},
		{
			key: 'TOSEC',
			cacheBuilder: Logic.TOSEC.BuildCache,
			classDefinition: Logic.TOSEC.TOSECApplicationServer,
		},
		{
			key: 'FBNEO',
			cacheBuilder: Logic.FBNeo.BuildCache,
			classDefinition: Logic.FBNeo.FBNeoApplicationServer,
		},
	],
	routes: [
/*		{
			path: '/schema',
			method: 'get',
			anonymous: true,
			logic: 'Logic.Schema.GetSchema',
		}*/
	],
};

const runProfiles = {

	local: {
		port: 8888,
	},

	public: {
		port: 777,
		key: './certs/api.spludlow.net/privkey.pem',
		cert: './certs/api.spludlow.net/cert.pem',

	},
};

const Start = async () => {

	process.stdin.on('data', (chunk: Buffer) => {
		const command: string = chunk.toString().trim();
		console.log(`COMMAND: ${command}`);

		if (command === 'stop')
			process.exit(0);
	});

	//await Tools.Data.JsonToDirectory('E:\\SOLR\\SOURCE\\TOSEC', 'SPLCAL-MAIN', 'TOSEC', undefined);
	//return;

	const config: Tools.Config = new Tools.Config(runProfiles);

	const spludlowPublicServer: Tools.Server = new Tools.Server(config, spludlowPublicServerConfig);
	spludlowPublicServer.Begin();
}

Start();

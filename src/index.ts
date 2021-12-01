import * as Model from './Model';
import * as Tools from './Tools';
import * as Logic from './Logic';

const spludlowPublicServerConfig: Model.ServerConfig = {
	name: 'Spludlow MAME API - Public Server',
	schemaFilename: './src/Schema.yaml',
	applicationServers: [
		{
			key: 'MAME',
			cacheBuilder: Logic.MameMachines.BuildCache,
			classDefinition: Logic.MameMachines.MameApplicationServer,
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
		port: 443,
		key: './certs/api.spludlow.net/privkey.pem',
		cert: './certs/api.spludlow.net/cert.pem',

	},
};

const Start = async () => {
	const config: Tools.Config = new Tools.Config(runProfiles);

	const spludlowPublicServer: Tools.Server = new Tools.Server(config, spludlowPublicServerConfig);
	spludlowPublicServer.Begin();
}

Start();

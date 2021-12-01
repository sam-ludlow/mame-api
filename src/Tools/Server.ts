import http from "http";
import https from "https";

import * as Model from '../Model';
import * as Tools from '../Tools';
import * as Logic from '../Logic';

export class Server {

	public name: string;
	public routes: Model.Route[];

	public schemaFilename: string;
	public schemaYaml: string = '';
	public schema: any;
	
	public cache: any;
	public applicationServers: any = {};

	public sessions: any = {};

	public port: number;
	public secure: boolean;
	public server: http.Server | https.Server;

	private applicationServerConfigs: Model.ApplicationServerConfig[];

	constructor(config: Tools.Config, serverConfig: Model.ServerConfig) {

		//	Just pass the object with these !!!
		this.name = serverConfig.name;
		this.routes = serverConfig.routes;
		this.schemaFilename = serverConfig.schemaFilename;
		this.applicationServerConfigs = serverConfig.applicationServers;

		this.cache = {};

		this.port = config.Port;

		this.secure = !!config.httpsServerOptions;
		this.server = config.httpsServerOptions
			? https.createServer(config.httpsServerOptions, this.RequestListener)
			: http.createServer(this.RequestListener);
	}

	public Begin = async () => {

		/**
		 * Load Schema
		 */

		this.schemaYaml = await Tools.IO.FileRead(this.schemaFilename);
		this.schema = await Tools.Swagger.ReadSchemaFromText(this.schemaYaml);

		 Object.keys(this.schema.paths).forEach((pathKey: string) => {
			 const path: any = this.schema.paths[pathKey];
			 ['get','post','put','delete'].forEach(method => {
				 const pathMethod: any = path[method];
				 if (pathMethod) {
					 const route: Model.Route = {
						 path: pathKey,
						 method,
						 anonymous: !(pathMethod.security && pathMethod.security.length),
						 logic: pathMethod.operationId,
					 };
					 this.routes.push(route);

					 //	Should resolve everything
					 if (pathMethod.parameters)
					 	Tools.Swagger.ResolveRefs(this.schema, pathMethod.parameters);
	 
				 }
			 });
		 });

		/**
		 * Process route functions
		 */

		this.routes.forEach((route) => {

			const parts: string[] = route.logic.split('.');

			if (parts.length !== 3)
				throw new Error(`Bad logic function: ${route.logic}`);

			let module: any;

			const logic: any = Logic;
			Object.keys(logic).forEach((moduleName) => {
				if (moduleName === parts[1])
					module = logic[moduleName];
			});

			if (!module)
				throw new Error(`did not find logic module:  ${route.logic}`);
		
			let callFunction: any;

			Object.keys(module).forEach((functionName) => {
				if (functionName === parts[2])
					callFunction = module[functionName];
			});

			if (!callFunction)
				throw new Error(`did not find logic function:  ${route.logic}`);

			route.logic = callFunction;
		});

		/**
		 * Application Startup
		 */
		console.log('Server Startup...');


		// Load or create cache data
		const cacheFilename = './cache.json';
		if (Tools.IO.FileExists(cacheFilename)) {

			console.log(`Reading server data cache from file (NOT RUNNING application Start Functions): ${cacheFilename}`);
			this.cache = JSON.parse(await Tools.IO.FileRead(cacheFilename));

		} else {

			for await (const config of this.applicationServerConfigs) {

				console.log(`application server initializing Cache: ${config.key}`);

				this.cache[config.key] = await config.cacheBuilder();

				console.log(`application server initialized Cache: ${config.key}`);
			}
	
			console.log(`Writing server data cache to file: ${cacheFilename}`);
			await Tools.IO.FileWrite(cacheFilename, JSON.stringify(this.cache));
		}


		// Make Application servers
		this.applicationServerConfigs.forEach((config) => {

			this.applicationServers[config.key] =
				new config.classDefinition(config.key, this.cache[config.key]);

			console.log(`application server created: ${config.key}`);
		});

		console.log('... finished Server Startup.');

		/**
		 * Listen
		 */

		this.server.listen(this.port);

		//setInterval(() => this.tick(), 1000);

		console.log(`Server Started: ${this.name} (${this.port})`);
	}

	private tick = async () => {
		const data = `${(new Date()).toISOString()}`;

		Object.keys(this.sessions).forEach((sessionKey: string) => {
			const session: Tools.Session = this.sessions[sessionKey];

			session.socketWrite(data);
		});
	}

	private ignorePaths: string[] = [
		'/favicon.ico',
		'/robots.txt',
		'/sitemap.xml',
	];

	private RequestListener: http.RequestListener = async (req: http.IncomingMessage, res: http.ServerResponse) => {

		const startTime: Date = new Date();

		const context: Tools.Context = new Tools.Context(this, req, res);

		context.res.setHeader('Access-Control-Allow-Origin', '*');
		context.res.setHeader('Server', 'Spludlow MAME API/0.0');

		let ignore = false;

		try {

			await context.ReadRequestPath();
	
			if (this.ignorePaths.includes(context.request.path)) {
				ignore = true;
				context.res.writeHead(404);
				context.res.end();
				return;
			}
	
			await context.RouteRequest();
	
			await context.ReadRequestHeader();
	
			await context.AuthenticateSession();
	
			await context.ReadRequestBody();
	
			await context.ValidateRequest();
	
			await context.Execute();
	
			await context.ValidateResponse();
	
			await context.WriteResponse();

		} catch (e) {
			context.HandleError(e as Error, 'Request Error');
		} finally {
			if (!ignore) {
				const endTime: Date = new Date();
				const ms: number = endTime.getTime() - startTime.getTime();
	
				console.log(`${context.server.name}	${context.requestTime.toISOString()}	${context.req.socket.remoteAddress}	${context.serialNumber}	${context.response.statusCode}	${ms}	${context.request.method}	${context.request.path}`);
			}
		}
	}
}

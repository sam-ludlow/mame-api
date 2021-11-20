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

	public sessions: any = {};

	public port: number;
	public secure: boolean;
	public server: http.Server | https.Server;

	constructor(config: Tools.Config, serverConfig: Model.ServerConfig) {

		this.name = serverConfig.name;
		this.routes = serverConfig.routes;
		this.schemaFilename = serverConfig.schemaFilename;

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
		 * Load Application Caches
		 */

		console.log('Starting MAME Cache load...');
		this.cache['Tables'] = await Logic.MameMachines.BuildCache();
		console.log('... finished MAME Cache load.');

		this.cache['Machines'] = {}; 

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

	private RequestListener: http.RequestListener = async (req: http.IncomingMessage, res: http.ServerResponse) => {

		const context: Tools.Context = new Tools.Context(this, req, res);

		try {

			await context.ReadRequestPath();
	
			if (context.request.path === '/favicon.ico') {
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
		}

	}

}

import http from "http";

import * as Model from '../Model';
import * as Tools from '../Tools';
import { Session } from "./Session";

const matchSHA1 = new RegExp('([a-f0-9]{40})');

export interface ContextRequest {
	path: string;
	method: string;

	contentType: string;

	cookies: any;

	pathParameters: any;
	queryParameters: any;

	body: any;

}

export interface ContextResponse {

	statusCode: number;
	contentType: string;
	body: any;
}

let contextSequence: number = 0;

export class Context {

	public serialNumber: number = 0;
	public requestTime: Date;

	public server: Tools.Server;

	public req: http.IncomingMessage;
	public res: http.ServerResponse;

	public request: ContextRequest;

	public route: Model.Route | undefined;

	public session: Session | undefined;

	public response: ContextResponse;

	constructor(server: Tools.Server, req: http.IncomingMessage, res: http.ServerResponse) {

		this.serialNumber = ++contextSequence;
		this.requestTime = new Date();

		this.server = server;

		this.req = req;
		this.res = res;

		this.request = {
			path: '',
			method: '',

			contentType: '',

			cookies: {},

			pathParameters: {},
			queryParameters: '',

			body: {},

		};

		this.response = {
			statusCode: 200,
			contentType: 'application/json',
			body: {
				message: 'default response',
			},
		};
	}

	
	/**
	 * clean path - to lowwer, trailing / off, ? moved for later
	 */
	public ReadRequestPath = async () => {

		let index = this.req.url!.indexOf("?");

		if (index !== -1) {
			this.request.path = this.req.url!.substring(0, index);
			// Parse later
			this.request.queryParameters = this.req.url!.substring(index + 1);
		} else {
			this.request.path = this.req.url!;
			this.request.queryParameters = '';
		}

		while (this.request.path.length && this.request.path.endsWith('/'))
			this.request.path = this.request.path.slice(0, -1);

		if (!this.request.path.length)
			this.request.path = '/';

		this.request.path = this.request.path.toLowerCase();

		this.request.method = this.req.method!.toLowerCase();

	}



	/**
	 * Throw 404 if route not found
	 */
	public RouteRequest = async () => {

		let pathParts = this.request.path.split('/');

		if (pathParts.length === 0)
			pathParts = ['/'];

		this.server.routes.forEach(route => {

			// should do at server start
			const routeParts = route.path.split('/');

			// use array filter ^^^
			if (this.request.method === route.method && pathParts.length === routeParts.length) {
				let matchCount = 0;
				const pathParameters: any = {};

				routeParts.forEach((routePart, index) => {
					const pathPart = pathParts[index];

					if (routePart[0] === '{') {
						pathParameters[routePart.slice(1, -1)] = pathPart;
						++matchCount;
					} else {
						if (routePart === pathPart)
							++matchCount;
					}

				});

				if (matchCount === routeParts.length) {

					this.request.pathParameters = pathParameters;

					if (this.route === undefined)
						this.route = route;
					else
						throw new Error(`Duplcate routes: ${this.request.path}`);
				}

			}
		});

		if (!this.route) {
			await this.HandleError(new Tools.ApiError({
				status: 404,
				message: this.req.url!,
				error: undefined,
			}), 'Miss Route');
		}

	}

	/**
	 * headers (resuired), cookies (all)
	 */
	public ReadRequestHeader = async () => {
		/**
		 * Headers
		 */

		//	Content Type	","content-type":"application/json;charset=utf-8","
		const contentType = this.req.headers['content-type'];
		if (contentType !== undefined) {
			const parts: string[] = contentType.split(';');
			if (parts.length < 1 || parts.length > 2)
				throw new Error(`Bad content type: ${contentType}`);
			this.request.contentType = parts[0].trim().toLowerCase();
			//console.log(`charset: ${parts[1] || ''}`);
		}

		/**
		 * Cookies
		 */
		 const cookie: string = this.req.headers['cookie']!;
		 if (cookie !== undefined) {
			 cookie.split(';').forEach(part => {
				 const pair: string[] = part.split('=');
				 if (pair.length === 2) {
					 const key = pair[0].trim().toLowerCase();
					 const value = pair[1].trim();

					 if (key.length) {
						if (!this.request.cookies[key]) this.request.cookies[key] = [];
						if (value !== undefined && value.length) this.request.cookies[key].push(pair[1]);
					 }

				 }
			 });
		 }

	}


	public AuthenticateSession = async () => {

		Tools.Auth.Authenticate(this);
	}

	public ReadRequestBody = async () => {

		/**
		 * Query Paramters
		 */

		if (this.request.queryParameters === '') {
			this.request.queryParameters = {};
		} else {
			const parts: string[] = this.request.queryParameters.split('&');

			this.request.queryParameters = {};

			parts.forEach((part: string) => {
				const pair: string[] = part.split('=');
				if (pair.length < 1 || pair.length > 2)
					throw new Error(`Bad pair ${part}`);
				const key = pair[0];
				const value = pair[1];

				if (!this.request.queryParameters[key]) this.request.queryParameters[key] = [];
				if (value !== undefined) this.request.queryParameters[key].push(value);
			});
		}

		/**
		 * Body
		 */

		return new Promise((resolve, reject) => {

			let body: string = '';
			this.req.on('data', chunk => {
				body += chunk;
			});
	
			this.req.on('end', async () => {
				if (body.length) {
					if (this.request.contentType === 'application/json' && typeof body === 'string')
						this.request.body = JSON.parse(body);
					else
						this.request.body = body;
				}

				resolve(body);
			});

			this.req.on('error', (e) => {
				reject(e);
			});

		});
	}

	public ValidateRequest = async () => {

		let schemaPathMethod: any = this.server.schema.paths[this.request.path];

		if (schemaPathMethod) schemaPathMethod = schemaPathMethod[this.request.method];

		if (schemaPathMethod) {
			schemaPathMethod.parameters.forEach((parameter: any) => {

				if (parameter.in === 'query') {
					// Required
					if (parameter.required === true && this.request.queryParameters[parameter.name] === undefined)
						throw new Tools.ApiError({
							message: `Required query paramter missing ${parameter.name}`,
							status: 400,
							error: undefined,
						});

					// Default
					if (this.request.queryParameters[parameter.name] === undefined && parameter.schema.default !== undefined) {
						this.request.queryParameters[parameter.name] = [parameter.schema.default];
					}

					// If using
					if (this.request.queryParameters[parameter.name] !== undefined) {

						this.request.queryParameters[parameter.name].forEach((part: any, index: number) => {
							// Fix types
							if (parameter.schema.type === 'integer' && typeof part !== 'number')
								part = parseInt(part, 10);

							// Min
							if (parameter.schema.type === 'integer' && parameter.schema.minimum !== undefined) {
								if (part < parameter.schema.minimum)
									throw new Tools.ApiError({
										message: `minimum query paramter ${parameter.name}`,
										status: 400,
										error: undefined,
									});
							}

							// Max
							if (parameter.schema.type === 'integer' && parameter.schema.maximum !== undefined) {
								if (part > parameter.schema.maximum)
									throw new Tools.ApiError({
										message: `maximum query paramter ${parameter.name}`,
										status: 400,
										error: undefined,
									});
							}

							this.request.queryParameters[parameter.name][index] = part;
							
						});

					}

				}
			});

		} else {
			console.log(`WARNING: Path without schema: ${this.request.method} ${this.request.path}.`);
		}
	}

	public Execute = async () => {
		if (!this.route)
			throw new Error('No route to Execute');
	
		this.response.body = await this.route.logic(this);


	}

	public ValidateResponse = async () => {

		console.log('Validate Response: ' + JSON.stringify(this.response.body).length);

	}

	public WriteResponse = async () => {

		this.res.setHeader('Access-Control-Allow-Origin', '*');

		await Tools.Response.Write(this);

	}







	/////

	public HandleError = async (e: Error, title: string) => {

		Tools.LogError(this, title, e);

		this.response.contentType = 'application/json';

		let innerError: any = {};

		if (e.name === 'ApiError') {
			const error: Tools.ApiError = <Tools.ApiError>e;
			innerError = error.error || {};
			this.response.statusCode = error.status;
		} else {
			this.response.statusCode = 500;
		}

		//	Copy response data for error (validation)?

		this.response.body = {
			statusCode: this.response.statusCode,
			title,
			errorName: e.name,
			message: e.message,
			error: e,
			innerError,
		};
		
		await Tools.Response.Write(this);
	}



}

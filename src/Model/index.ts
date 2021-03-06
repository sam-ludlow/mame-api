import * as Tools from '../Tools';

export interface ContextAuth {
	anonymous: boolean;
}

export interface ContextRequest {
	method: string;
	path: string;

	pathParameters: any;

	parameters: any;

	headers: any;
	cookies: any;

	contentType: string;
	body: any;

	auth: ContextAuth;
}

export interface Route {
	path: string;
	method: string;
	anonymous: boolean;
	logic: any;
}

export interface ApplicationServer {
	Cache: any;
	Key: string;
}

export interface ApplicationServerConstructable {
    new(key: string, cache: any): ApplicationServer;
}

export interface ApplicationServerConfig {
	key: string;
	cacheBuilder: () => Promise<any>;
	classDefinition: ApplicationServerConstructable;
}

export interface ServerConfig {
	name: string;
	routes: Route[];
	schemaFilename: string;
	applicationServers: ApplicationServerConfig[];
}

export interface ApiErrorConfig {
	message: string;
	status: number;
	error: Error | undefined,
}

export interface HttpRequestConfig {
	method: string,
	url: string,
	data: any,
	headers: any,
	binary: boolean,
}

export interface HttpResponse {
	data: any;
	status: number;
	statusText: string;
	headers: any;
}

export interface SolrRequest {
	q: string;
	fq: string[];

	fl: string[];

	sort: string;

	start: number;
	rows: number;

	facet: any;
}

export interface DataTable {
	name: string,
	rows: any[],
}
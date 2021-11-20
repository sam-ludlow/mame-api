import * as Tools from '../Tools';

export const GetSchema = async (context: Tools.Context): Promise<any> => {
	return context.server.schema;
}

export const GetSchemaYaml = async (context: Tools.Context): Promise<string> => {
	context.response.contentType = 'text/yaml';
	return context.server.schemaYaml;
}

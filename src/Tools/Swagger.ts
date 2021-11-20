import * as yaml from "js-yaml";

import * as IO from './IO';

export const ReadSchemaFromText = async (text: string): Promise<any> => {
	return yaml.load(text);
}

export const ReadSchemaFromFile = async (filename: string): Promise<any> => {
	const data = await IO.FileRead(filename);
	return yaml.load(data);
}

export const ExtractPaths = (schema: any): any[] => {
	const results: any[] = [];

	Object.keys(schema.paths).forEach((path: string) => {
		const pathInfo = schema.paths[path];

		const methods: string[] = [];
		Object.keys(pathInfo).forEach((method: string) => {
			methods.push(method);
			const methodInfo = pathInfo[method];
		});

		if (path.includes('{') === false && methods.includes('get') === true &&
			(path.endsWith('list') === true || path.endsWith('search') === true)
		) {
			results.push({
				path,
				methods,
			});
		}
	});

	return results;
}

export const ResolveRefs = (schema: any, items: any[]) => {

	items.forEach((item: any) => {
		const ref: string = item['$ref'];
		if (ref) {
			const pathParts = ref.split('/');
			if (pathParts.length !== 4)
				throw new Error(`Bad $ref: "${ref}"`);

			let targetObject: any;

			pathParts.forEach((pathPart: string) => {

				if (pathPart === '#')
					targetObject = schema;
				else
					targetObject = targetObject[pathPart];

				if (!targetObject)
					throw new Error(`Can not resolve ref on ${pathPart} from path ${ref}.`);
			});

			Object.keys(targetObject).forEach((key: string) => {
				item[key] = targetObject[key];
			});

			delete item['$ref'];
		}
	});
}

export const Validate = () => {

	//const args: OpenAPISchemaValidator.OpenAPISchemaValidatorArgs = {
	//	version: 3,
	//	//argsextensions?: IJsonSchema;
	//};

	//const doc: OpenAPI.Document;

	//const val: OpenAPISchemaValidator.default = new OpenAPISchemaValidator.default(args);

	//val.validate()
	//OpenAPI.default

	//openAPIValidator.validate()
}
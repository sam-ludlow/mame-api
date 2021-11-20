import * as path from "path";

import * as Tools from '../Tools';

export const GetPage = async (context: Tools.Context): Promise<string> => {

	const page: string = context.request.queryParameters['page'][0];

	if (page === undefined)
		throw new Error('page not passed');

	const filename: string = path.resolve(`./src/Pages/${page}.html`);

	context.response.contentType = 'text/html';

	const html: string = await Tools.IO.FileRead(filename);

	return html;
}

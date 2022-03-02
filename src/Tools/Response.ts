import fs from 'fs';

import * as Model from '../Model';
import * as Tools from '../Tools';

const style =
"body {" +
" font-family: sans-serif;" +
" font-size: small;" +
" background-color: #9BBEAF;" +
"}" +
"hr {" +
" color: #4BB88B;" +
" background-color: #4BB88B;" +
" height: 6px;" +
" border: none;" +
" padding-left: 0px;" +
"}" +
"table {" +
" border-collapse: collapse;" +
"}" +
"th, td {" +
" padding: 2px;" +
" text-align: left;" +
"}" +
"table, th, td {" +
" border: 1px solid black;" +
"}" +
"th {" +
" background-color: #4BB88B;" +
" color: white;" +
"}" +
"tr:nth-child(even) {" +
" background-color: #AFCBBF;" +
"}" +
"";

const ignoreColumnNames: string[] = [];

export const RenderHtmlTable = (data: any): string => {
	if (typeof data !== 'object')
		return data;	//JSON.stringify(data);

	if (Array.isArray(data) === false) {
		data = [data];
	}

	if (data.length === 0)
		return '[]';

	if (typeof data[0] !== 'object')
		return data;	//JSON.stringify(data);

	const columnNames: string[] = [];
	data.forEach((row: any) => {
		Object.keys(row).forEach(columnName => {
			if (columnNames.includes(columnName) === false && ignoreColumnNames.includes(columnName) === false)
				columnNames.push(columnName);
		});
	});

	let table = '';

	table += '<table>';
	table += '<tr>';
	columnNames.forEach(columnName => {
		table += `<th>${columnName}</th>`;
	});
	table += '</tr>';

	data.forEach((row: any) => {
		table += '<tr>';
		columnNames.forEach(columnName => {
			let value: string = '';
			if (row[columnName] !== undefined) {
				value = RenderHtmlTable(row[columnName]);
			}

			table += `<td>${value}</td>`;
		});
		table += '</tr>';
	});

	table += '</table>';

	return table;
};

export const RenderHtmlTables = (dataTables: Model.DataTable[]): string => {

	let html: string = `<html><head><style type="text/css">${style}</style></head><body>`;

	dataTables.forEach((dataTable) => {

		html += `<h2>${dataTable.name}</h2>`;

		html += RenderHtmlTable(dataTable.rows);;

		html += '<hr />';
	});

	html += '</body></html>';

	return html;
}

export const Write = async (context: Tools.Context) => {

	let body: any;

	if (context.response.contentType === "application/octet-stream") {
		body = context.response.body;
	} else {
		body = (typeof context.response.body === 'string') ?
		context.response.body : JSON.stringify(context.response.body);
	}

	context.res.writeHead(context.response.statusCode, { "Content-Type": context.response.contentType });

	return new Promise((resolve, reject) => {
		
		context.res.on('finish', () => {
			resolve(body);
		});

		context.res.on('error', (e) => {
			reject(e);
		});

		context.res.end(body);
	});


}

export const WriteFile = async (context: Tools.Context, filename: string, contentType: string, status: number) => {

	if (fs.existsSync(filename) === false)
		throw new Error(`WriteFile file not found "${filename}"`);

	context.res.writeHead(status, { 'Content-Type': contentType });

	const readStream: fs.ReadStream = fs.createReadStream(filename);
	try {
		await Tools.IO.PipeStream(readStream, context.res);
	} finally {
		readStream.close();
	}

	context.res.end();
}

import * as Tools from '../Tools';

export const Log = (context: Tools.Context, title: string, error: Error | undefined) => {

	let info = `${context.server.name}	${context.requestTime.toISOString()}	${context.serialNumber}	${title}	${context.request.method}	 ${context.request.contentType}	${context.request.path}	${context.req.url}`;

	if (error) {
		info += `
	${error.stack}`;
	}

	console.log(`${info}`);
}

export const LogData = (context: Tools.Context, title: string, data: any) => {

	let info = `${context.server.name}	${context.requestTime.toISOString()}	${context.serialNumber}	${title}	${context.request.method}	 ${context.request.contentType}	${context.request.path}	${context.req.url}`;

	if (data) {
		info += `
	${JSON.stringify(data)}`;
	}

	console.log(`${info}`);
}

const logHeader = (context: Tools.Context, title: string): string => {

	return `${context.server.name}	${context.requestTime.toISOString()}	${context.req.socket.remoteAddress}	${context.serialNumber}	${context.response.statusCode}	${title}`;
}


const followErrors = (e: Error) => {
	let text: string = '';

	text += 'ERROR\tname:' + e.name + '\tmessage:' + e.message + '\tstack:' + e.stack + '\n';

	if (e.name === 'ApiError') {
		const error: Tools.ApiError = <Tools.ApiError>e;
		if (error.error)
			text += followErrors(error.error);
	}

	return text;
}

export const LogError = (context: Tools.Context, title: string, error: Error) => {

	let text: string = '';

	text += logHeader(context, title) + '\n';

	text += followErrors(error);

	text += '\n';

	console.log(text);
};

export const LogSocket = (context: Tools.Context, data: string) => {

	if (!context.session)
		return;

	context.session.socketWrite(data);
}
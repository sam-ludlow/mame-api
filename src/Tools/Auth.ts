import * as Tools from '../Tools';

export const Authenticate = (context: Tools.Context) => {

	if (!context.route)
		throw new Error('No route to Authenticate');

	if (context.route.anonymous)
		return;

	const sessionKeys: string[] | undefined = context.request.cookies['session-key'];

	if (sessionKeys !== undefined && sessionKeys.length) {

		if (sessionKeys.length > 1)
			throw new Error('Multiple session keys in cookie.');

		sessionKeys.forEach(sessionKey => {
			const session: Tools.Session = context.server.sessions[sessionKey];
			if (session)
				context.session = session;
		});

	}

	if (!context.session)
		throw new Tools.ApiError({
			status: 401,
			message: 'Unauthorized',
			error: undefined,
		});
}

export const Status = (context: Tools.Context) => {

	let result: any = {};

	const sessionKey: string | undefined = context.request.cookies['session-key'];
	if (sessionKey !== undefined) {
		const session: Tools.Session = context.server.sessions[sessionKey];
		if (session) {
			result.session = session.info;
			result.message = 'OK';
		} else {
			result.message = 'No session in server.';
		}
	} else {
		result.message = 'No cookies in client.';
	}

	return result;
}

const creds: any = {
	'username': 'password',
};

const Validate = async (username: string, password: string): Promise<boolean> => {

	if (creds[username] && creds[username] === password) {
		return true;
	}

	return false;
}

export const Login = async (context: Tools.Context) => {

	try {
		if (!context.request.body.username || !context.request.body.password)
			throw new Error(`username or password is missing`);

		const username: string = context.request.body.username;
		const password: string = context.request.body.password

		if ((await Validate(username, password)) == false)
			throw new Error(`invalid credentials`);

		const session = new Tools.Session(context.server, username, context);
		context.server.sessions[session.key] = session;

		context.res.setHeader('set-cookie',
		`session-key=${session.key}; Expires=${session.info.expires.toUTCString()}; Path=/`);

		return session.info;
	}
	catch (catchError: any) {
			const e: Error = catchError;
		throw new Tools.ApiError({
			message: 'Login failed',
			status: 401,
			error: e,
		});
	}

}

export const Logout = async (context: Tools.Context) => {

	const sessionKey: string | undefined = context.request.cookies['session-key'];
	if (sessionKey !== undefined) {
		if (context.server.sessions[sessionKey]) {
			context.server.sessions[sessionKey].kill();
			delete context.server.sessions[sessionKey];
		}
		context.res.setHeader('set-cookie', `session-key=''; Expires=${new Date().toUTCString()}`);
	}

	return;
}

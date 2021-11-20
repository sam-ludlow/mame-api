import * as Tools from '../Tools';


export const PostLogin = async (context: Tools.Context): Promise<Tools.SessionInfo> => {
	return await Tools.Auth.Login(context);
}

export const GetLogin = async (context: Tools.Context): Promise<Tools.SessionInfo> => {
	return await Tools.Auth.Status(context);
}

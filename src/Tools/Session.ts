import crypto from "crypto";
import WebSocket from "ws";

import * as Tools from '../Tools';

const EXPIRE_SESSION_MS = 1440 * 60 * 1000;	//	mins

export interface SessionInfo {
	username: string;
	loginTime: Date;
	expires: Date;
	socketPath: string;
	socketAddress: string;
}

export class Session {

	public key: string;

	public info: SessionInfo;

	public socketServer: WebSocket.Server;
	public socketClients: WebSocket[] = [];

	constructor(server: Tools.Server, username: string, context: Tools.Context) {

		this.key = crypto.randomBytes(64).toString('hex');

		const expires = new Date();
		expires.setTime(expires.getTime() + EXPIRE_SESSION_MS);

		const socketPath: string = `/sockets/${crypto.randomBytes(16).toString('hex')}`;

		this.info = {
			username,
			loginTime: new Date(),
			expires,
			socketPath,
			socketAddress: `${context.server.secure ? 'wss://' : 'ws://'}${context.req.headers['host']}${socketPath}`,
		};

		this.socketServer = new WebSocket.Server({
			server: server.server,
			path: this.info.socketPath,
		});
		this.socketServer.addListener('connection', this.socketConnection);

		console.log(`Started WebSocket server ${this.info.socketPath}`);
	}

	private socketConnection = (socket: WebSocket) => {

		this.socketClients.push(socket);

		socket.on('message', (data: WebSocket.Data) => {

			
			console.log('ws message: ' +  data.toString());
		});

		socket.on('close', (code: number, reason: string) => {
			this.socketClients = this.socketClients.filter(clientSocket => clientSocket !== socket);
			console.log('ws close : ' + code + ' : ' + reason);
		});

		console.log('ws connection');
	}

	public socketWrite = (data: string) => {
		this.socketClients.forEach((socket: WebSocket) => {
			socket.send(data);
		});
	}

	public kill = () => {
		while (this.socketClients.length) {
			this.socketClients.pop()?.close();
		}
		this.socketServer.close();
	}
}


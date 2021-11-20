import fs from "fs";
import https from "https";

export class Config {

	public Varibles: any;
	public EnviromentVaribles: any;

	public RunProfileName: string;

	public Port: number;
	public httpsServerOptions?: https.ServerOptions;

	constructor(runProfiles: any) {

		this.EnviromentVaribles = {};

		Object.keys(process.env).forEach((envKey) => {
			this.EnviromentVaribles[envKey] = process.env[envKey];
		});


		this.Varibles = {};

		process.argv.forEach((arg: string) => {
			if (arg.includes('=') === true) {
				const pair: string[] = arg.split('=');
				if (pair.length === 2)
				this.Varibles[pair[0]] = pair[1];
			}
		});

		this.RunProfileName = this.Varibles['SPL_RUN_PROFILE'];
		if (!this.RunProfileName) {
			console.log('Using default run profile ("SPL_RUN_PROFILE") "local".');
			this.RunProfileName = 'local';
		}

		const runProfile: any = runProfiles[this.RunProfileName];

		if (!runProfile)
			throw new Error(`Bad run profile ("SPL_RUN_PROFILE") "${this.RunProfileName}"."`);

		this.Port = runProfile.port;

		if (runProfile.key) {
			this.httpsServerOptions = {
				key: fs.readFileSync(runProfile.key),
				cert: fs.readFileSync(runProfile.cert),
			};
		}
	}
}

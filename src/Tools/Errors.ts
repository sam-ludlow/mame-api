import * as Model from '../Model';

export class ApiError extends Error {

	public status: number;
	public error: Error | undefined;

	constructor(config: Model.ApiErrorConfig) {
		super(config.message);
		this.name = 'ApiError';
		this.status = config.status;
		this.error = config.error;
	}
}

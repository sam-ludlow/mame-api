import axios, { AxiosResponse, AxiosError,  Method } from "axios";  

import * as Model from '../Model';

export const Request = async (requestConfig: Model.HttpRequestConfig): Promise<Model.HttpResponse> => {
	try {
		let response: AxiosResponse = await axios.request({
			method: <Method>requestConfig.method,
			url: requestConfig.url,
			data: requestConfig.data,
			headers: requestConfig.headers,
		});

		return {
			data: response.data,
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		}
	}
	catch (e: any) {
        if (e.isAxiosError === true) {
            const error: AxiosError = e;
            throw error;
        } else {
            throw e;
        }
	}
}

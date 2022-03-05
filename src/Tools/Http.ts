import axios, { AxiosResponse, AxiosError, AxiosRequestConfig, Method, responseEncoding } from "axios";  

import * as Model from '../Model';

export const Request = async (requestConfig: Model.HttpRequestConfig): Promise<Model.HttpResponse> => {
	try {

		const axiosConfig: AxiosRequestConfig = {
			method: <Method>requestConfig.method,
			url: requestConfig.url,
			data: requestConfig.data,
			headers: requestConfig.headers,
		};

		if (requestConfig.binary) {
            axiosConfig.responseType = 'arraybuffer';
			axiosConfig.responseEncoding = 'binary';
		}

		let response: AxiosResponse = await axios.request(axiosConfig);

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
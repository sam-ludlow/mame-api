import * as Tools from '../Tools';
import * as Model from '../Model';
import { ApiError } from '../Tools';

const systemFileNames: any = {
    mame: 'MachineFilter.json.zip',
    hbmame: 'HBMachineFilter.json.zip',
    fbneo: 'FBNeoMachineFilter.json.zip',
};

export const GetZipJson = async (context: Tools.Context): Promise<any> => {

    const system: string = context.request.pathParameters['system'];

    console.log(context.request.pathParameters);

    const filename: string = systemFileNames[system];

    if (!filename)
        throw new ApiError({
            message: `System not found: ${system}`,
            status: 404,
            error: undefined,
        });


    const response: Model.HttpResponse = await Tools.Http.Request({
        method: 'get',
        url: `https://mame.spludlow.co.uk/WebData/${filename}`,
        data: undefined,
        headers: undefined,
        binary: true,
    });

    if (response.status !== 200)
        throw new Error('Bad status');

    context.response.contentType = "application/octet-stream";

    return response.data;
}


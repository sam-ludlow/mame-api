import * as Tools from '../Tools';
import * as Model from '../Model';



export const BuildCache = async (): Promise<any> => {

    const cache: any = {};

    const sqlClient = new Tools.Data.SqlClient('SPLCAL-MAIN', 'FBNeoMachine');
    await sqlClient.Open();
    try {
        const tableNames = await sqlClient.TableList();

        for await (const tableName of tableNames) {
            cache[tableName] = await sqlClient.Request(`SELECT * FROM [${tableName}]`);
        }
    } finally {
        await sqlClient.Close();
    }

    return {
        Tables: cache,
    };
}

export class FBNeoApplicationServer implements Model.ApplicationServer {
    
    public Cache: any;
    public Key: string;

    constructor(key: string, cache: any) {

        this.Key = key;
        this.Cache = cache;

        //  Non-persistant caches
        this.Cache['Games'] = {};

    }


    public GetDataFiles = async (context: Tools.Context): Promise<any> => {

        const offset: number = context.request.queryParameters['offset'].slice(-1)[0];
        const limit: number = context.request.queryParameters['limit'].slice(-1)[0];

        const datafiles = this.Cache.Tables['datafile'];

        return {
            count: datafiles.length,
            results: datafiles.slice(offset, offset + limit),
        };
    }


    public GetZipJson = async (context: Tools.Context): Promise<any> => {

        const version: string = context.request.pathParameters['version'];

       const response: Model.HttpResponse = await Tools.Http.Request({
            method: 'get',
            url: `https://mame.spludlow.co.uk/WebData/FBNeo/JSON/${version}`,
            data: undefined,
            headers: undefined,
        });

        if (response.status !== 200)
            throw new Error('Bad status');

        context.response.contentType = "application/octet-stream";

        return response.data;
    }


}

import * as Tools from '../Tools';
import * as Model from '../Model';
import { ApiError } from '../Tools';



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


    public GetReleases = async (context: Tools.Context): Promise<any> => {

        const response: Model.HttpResponse = await Tools.Http.Request({
            method: 'get',
            url: `https://mame.spludlow.co.uk/WebData/FBNeo/JSON/index.txt`,
            data: undefined,
            headers: undefined,
            binary: false,
        });

        const results: any[] = [];

        const input: string = response.data;

        const columnIndexes: any = {};

        input.split('\r\n').forEach((line: string, lineNumber: number) => {

            line = line.trim();

            if (line.length > 0) {
                const data: any = {};

                line.split('\t').forEach((column: string, columnNumber: number) => {
    
                    if (lineNumber == 0) {
                        columnIndexes[columnNumber] = column;
                    } else {
                        if (lineNumber > 1) {
                            data[columnIndexes[columnNumber.toString()]] = column;
                        }
                    }
    
                });
    
                if (lineNumber > 1)
                    results.push(data);
            }
        });

        return {
            count: results.length,
            results,
        };
    }

    public GetZipJson = async (context: Tools.Context): Promise<any> => {

        const version: string = context.request.pathParameters['version'];

       const response: Model.HttpResponse = await Tools.Http.Request({
            method: 'get',
            url: `https://mame.spludlow.co.uk/WebData/FBNeo/JSON/${version}.zip`,
            data: undefined,
            headers: undefined,
            binary: true,
        });

        if (response.status === 404)
            throw new ApiError({
                message: `Release not found: ${version}`,
                status: 404,
                error: undefined,
            });

        if (response.status !== 200)
            throw new Error('Bad status');

        context.response.contentType = "application/octet-stream";

        return response.data;
    }


}

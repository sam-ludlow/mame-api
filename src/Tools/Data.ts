
import path from "path";
import * as Tedious from 'tedious';

import { AxiosError } from 'axios';

import * as Model from '../Model';
import * as Tools from '../Tools';

export class SqlClient {

    public Connection: Tedious.Connection;

    constructor(server: string, database: string) {

        this.Connection = new Tedious.Connection({
            server,
            authentication: {
                type: 'default',
                options: {
                    userName: 'api',
                    password: 'api',
                }
            },
            options: {
                database,
                rowCollectionOnRequestCompletion: true,
            },
        });
    }

    public Open = async (): Promise<void> => {
        return new Promise((resolve, reject) => {
            this.Connection.connect((err?: Error) => {
                if (err)
                    reject(err);
                else
                    resolve();

            });
        });
    }

    public Close = async (): Promise<void> => {
        return new Promise((resolve, reject) => {
            this.Connection.on('end', () => {
                resolve();
            });
            this.Connection.close();
        });
    }

    public Request = async (commandText: string): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            const request: Tedious.Request = new Tedious.Request(commandText, (error: Error, rowCount: number, rows: any[]) => {
                if (error)
                    reject(error);
    
                rows = this.mapRows(rows);
                resolve(rows);
            });
            this.Connection.execSql(request);
        });
    }

    public TableList = async () => {
        const response: any[] = await this.Request('SELECT sys.tables.name AS TableName, sys.schemas.name as SchemaName FROM sys.tables INNER JOIN sys.schemas ON sys.tables.schema_id = sys.schemas.schema_id');

        const names: string[] = [];
        response.forEach((row: any) => {
            let name: string = row.TableName;
            if (name !== 'sysdiagrams') {
                if (row.SchemaName !== 'dbo')
                    name = row.SchemaName + '.' + name;
                names.push(name);
            }
        });

        return names;
    }

    private mapRows = (rows: any[]): any[] => {
        const newRows: any[] = [];
        rows.forEach((row) => {
            const newRow: any = {};
            row.forEach((column: any) => {
                newRow[column.metadata.colName] = column.value;
            });
            newRows.push(newRow);
        });
        return newRows;
    }
}

export const JsonToDirectory = async (directoryName: string, server: string, database: string, tableNames: string[] | undefined) => {
    const sqlClient = new Tools.Data.SqlClient(server, database);
    await sqlClient.Open();
    try {
        for await (const tableName of tableNames || (await sqlClient.TableList())) {
            const table: any[] = await sqlClient.Request(`SELECT * FROM [${tableName}]`);

            table.forEach((row: any) => {
                row['_table_name'] = tableName;

                //  Fix _Ids _ids
                Object.keys(row).forEach((columnName: string) => {
                    if (columnName.endsWith('_Id')) {
                        row[`_${columnName.slice(0, -3)}_id`] = row[columnName];
                        delete row[columnName];
                    }
                });
            });

            const json = JSON.stringify(table, null, '\t');

            const filename = path.join(directoryName, `${tableName}.json`);
            await Tools.IO.FileWrite(filename, json);
        }
    } finally {
        await sqlClient.Close();
    }
}


export const SolrRead = async (context: Tools.Context, requestQuery: any): Promise<any> => {
    /* const pairs: string[][] = [];

    if (request.q !== '')
        pairs.push(['q', request.q]);

    request.fq.forEach(value => {
        pairs.push(['fq', value]);
    });

    request.fl.forEach(value => {
        pairs.push(['fl', value]);
    });

    if (request.sort !== '')
        pairs.push(['sort', request.sort]);

    if (request.start !== -1)
        pairs.push(['start', request.start.toString()]);
    if (request.rows !== -1)
        pairs.push(['rows', request.rows.toString()]);

    if (request.facet) {
        pairs.push(['facet', 'on']);
        if (request.facet.mincount)
            pairs.push(['facet.mincount', request.facet.mincount.toString()]);
        if (request.facet.field)
            pairs.push(['facet.field', request.facet.field]);
        if (request.facet.sort)
            pairs.push(['facet.sort', request.facet.sort]);
	}

    let data = '';
    pairs.forEach((pair) => {
        if (data.length > 0) data += '&';
        data += encodeURIComponent(pair[0]);
        data += '=';
        data += encodeURIComponent(pair[1]);
    }); */

    //  https://solr.apache.org/guide/8_11/json-request-api.html

    try {
        const httpResponse: Model.HttpResponse = await Tools.Http.Request({
            method: 'POST',
            url: 'http://localhost:8983/solr/tosec/select?wt=json&json.nl=flat',
            data: requestQuery,
            headers: {},
        });

        return httpResponse.data;
    }
    catch (catchError: any) {
        if (catchError.isAxiosError === true) {
            const e: AxiosError = catchError;

            if (e.response?.status === 400) {
                let responseData: string | undefined;
                if (e.response.data) {
                    if (e.response.data.error && e.response.data.error.msg)
                        responseData = e.response.data.error.msg;
                    else
                        responseData = JSON.stringify(e.response.data);
				}
                throw new Tools.ApiError({
                    status: 500,
                    message: `Solr Query Error # ${responseData} # ${requestQuery}`,
                    error: e,
                });
			}
            throw e;
        } else {
            throw catchError;
        }

	}
}
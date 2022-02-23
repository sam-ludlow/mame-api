
import path from "path";
import * as Tedious from 'tedious';

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
                trustServerCertificate: true,
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
                row['table_id'] = tableName;
            });

            const json = JSON.stringify(table, null, '\t');

            const filename = path.join(directoryName, `${tableName}.json`);
            await Tools.IO.FileWrite(filename, json);
        }
    } finally {
        await sqlClient.Close();
    }
}

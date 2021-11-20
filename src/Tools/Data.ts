
import * as Tedious from 'tedious';

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

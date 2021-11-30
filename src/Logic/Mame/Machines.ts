import * as Tools from '../../Tools';

export class MameApplicationServer {
    
    public cache: any = {};
    public mameRelease: string = '';

    constructor(server: Tools.Server) {

        if (server.cache['MAME'] === undefined)
            server.cache['MAME'] = this.cache;
        else
            this.cache = server.cache['MAME'];
    }
}

export const GetMameApplicationServer = (server: Tools.Server) => {

    let appServer: MameApplicationServer = server.applicationServers['MAME'];
    if (appServer === undefined)
        appServer = new MameApplicationServer(server);
    server.applicationServers['MAME'] = appServer;

    // !!! Not best place (init app server when cache loaded)
    if (appServer.mameRelease === '' && appServer.cache['Tables'] !== undefined) {
        const mameRows: any[] = appServer.cache['Tables']['mame'];
        appServer.mameRelease = mameRows[0].build;
    
        console.log(`MameRelease: ${appServer.mameRelease}`);
    }

    return server.applicationServers['MAME'];
}

export const ServerStartup = async (server: Tools.Server) => {
    
    const appServer: MameApplicationServer = GetMameApplicationServer(server);

    appServer.cache['Tables'] = await BuildCache();
    appServer.cache['Machines'] = {};
}

export const GetAbout = async (context: Tools.Context): Promise<any> => {

    const appServer: MameApplicationServer = GetMameApplicationServer(context.server);

    const table_row_counts: any = {};

    Object.keys(appServer.cache['Tables']).forEach((tableName) => {
        table_row_counts[tableName] = appServer.cache['Tables'][tableName].length;
    });

    return {
        release: appServer.mameRelease,
        table_row_counts,
    };
}

const facetPropertyNames = ['manufacturer', 'year']; 

export const GetMachines = async (context: Tools.Context): Promise<any> => {

    const appServer: MameApplicationServer = GetMameApplicationServer(context.server);

    const offset: number = context.request.queryParameters['offset'].slice(-1)[0];
    const limit: number = context.request.queryParameters['limit'].slice(-1)[0];

    const sort: string = context.request.queryParameters['sort'].slice(-1)[0];
    const order: string = context.request.queryParameters['order'].slice(-1)[0];

    // Sort ALL machines (cached)
    const sortCacheKey = `machines-${sort}-${order}`;
    let machines: any[] = appServer.cache[sortCacheKey];
    if (!machines) {

        machines = appServer.cache.Tables['machine'];
        machines = [...machines];
    
        machines.sort((a: any, b: any) => {
            const direction: number = order === 'asc' ? -1 : 1;
            if (a[sort] < b[sort])
                return direction;
            if (a[sort] > b[sort])
                return -direction;
            return 0;
        });

        appServer.cache[sortCacheKey] = machines;
    }

    // Filter
    const filter: any = {};
    facetPropertyNames.forEach((properptyName) => {
        const filterValues: string[] = context.request.queryParameters[`filter_${properptyName}`];
        if (filterValues !== undefined) {
            filter[properptyName] = filterValues;

            machines = machines.filter((machine: any) => filterValues.includes(machine[properptyName]));
        }
    });


    // Facet value counts
    const facets: any = {};
    facetPropertyNames.forEach((facetPropertyName) => {
        facets[facetPropertyName] = {};
    });
    machines.forEach((machine) => {
        facetPropertyNames.forEach((facetPropertyName) => {
            if (machine[facetPropertyName] !== undefined) {
                const value: any = machine[facetPropertyName];

                const facet = facets[facetPropertyName];

                if (facet[value] === undefined)
                    facet[value] = 0;

                ++facet[value];
            }
        });
    });

    //  Facet sort on value names
    facetPropertyNames.forEach((facetPropertyName) => {
        const facet = facets[facetPropertyName];

        const sortedFacet: any = {
            '__OTHER': 0,
        };

        const sortedValues = Object.keys(facet).sort();

        sortedValues.forEach((value) => {
            const count: number = facet[value];

            if (count >= 10)
                sortedFacet[value] = facet[value];
            else
                ++sortedFacet['__OTHER'];

        });
        facets[facetPropertyName] = sortedFacet;
    });

    return {
        count: machines.length,
        filter,
        facets,
        results: machines.slice(offset, offset + limit),
    };
}

const machineTableNames: string[] = [
    'mame',
    'machine',
    'rom',
    'adjuster',
    'biosset',
    'chip',
    'configuration',
    'control',
    'device',
    'device_ref',
    'dipswitch',
    'disk',
    'display',
    'driver',
    'feature',
    'input',
    'port',
    'ramoption',
    'sample',
    'slot',
    'softwarelist',
    'sound',
];

export const BuildCache = async (): Promise<any> => {

    const cache: any = {};

    const sqlClient = new Tools.Data.SqlClient('SPLCAL-MAIN', 'MameMachines');
    await sqlClient.Open();
    try {

        for await (const tableName of machineTableNames) {
   
            let commandText: string = `SELECT * FROM ${tableName}`;

            if (tableName === 'control')
                commandText = `SELECT input.machine_Id, control.* FROM [input] INNER JOIN control ON input.input_Id = control.input_Id`;

            cache[tableName] = await sqlClient.Request(commandText);

        }


    } finally {
        await sqlClient.Close();
    }

    return cache;
}

export const GetMachine = async (context: Tools.Context): Promise<any> => {

    const appServer: MameApplicationServer = GetMameApplicationServer(context.server);

    const machineName: string = context.request.pathParameters['name'];

    let dataSet: any = appServer.cache.Machines[machineName];

    if (!dataSet) {
        dataSet = {};

        const tables = appServer.cache.Tables;

        const machineRows = tables['machine'].filter((item: any) => item.name === machineName);

        if (machineRows.length !== 1)
            throw new Tools.ApiError({
                status: 404,
                message: 'machine not found',
                error: undefined,
            });

        const machine_Id = machineRows[0].machine_Id;

        for await (const tableName of machineTableNames) {
        
            const rows = tables[tableName].filter((item: any) => item.machine_Id === machine_Id);
            if (rows.length)
                dataSet[tableName] = rows;
        }

        appServer.cache.Machines[machineName] = dataSet;
    }

    return dataSet;
}

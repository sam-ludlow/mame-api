import * as Tools from '../../Tools';

export const ServerStartup = async (server: Tools.Server) => {

    server.cache['Tables'] = await BuildCache();
    server.cache['Machines'] = {};

    const mameRows: any[] = server.cache['Tables']['mame'];
    server.cache['MameRelease'] = mameRows[0].build;
    console.log(`MameRelease: ${server.cache.MameRelease}`);
}

export const GetAbout = async (context: Tools.Context): Promise<any> => {

    const table_row_counts: any = {};

    Object.keys(context.server.cache['Tables']).forEach((tableName) => {
        table_row_counts[tableName] = context.server.cache['Tables'][tableName].length;
    });

    return {
        release: context.server.cache.MameRelease,
        table_row_counts,
    };
}

const facetPropertyNames = ['manufacturer', 'year']; 

export const GetMachines = async (context: Tools.Context): Promise<any> => {

    const offset: number = context.request.queryParameters['offset'].slice(-1)[0];
    const limit: number = context.request.queryParameters['limit'].slice(-1)[0];

    const sort: string = context.request.queryParameters['sort'].slice(-1)[0];
    const order: string = context.request.queryParameters['order'].slice(-1)[0];

    // Sort ALL machines (cached)
    const sortCacheKey = `machines-${sort}-${order}`;
    let machines: any[] = context.server.cache[sortCacheKey];
    if (!machines) {

        machines = context.server.cache.Tables['machine'];
        machines = [...machines];
    
        machines.sort((a: any, b: any) => {
            const direction: number = order === 'asc' ? -1 : 1;
            if (a[sort] < b[sort])
                return direction;
            if (a[sort] > b[sort])
                return -direction;
            return 0;
        });

        context.server.cache[sortCacheKey] = machines;
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

    const machineName: string = context.request.pathParameters['name'];

    let dataSet: any = context.server.cache.Machines[machineName];

    if (!dataSet) {
        dataSet = {};

        const tables = context.server.cache.Tables;

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

        context.server.cache.Machines[machineName] = dataSet;
    }

    return dataSet;
}

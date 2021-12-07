import * as Tools from '../Tools';
import * as Model from '../Model';

export const BuildCache = async (): Promise<any> => {

    const cache: any = {};

    const sqlClient = new Tools.Data.SqlClient('SPLCAL-MAIN', 'TOSEC');
    await sqlClient.Open();
    try {
        const tableNames = await sqlClient.TableList();

        for await (const tableName of tableNames) {
            cache[tableName] = await sqlClient.Request(`SELECT * FROM [${tableName}]`);
        }
    } finally {
        await sqlClient.Close();
    }

    const games: any[] = cache.game;
    const roms: any[] = cache.rom;

    const gameIdDatafileIdLookup: any = {};
    games.forEach((game: any) => {
        gameIdDatafileIdLookup[game.game_Id] = game.datafile_Id;
    });

    roms.forEach((rom: any) => {
        rom.datafile_Id = gameIdDatafileIdLookup[rom.game_Id];
    });

    return {
        Tables: cache,
    };
}

export class TOSECApplicationServer implements Model.ApplicationServer {
    
    public Cache: any;
    public Key: string;

    public DatafileIdNameLookup: any = {};
    public GameIdNameLookup: any = {};

    constructor(key: string, cache: any) {

        this.Key = key;
        this.Cache = cache;

        //  Non-persistant caches
        this.Cache['Games'] = {};

        const datafiles: any[] = cache.Tables.datafile;
        datafiles.forEach((datafile) => {
            this.DatafileIdNameLookup[datafile.datafile_Id] = datafile.name;
        });

        const roms: any[] = cache.Tables.rom;
        roms.forEach((rom) => {
            this.GameIdNameLookup[rom.rom_Id] = rom.name;
        });
    }

    private Filter = (items: any[], properptyNames: any, queryParameters: any): any => {
        const filter: any = {};

        properptyNames.forEach((properptyName: string) => {
            const filterValues: string[] = queryParameters[`filter_${properptyName}`];
            if (filterValues !== undefined) {
                const ids: number[] = this.Cache.Tables[properptyName]
                    .filter((item: any) => filterValues.includes(item.name))
                    .map((item: any) => item[`${properptyName}_Id`]);

                items = items.filter((rom: any) => ids.includes(rom[`${properptyName}_Id`]));

                filter[properptyName] = filterValues;
            }
        });

        return {
            items,
            filter,
        };
    }

    public GetDataFiles = async (context: Tools.Context): Promise<any> => {

        let datafiles = this.Cache.Tables['datafile'];

        const count = datafiles.length;

        // Slice
        const offset: number = context.request.queryParameters['offset'].slice(-1)[0];
        const limit: number = context.request.queryParameters['limit'].slice(-1)[0];
        datafiles = datafiles.slice(offset, offset + limit);

        // Prepare
        datafiles = datafiles.map((item: any) => ({...item}));
        datafiles.forEach((datafile: any) => {
            delete datafile.datafile_Id;
        });

        return {
            count: count,
            results: datafiles,
        };
    }

    public GetGames = async (context: Tools.Context): Promise<any> => {

        const facetPropertyNames = ['datafile'];

        let games: any[] = this.Cache.Tables['game'];

        // Filter
        const { items, filter } = this.Filter(games, facetPropertyNames, context.request.queryParameters);
        games = items;

        // Slice
        const count = games.length;
        const offset: number = context.request.queryParameters['offset'].slice(-1)[0];
        const limit: number = context.request.queryParameters['limit'].slice(-1)[0];
        games = games.slice(offset, offset + limit);

        // Prepare
        games = games.map((item: any) => ({...item}));
        games.forEach((game: any) => {

            game.datafile_name = this.DatafileIdNameLookup[game.datafile_Id];

            delete game.game_Id;
            delete game.datafile_Id;
        });
        
        return {
            count,
            filter,
            results: games,
        };
    }

    public GetRoms = async (context: Tools.Context): Promise<any> => {

        const facetPropertyNames = ['datafile', 'game'];

        let roms: any[] = this.Cache.Tables['rom'];

        // Filter
        const { items, filter } = this.Filter(roms, facetPropertyNames, context.request.queryParameters);
        roms = items;

        // Slice
        const count = roms.length;
        const offset: number = context.request.queryParameters['offset'].slice(-1)[0];
        const limit: number = context.request.queryParameters['limit'].slice(-1)[0];
        roms = roms.slice(offset, offset + limit);

        // Prepare
        roms = roms.map((item: any) => ({...item}));
        roms.forEach((rom: any) => {

            rom.game_name = this.GameIdNameLookup[rom.game_Id];
            rom.datafile_name = this.DatafileIdNameLookup[rom.datafile_Id];

            delete rom.rom_Id;
            delete rom.game_Id;
            delete rom.datafile_Id;
        });

        return {
            count,
            filter,
            results: roms,
        };
    }

}

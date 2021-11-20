export * as Auth from './Auth';
export * from './Config';
export * from './Context';
export * as Data from './Data';
export * from './Errors';
export * as IO from './IO';
export * from './Log';
export * as Response from './Response';
export * from './Server';
export * from './Session';
export * as Swagger from './Swagger';

export const Sleep = (seconds: number) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

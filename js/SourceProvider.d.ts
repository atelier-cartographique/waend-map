/// <reference types="bluebird" />
import * as Promise from 'bluebird';
import Source from './Source';
export declare class SourceProvider {
    private sources;
    private currentPath;
    private userId;
    private groupId;
    private group;
    constructor();
    updateGroup(userId: string, groupId: string, opt_force?: boolean): void;
    clearLayers(): void;
    updateLayers(): void;
    loadLayers(): Promise<void>;
    getSources(): Source[];
}
export default function (): SourceProvider;

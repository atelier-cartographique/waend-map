import { BaseSource, Layer, Feature, ModelData } from 'waend-lib';
declare class Source extends BaseSource<Feature> {
    readonly id: string;
    readonly layer: Layer;
    private uid;
    private gid;
    constructor(uid: string, gid: string, layer: Layer);
    update(): void;
    toJSON(features?: Feature[]): ModelData[];
}
export default Source;

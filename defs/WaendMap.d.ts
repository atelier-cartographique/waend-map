/// <reference types="rbush" />
import { Extent, Feature } from 'waend-lib';
import View from './View';
import Source from './Source';
export interface MapOptions {
    root: Element;
    defaultProgramUrl: string;
    mediaUrl: string;
    projection?: string;
    extent?: Extent;
}
export default class WaendMap {
    private mediaUrl;
    private defaultProgramUrl;
    private view;
    private renderers;
    constructor(options: MapOptions);
    listenToWaend(): void;
    unlistenToWaend(): void;
    projectedExtent(extent: Extent): Extent;
    waendUpdateExtent(extent: Extent): void;
    waendUpdateRegion(): void;
    setVisibility(layerIds: string[]): void;
    render(): void;
    waendAddSource(source: Source): void;
    waendRemoveSource(source: Source): void;
    getCoordinateFromPixel(pixel: number[]): number[];
    getPixelFromCoordinate(coord: number[]): number[];
    getView(): View;
    getFeatures(extent?: Extent | number[] | rbush.BBox): Feature[];
}

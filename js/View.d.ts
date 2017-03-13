/// <reference types="proj4" />
/// <reference types="rbush" />
import { InterfaceProjection } from 'proj4';
import { Transform, Extent, Feature } from 'waend-lib';
import Navigator from './Navigator';
import WaendMap from './WaendMap';
import Source from './Source';
export interface ViewOptions {
    root: Element;
    map: WaendMap;
    extent: Extent;
}
export interface Context extends CanvasRenderingContext2D {
    id: string;
}
export default class View {
    private canvas;
    private contexts;
    private extent;
    private sources;
    private map;
    private root;
    readonly navigator: Navigator;
    readonly transform: Transform;
    size: {
        width: number;
        height: number;
    };
    constructor(options: ViewOptions);
    resize(): void;
    getRect(): ClientRect;
    translate(dx: number, dy: number): this;
    scale(sx: number, sy: number): this;
    setExtent(extent: Extent): void;
    setTransform(): void;
    getGeoExtent(projection: InterfaceProjection): number[];
    getProjectedPointOnView(x: number, y: number): number[];
    getViewPointProjected(x: number, y: number): number[];
    getLayer(layerId: string): Source | null;
    getCanvas(layerId: string): HTMLCanvasElement | null;
    getContext(layerId: string): Context | null;
    getFeatures(extent?: Extent | number[] | rbush.BBox): Feature[];
    createCanvas(layerId: string): HTMLCanvasElement;
    createContext(layerId: string, canvas: HTMLCanvasElement): number;
    addSource(source: Source): this;
    removeSource(source: Source): this;
    reorderLayers(ids: string[]): void;
    forEachImage(fn: (a: ImageData) => void): void;
}

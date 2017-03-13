import Painter from './Painter';
import { CoordPolygon, ImageOptions } from "waend-lib";
export default class Image {
    private painter;
    private cancelDrawing;
    constructor(painter: Painter);
    load(coordinates: CoordPolygon, extentArray: number[], options: ImageOptions): void;
    cancel(): void;
}

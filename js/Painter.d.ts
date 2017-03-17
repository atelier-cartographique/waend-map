import { CoordLinestring, CoordPolygon, ContextValue, DrawingInstruction, PainterCommand, ImageOptions } from 'waend-lib';
import View, { Context } from './View';
export interface PainterOptions {
    view: View;
    layerId: string;
    mediaUrl: string;
    defaultProgramUrl: string;
}
declare class Painter {
    private view;
    private mediaUrl;
    private defaultProgramUrl;
    protected hasContext: boolean;
    private imagesLoading;
    private stateInc;
    private transform;
    private restoreContext;
    private textures;
    context: Context;
    constructor(options: PainterOptions);
    getMediaUrl(): string;
    setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
    resetTransform(): void;
    clear(): void;
    clearRect(extent: number[]): void;
    save(): void;
    restore(): void;
    set(prop: string, value: ContextValue): void;
    startTexture(tid: string): void;
    endTexture(): void;
    applyTexture(tid: string): void;
    drawPolygon(coordinates: CoordPolygon, ends?: ("closePath" | "stroke" | "fill" | "clip")[]): void;
    image(coordinates: CoordPolygon, extentArray: number[], options: ImageOptions): void;
    drawLine(coordinates: CoordLinestring): void;
    rawContext(method: string, ...args: number[]): void;
    processInstructions(instructions: DrawingInstruction[]): void;
    processCommands(commands: PainterCommand[]): void;
}
export default Painter;

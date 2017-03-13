/// <reference types="proj4" />
import { PainterCommand } from 'waend-lib';
import Source from './Source';
import View from "./View";
import { InterfaceProjection } from "proj4";
export interface RendererOptions {
    source: Source;
    view: View;
    projection: InterfaceProjection;
    defaultProgramUrl: string;
}
declare class CanvasRenderer {
    private worker;
    private pendingUpdate;
    private isReady;
    readonly id: string;
    private painter;
    private visible;
    private proj;
    private view;
    private source;
    private features;
    private frameId;
    private defaultProgramUrl;
    constructor(options: RendererOptions);
    setVisibility(v: boolean): void;
    isVisible(): boolean;
    getNewFrameId(): string;
    initWorker(): void;
    drawBackround(): void;
    dispatch(id: string, commands: PainterCommand[]): void;
    render(): void;
    stop(): void;
}
export default CanvasRenderer;

import Source from './Source';
import View from "./View";
export interface RendererOptions {
    source: Source;
    view: View;
    mediaUrl: string;
    defaultProgramUrl: string;
}
declare class CanvasRenderer {
    private worker;
    private pendingUpdate;
    private isReady;
    readonly id: string;
    private painter;
    private visible;
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
    render(): void;
    stop(): void;
}
export default CanvasRenderer;

import { Transform } from 'waend-lib';
import View from "./View";
import WaendMap from "./WaendMap";
export declare class NavigatorMode {
    protected navigator: Navigator;
    protected modeName: string;
    isActive: boolean;
    constructor(navigator: Navigator);
    enter(): void;
    exit(): void;
    getName(): string;
    click(_e: Event): void;
    dblclick(_e: Event): void;
    mousedown(_e: Event): void;
    mousemove(_e: Event): void;
    mouseup(_e: Event): void;
    keydown(_e: Event): void;
    wheel(_e: Event): void;
    keypress(event: KeyboardEvent): void;
    keyup(event: KeyboardEvent): void;
    getMouseEventPos(ev: MouseEvent): number[];
}
export interface NavigatorOptions {
    map: WaendMap;
    view: View;
    [propName: string]: any;
}
export declare class Navigator {
    isStarted: boolean;
    private currentMode;
    private modes;
    readonly map: WaendMap;
    readonly view: View;
    readonly options: any;
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    readonly events: string[];
    constructor(options: NavigatorOptions);
    readonly transform: Transform;
    setupCanvas(): void;
    resize(): void;
    getNode(): HTMLCanvasElement;
    setupModes(): void;
    clear(): void;
    start(): void;
    drawScale(): void;
    draw(): this;
    createMode<T extends NavigatorMode>(Mode: (new (a: Navigator) => T)): this;
    setMode(modeName: string): this;
    getMode(): NavigatorMode;
    dispatcher(event: Event): void;
    zoomIn(): void;
    zoomOut(): void;
    north(): void;
    south(): void;
    east(): void;
    west(): void;
    centerOn(pix: number[]): void;
}
export default Navigator;

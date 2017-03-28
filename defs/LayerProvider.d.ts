/// <reference types="node" />
import { EventEmitter } from 'events';
import Source from './Source';
export declare class LayerProvider extends EventEmitter {
    private sources;
    constructor();
    clearSources(): void;
    addSource(source: Source): void;
    update(sources: Source[]): void;
}
export default function (): LayerProvider;

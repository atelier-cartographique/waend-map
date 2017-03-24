import * as _ from 'lodash';
import { semaphore, Region } from 'waend-shell';
import { Feature, WaendWorker, PainterCommand, EventRenderFrame, EventCancelFrame, EventRenderInit, EventRenderUpdate } from 'waend-lib';
import { pointProject } from 'waend-util';
import Painter from './Painter';
import Source from './Source';
import View from "./View";
import proj4 from "proj4";


export interface RendererOptions {
    source: Source;
    view: View;
    projection: proj4.InterfaceProjection;
    mediaUrl: string;
    defaultProgramUrl: string;
}



class CanvasRenderer {
    private worker: WaendWorker;
    private pendingUpdate: boolean;
    private isReady: boolean;
    readonly id: string;
    private painter: Painter;
    private visible: boolean;
    private proj: proj4.InterfaceProjection;
    private view: View;
    private source: Source;
    private features: { [propName: string]: Feature };
    private frameId: string;
    private defaultProgramUrl: string;

    constructor(options: RendererOptions) {
        this.id = _.uniqueId();
        this.frameId = 'none';
        this.source = options.source;
        this.view = options.view;
        this.proj = options.projection;
        this.defaultProgramUrl = options.defaultProgramUrl;
        this.visible = true;
        this.painter = new Painter({
            view: this.view,
            layerId: this.source.id,
            defaultProgramUrl: options.defaultProgramUrl,
            mediaUrl: options.mediaUrl,
        });
        this.initWorker();
        this.features = {};

        this.worker.on('frame',
            (id: string, commands: PainterCommand[]) => {
                if (id === this.frameId) {
                    this.painter.processCommands(commands);
                }
            });
        semaphore.on('map:update', this.render.bind(this));
    }

    setVisibility(v: boolean) {
        this.visible = v;
    }

    isVisible() {
        return this.visible;
    }

    getNewFrameId() {
        return (`${this.id}.${_.uniqueId()}`);
    }

    initWorker() {
        const layer = this.source.layer;
        const programUrl = layer.get('program', this.defaultProgramUrl);
        this.worker = new WaendWorker(`${programUrl}?l=${this.source.id}`);
        this.worker.start();

        this.source.on('update',
            () => {
                const ack = _.uniqueId('ack.');
                this.worker.once(ack,
                    () => { this.render(); });

                this.worker.post({
                    name: EventRenderInit,
                    models: this.source.toJSON(),
                    ack
                });
            });

        this.source.on('update:feature',
            (feature: Feature) => {
                const ack = _.uniqueId('ack.');
                this.worker.once(ack,
                    () => { this.render(); });

                this.worker.post({
                    name: EventRenderUpdate,
                    models: this.source.toJSON([feature]),
                    ack
                });
            });


        const ack = _.uniqueId('ack.');
        this.worker.once(ack,
            () => {
                this.isReady = true;
                if (this.pendingUpdate) {
                    this.pendingUpdate = false;
                    this.render();
                }
            });

        this.worker.post({
            name: EventRenderInit,
            models: this.source.toJSON(),
            ack
        });

    }

    drawBackround() {
        const we = Region.getWorldExtent();
        const painter = this.painter;
        let tl = we.getTopLeft().getCoordinates();
        let tr = we.getTopRight().getCoordinates();
        let br = we.getBottomRight().getCoordinates();
        let bl = we.getBottomLeft().getCoordinates();
        const trans = this.view.transform.clone();

        tl = trans.mapVec2(pointProject(tl));
        tr = trans.mapVec2(pointProject(tr));
        br = trans.mapVec2(pointProject(br));
        bl = trans.mapVec2(pointProject(bl));

        const coordinates = [[tl, tr, br, bl]];

        painter.save();
        painter.set('strokeStyle', '#888');
        painter.set('lineWidth', '0.5');
        painter.set('fillStyle', '#FFF');
        painter.drawPolygon(coordinates, ['closePath', 'stroke', 'fill']);
        painter.restore();
    }

    render() {
        if (!this.isVisible()) {
            this.painter.clear();
            return;
        }
        if (!this.isReady) {
            this.pendingUpdate = true;
            return;
        }

        const worker = this.worker;
        const extent = this.view.getGeoExtent();
        const transform = this.view.transform.flatMatrix();

        if (this.frameId) {
            worker.post({
                name: EventCancelFrame,
                id: this.frameId,
            });
        }

        this.painter.clear();

        this.frameId = this.getNewFrameId();
        worker.post({
            name: EventRenderFrame,
            id: this.frameId,
            transform,
            extent,
        })
    }

    stop() {
        this.worker.stop();
    }
}


export default CanvasRenderer;

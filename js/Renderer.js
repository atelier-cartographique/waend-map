"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const waend_shell_1 = require("waend-shell");
const waend_lib_1 = require("waend-lib");
const waend_util_1 = require("waend-util");
const Painter_1 = require("./Painter");
class CanvasRenderer {
    constructor(options) {
        this.id = _.uniqueId();
        this.frameId = 'none';
        this.source = options.source;
        this.view = options.view;
        this.proj = options.projection;
        this.defaultProgramUrl = options.defaultProgramUrl;
        this.visible = true;
        this.painter = new Painter_1.default({
            view: this.view,
            layerId: this.source.id,
            defaultProgramUrl: options.defaultProgramUrl,
            mediaUrl: options.mediaUrl,
        });
        this.initWorker();
        this.features = {};
        this.worker.on('frame', (id, commands) => {
            if (id === this.frameId) {
                this.painter.processCommands(commands);
            }
        });
        waend_shell_1.semaphore.on('map:update', this.render.bind(this));
    }
    setVisibility(v) {
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
        this.worker = new waend_lib_1.WaendWorker(layer.get('program', this.defaultProgramUrl));
        this.worker.start();
        this.source.on('update', () => {
            const ack = _.uniqueId('ack.');
            this.worker.once(ack, () => { this.render(); });
            this.worker.post({
                name: waend_lib_1.EventRenderInit,
                models: this.source.toJSON(),
                ack
            });
        });
        this.source.on('update:feature', (feature) => {
            const ack = _.uniqueId('ack.');
            this.worker.once(ack, () => { this.render(); });
            this.worker.post({
                name: waend_lib_1.EventRenderUpdate,
                models: this.source.toJSON([feature]),
                ack
            });
        });
        const ack = _.uniqueId('ack.');
        this.worker.once(ack, () => {
            this.isReady = true;
            if (this.pendingUpdate) {
                this.pendingUpdate = false;
                this.render();
            }
        });
        this.worker.post({
            name: waend_lib_1.EventRenderInit,
            models: this.source.toJSON(),
            ack
        });
    }
    drawBackround() {
        const we = waend_shell_1.Region.getWorldExtent();
        const painter = this.painter;
        let tl = we.getTopLeft().getCoordinates();
        let tr = we.getTopRight().getCoordinates();
        let br = we.getBottomRight().getCoordinates();
        let bl = we.getBottomLeft().getCoordinates();
        const trans = this.view.transform.clone();
        tl = trans.mapVec2(waend_util_1.Proj3857.forward(tl));
        tr = trans.mapVec2(waend_util_1.Proj3857.forward(tr));
        br = trans.mapVec2(waend_util_1.Proj3857.forward(br));
        bl = trans.mapVec2(waend_util_1.Proj3857.forward(bl));
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
        const extent = this.view.getGeoExtent(this.proj);
        const transform = this.view.transform.flatMatrix();
        this.painter.clear();
        this.frameId = this.getNewFrameId();
        worker.post({
            name: waend_lib_1.EventRenderFrame,
            id: this.frameId,
            transform,
            extent,
        });
    }
    stop() {
        this.worker.stop();
    }
}
exports.default = CanvasRenderer;

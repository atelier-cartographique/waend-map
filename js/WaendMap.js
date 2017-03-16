"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const proj4_1 = require("proj4");
const waend_lib_1 = require("waend-lib");
const waend_shell_1 = require("waend-shell");
const Renderer_1 = require("./Renderer");
const View_1 = require("./View");
class WaendMap {
    constructor(options) {
        this.projection = proj4_1.default.Proj(options.projection || 'EPSG:3857');
        this.renderers = {};
        const vo = {
            map: this,
            extent: this.projectedExtent(options.extent || waend_shell_1.region.get()),
            root: options.root
        };
        this.view = new View_1.default(vo);
        this.listenToWaend();
    }
    listenToWaend() {
        waend_shell_1.semaphore.observe('layer:layer:add', this.waendAddSource.bind(this));
        waend_shell_1.semaphore.observe('layer:layer:remove', this.waendRemoveSource.bind(this));
        waend_shell_1.semaphore.observe('region:change', this.waendUpdateExtent.bind(this));
        waend_shell_1.semaphore.observe('visibility:change', this.setVisibility.bind(this));
        waend_shell_1.semaphore.on('please:map:render', this.render.bind(this));
    }
    unlistenToWaend() {
    }
    projectedExtent(extent) {
        const bl = this.projection.forward(extent.getBottomLeft().getCoordinates());
        const tr = this.projection.forward(extent.getTopRight().getCoordinates());
        const pr = [bl[0], bl[1], tr[0], tr[1]];
        return new waend_lib_1.Extent(pr);
    }
    waendUpdateExtent(extent) {
        this.view.setExtent(this.projectedExtent(extent));
        this.render();
    }
    waendUpdateRegion() {
    }
    setVisibility(layerIds) {
        Object.keys(this.renderers)
            .forEach((id) => {
            const renderer = this.renderers[id];
            const vs = renderer.isVisible();
            const ts = _.indexOf(layerIds, id) >= 0;
            if (ts !== vs) {
                renderer.setVisibility(ts);
                renderer.render();
            }
        });
        this.view.reorderLayers(layerIds);
    }
    render() {
        let isBackground = false;
        _.each(this.renderers, rdr => {
            rdr.render();
            if (rdr.isVisible) {
                isBackground = false;
            }
        });
    }
    waendAddSource(source) {
        this.view.addSource(source);
        const renderer = new Renderer_1.default({
            source,
            view: this.view,
            projection: this.projection,
            defaultProgramUrl: this.defaultProgramUrl,
        });
        this.renderers[source.id] = renderer;
        renderer.render();
    }
    waendRemoveSource(source) {
        this.renderers[source.id].stop();
        delete this.renderers[source.id];
        this.view.removeSource(source);
    }
    getCoordinateFromPixel(pixel) {
        const v = Array.from(pixel);
        const inverse = this.view.transform.inverse();
        const tv = inverse.mapVec2(v);
        return this.projection.inverse(tv);
    }
    getPixelFromCoordinate(coord) {
        const v = Array.from(coord);
        const pv = this.projection.forward(v);
        const tv = this.view.transform.mapVec2(pv);
        return tv;
    }
    getView() {
        return this.view;
    }
    getFeatures(extent) {
        return this.view.getFeatures(extent);
    }
}
exports.default = WaendMap;

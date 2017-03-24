"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const waend_lib_1 = require("waend-lib");
const waend_util_1 = require("waend-util");
const waend_shell_1 = require("waend-shell");
const Navigator_1 = require("./Navigator");
const document = window.document;
class View {
    constructor(options) {
        this.root = options.root;
        this.map = options.map;
        this.extent = options.extent;
        this.transform = new waend_lib_1.Transform();
        this.sources = [];
        this.canvas = [];
        this.contexts = [];
        this.resize();
        this.navigator = new Navigator_1.default({
            'container': this.root,
            'map': this.map,
            'view': this
        });
        window.addEventListener('resize', () => this.resize());
        waend_shell_1.semaphore.on('map:resize', () => this.resize());
    }
    resize() {
        const rect = this.getRect();
        this.size = {
            width: rect.width,
            height: rect.height
        };
        this.setTransform();
        for (const canvas of this.canvas) {
            canvas.width = rect.width;
            canvas.height = rect.height;
        }
        if (this.navigator) {
            this.navigator.resize();
        }
        waend_shell_1.semaphore.signal('please:map:render');
        waend_shell_1.semaphore.signal('view:resize', this);
    }
    getRect() {
        return this.root.getBoundingClientRect();
    }
    translate(dx, dy) {
        this.transform.translate(dx, dy);
        return this;
    }
    scale(sx, sy) {
        this.transform.translate(sx, sy);
        return this;
    }
    setExtent(extent) {
        const rect = this.getRect();
        const sx = rect.width / Math.abs(extent.getWidth());
        const sy = rect.height / Math.abs(extent.getHeight());
        const s = (sx < sy) ? sx : sy;
        const center = extent.getCenter().getCoordinates();
        const aExtent = extent.getArray();
        if (sx < sy) {
            const newHeight = rect.height * (1 / s);
            const adjH = newHeight / 2;
            aExtent[1] = center[1] - adjH;
            aExtent[3] = center[1] + adjH;
        }
        else {
            const newWidth = rect.width * (1 / s);
            const adjW = newWidth / 2;
            aExtent[0] = center[0] - adjW;
            aExtent[2] = center[0] + adjW;
        }
        this.extent = new waend_lib_1.Extent(aExtent);
        this.setTransform();
        waend_shell_1.semaphore.signal('view:change', this);
    }
    setTransform() {
        const extent = this.extent;
        const rect = this.getRect();
        const targetCenter = [rect.width / 2, rect.height / 2];
        const sourceCenter = extent.getCenter().getCoordinates();
        const sx = rect.width / Math.abs(extent.getWidth());
        const sy = rect.height / Math.abs(extent.getHeight());
        const s = (sx < sy) ? sx : sy;
        const trX = (targetCenter[0] - sourceCenter[0]) * s;
        const trY = (targetCenter[1] - sourceCenter[1]) * s;
        const axis = [targetCenter[0], targetCenter[1]];
        const t = new waend_lib_1.Transform();
        t.translate(trX, -trY);
        t.scale(s, -s, axis);
        this.transform.reset(t);
    }
    getGeoExtent() {
        const pWorld = waend_shell_1.Region.getWorldExtent().getCoordinates();
        const minPWorld = waend_util_1.pointProject([pWorld[0], pWorld[1]]);
        const maxPWorld = waend_util_1.pointProject([pWorld[2], pWorld[3]]);
        const pExtent = this.extent.bound(minPWorld.concat(maxPWorld));
        const projectedMin = pExtent.getBottomLeft().getCoordinates();
        const projectedMax = pExtent.getTopRight().getCoordinates();
        const min = waend_util_1.pointUnproject(projectedMin);
        const max = waend_util_1.pointUnproject(projectedMax);
        return min.concat(max);
    }
    getProjectedPointOnView(x, y) {
        const v = [x, y];
        const inv = this.transform.inverse();
        return inv.mapVec2(v);
    }
    getViewPointProjected(x, y) {
        const v = [x, y];
        return this.transform.mapVec2(v);
    }
    getLayer(layerId) {
        const idx = _.findIndex(this.sources, source => layerId === source.id);
        if (idx < 0) {
            return null;
        }
        return this.sources[idx];
    }
    getCanvas(layerId) {
        const idx = _.findIndex(this.canvas, cvns => layerId === cvns.id);
        if (idx < 0) {
            return null;
        }
        return this.canvas[idx];
    }
    getContext(layerId) {
        const idx = _.findIndex(this.contexts, ctx => layerId === ctx.id);
        if (idx < 0) {
            return null;
        }
        return this.contexts[idx];
    }
    getFeatures(extent) {
        return (this.sources.reduce((acc, s) => acc.concat(s.getFeatures(extent)), []));
    }
    createCanvas(layerId) {
        const canvas = waend_util_1.dom.CANVAS();
        const rect = this.getRect();
        canvas.id = layerId;
        canvas.width = rect.width;
        canvas.height = rect.height;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = (-this.canvas.length).toString();
        this.canvas.push(canvas);
        this.root.insertBefore(canvas, this.navigator.getNode());
        return canvas;
    }
    createContext(layerId, canvas) {
        const ctx = canvas.getContext('2d');
        ctx.id = layerId;
        this.contexts.push(ctx);
        return (this.contexts.length - 1);
    }
    addSource(source) {
        if (!this.navigator.isStarted) {
            this.navigator.start();
        }
        if (!!(this.getLayer(source.id))) {
            return this;
        }
        const canvas = this.createCanvas(source.id);
        this.createContext(source.id, canvas);
        this.sources.push(source);
        return this;
    }
    removeSource(source) {
        if (!!(this.getLayer(source.id))) {
            this.sources = _.reject(this.sources, l => l.id === source.id);
            this.contexts = _.reject(this.contexts, c => c.id === source.id);
            const canvasElement = document.getElementById(source.id);
            if (canvasElement) {
                this.root.removeChild(canvasElement);
            }
            this.canvas = _.reject(this.canvas, c => c.id === source.id);
        }
        return this;
    }
    reorderLayers(ids) {
        const ll = this.sources.length;
        this.canvas.forEach(cnvs => {
            cnvs.style.zIndex = (-ll).toString();
        });
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const cnvs = this.getCanvas(id);
            if (cnvs) {
                cnvs.style.zIndex = (-i).toString();
            }
        }
    }
    forEachImage(fn) {
        const rect = this.getRect();
        for (const source of this.contexts) {
            const img = source.getImageData(0, 0, rect.width, rect.height);
            fn(img);
        }
    }
}
exports.default = View;

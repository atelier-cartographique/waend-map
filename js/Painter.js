"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const waend_lib_1 = require("waend-lib");
const waend_shell_1 = require("waend-shell");
const waend_util_1 = require("waend-util");
const Image_1 = require("./Image");
const { CANVAS } = waend_util_1.dom;
class Painter {
    constructor(options) {
        this.hasContext = false;
        this.view = options.view;
        this.mediaUrl = options.mediaUrl;
        this.defaultProgramUrl = options.defaultProgramUrl;
        const baseContext = this.view.getContext(options.layerId);
        if (baseContext) {
            this.hasContext = true;
            let currentContext = baseContext;
            Object.defineProperty(this, 'context', {
                get() {
                    return currentContext;
                },
                set(ctx) {
                    currentContext = ctx;
                }
            });
            this.restoreContext = () => {
                currentContext = baseContext;
            };
            this.transform = this.view.transform.clone();
            this.stateInc = 0;
            this.imagesLoading = [];
            this.clear();
            waend_shell_1.semaphore.on('view:change', this.resetTransform.bind(this));
        }
    }
    getMediaUrl() {
        return this.mediaUrl;
    }
    setTransform(a, b, c, d, e, f) {
        this.context.setTransform(a, b, c, d, e, f);
    }
    resetTransform() {
        const view = this.view;
        const T = view.transform;
        this.transform = T.clone();
    }
    clear() {
        while (this.stateInc > 0) {
            this.restore();
        }
        for (let i = 0; i < this.imagesLoading.length; i++) {
            this.imagesLoading[i].cancel();
        }
        this.imagesLoading = [];
        this.textures = {};
        this.resetTransform();
        this.context.clearRect(0, 0, this.view.size.width, this.view.size.height);
        this.context.globalCompositeOperation = 'multiply';
    }
    clearRect(extent) {
        const extObj = new waend_lib_1.Extent(extent);
        const tl = extObj.getBottomLeft().getCoordinates();
        this.context.clearRect(tl[0], tl[1], extObj.getWidth(), extObj.getHeight());
    }
    save() {
        this.context.save();
        this.stateInc += 1;
    }
    restore() {
        this.context.restore();
        this.stateInc -= 1;
    }
    set(prop, value) {
        const ctx = this.context;
        if ('lineDash' === prop) {
            this.context.setLineDash(value);
        }
        else {
            switch (prop) {
                case 'fillStyle':
                    ctx.fillStyle = value;
                    break;
                case 'font':
                    ctx.font = value;
                    break;
                case 'globalAlpha':
                    ctx.globalAlpha = value;
                    break;
                case 'globalCompositeOperation':
                    ctx.globalCompositeOperation = value;
                    break;
                case 'imageSmoothingEnabled':
                    ctx.imageSmoothingEnabled = value;
                    break;
                case 'lineCap':
                    ctx.lineCap = value;
                    break;
                case 'lineDashOffset':
                    ctx.lineDashOffset = value;
                    break;
                case 'lineJoin':
                    ctx.lineJoin = value;
                    break;
                case 'lineWidth':
                    ctx.lineWidth = value;
                    break;
                case 'miterLimit':
                    ctx.miterLimit = value;
                    break;
                case 'msFillRule':
                    ctx.msFillRule = value;
                    break;
                case 'shadowBlur':
                    ctx.shadowBlur = value;
                    break;
                case 'shadowColor':
                    ctx.shadowColor = value;
                    break;
                case 'shadowOffsetX':
                    ctx.shadowOffsetX = value;
                    break;
                case 'shadowOffsetY':
                    ctx.shadowOffsetY = value;
                    break;
                case 'strokeStyle':
                    ctx.strokeStyle = value;
                    break;
                case 'textAlign':
                    ctx.textAlign = value;
                    break;
                case 'textBaseline':
                    ctx.textBaseline = value;
                    break;
                default:
                    break;
            }
        }
    }
    startTexture(tid) {
        const canvas = CANVAS();
        canvas.width = this.context.canvas.width;
        canvas.height = this.context.canvas.height;
        const ctx = canvas.getContext('2d');
        this.textures[tid] = {
            canvas,
            context: ctx
        };
        this.context = ctx;
    }
    endTexture() {
        this.restoreContext();
    }
    applyTexture(tid) {
        const canvas = this.textures[tid].canvas;
        this.context.drawImage(canvas, 0, 0);
    }
    drawPolygon(coordinates, ends = ['closePath', 'stroke']) {
        this.context.beginPath();
        for (const ring of coordinates) {
            for (let ii = 0; ii < ring.length; ii++) {
                const p = ring[ii];
                if (0 === ii) {
                    this.context.moveTo(p[0], p[1]);
                }
                else {
                    this.context.lineTo(p[0], p[1]);
                }
            }
        }
        for (let e = 0; e < ends.length; e++) {
            const end = ends[e];
            switch (end) {
                case 'closePath':
                    this.context.closePath();
                    break;
                case 'stroke':
                    this.context.stroke();
                    break;
                case 'fill':
                    this.context.fill();
                    break;
                case 'clip':
                    this.context.clip();
                    break;
                default:
                    break;
            }
        }
    }
    image(coordinates, extentArray, options) {
        const loader = new Image_1.default(this);
        this.imagesLoading.push(loader);
        loader.load(coordinates, extentArray, options);
    }
    drawLine(coordinates) {
        this.context.beginPath();
        for (let i = 0; i < coordinates.length; i++) {
            const p = coordinates[i];
            if (0 === i) {
                this.context.moveTo(p[0], p[1]);
            }
            else {
                this.context.lineTo(p[0], p[1]);
            }
        }
        this.context.stroke();
    }
    rawContext(method, ...args) {
        let p0;
        let p1;
        let p2;
        switch (method) {
            case 'beginPath':
                this.context.beginPath();
                break;
            case 'moveTo':
                this.context.moveTo(args[0], args[1]);
                break;
            case 'lineTo':
                this.context.lineTo(args[0], args[1]);
                break;
            case 'bezierCurveTo':
                p0 = [args[0], args[1]];
                p1 = [args[2], args[3]];
                p2 = [args[4], args[5]];
                this.context.bezierCurveTo(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1]);
                break;
            case 'quadraticCurveTo':
                p0 = [args[0], args[1]];
                p1 = [args[2], args[3]];
                this.context.quadraticCurveTo(p0[0], p0[1], p1[0], p1[1]);
                break;
            case 'closePath':
                this.context.closePath();
                break;
            case 'stroke':
                this.context.stroke();
                break;
            case 'fill':
                this.context.fill();
                break;
        }
    }
    processInstructions(instructions) {
        for (let i = 0; i < instructions.length; i++) {
            const row = instructions[i];
            const method = row[0];
            const args = [];
            for (let i = 1; i < row.length; i += 1) {
                args.push(row[i]);
            }
            this.rawContext(method, ...args);
        }
    }
    processCommands(commands) {
        commands.forEach((command) => {
            const commandName = command[0];
            const arg0 = command[1];
            const arg1 = command[2];
            const arg2 = command[3];
            const arg3 = command[4];
            const arg4 = command[5];
            const arg5 = command[6];
            switch (commandName) {
                case 'set':
                    this.set(arg0, arg1);
                    break;
                case 'image':
                    this.image(arg0, arg1, arg2);
                    break;
                case 'instructions':
                    this.processInstructions(arg0);
                    break;
                case 'save':
                    this.save();
                    break;
                case 'restore':
                    this.restore();
                    break;
                case 'transform':
                    this.setTransform(arg0, arg1, arg2, arg3, arg4, arg5);
                    break;
                case 'clear':
                    this.clear();
                    break;
                case 'clearRect':
                    this.clearRect(arg0);
                    break;
                case 'startTexture':
                    this.startTexture(arg0);
                    break;
                case 'endTexture':
                    this.endTexture();
                    break;
                case 'applyTexture':
                    this.applyTexture(arg0);
                    break;
                case 'line':
                    this.drawLine(arg0);
                    break;
                case 'polygon':
                    this.drawPolygon(arg0, arg1);
            }
        });
    }
}
exports.default = Painter;

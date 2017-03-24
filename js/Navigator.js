"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const turf_1 = require("@turf/turf");
const helpers_1 = require("@turf/helpers");
const waend_lib_1 = require("waend-lib");
const waend_shell_1 = require("waend-shell");
const debug = require("debug");
const waend_util_1 = require("waend-util");
const { isKeyCode, KeyCode, CANVAS } = waend_util_1.dom;
const logger = debug('waend:Navigator');
function getStep(extent) {
    const width = extent.getWidth();
    const height = extent.getHeight();
    const diag = Math.sqrt((width * width) + (height * height));
    return (diag / 20);
}
function transformRegion(T, opt_extent) {
    const extent = opt_extent.getArray();
    const NE = T.mapVec2([extent[2], extent[3]]);
    const SW = T.mapVec2([extent[0], extent[1]]);
    const newExtent = [SW[0], SW[1], NE[0], NE[1]];
    waend_shell_1.region.push(newExtent);
}
const isKeyI = isKeyCode(KeyCode.KEY_I);
const isKeyO = isKeyCode(KeyCode.KEY_O);
const isKeyUp = isKeyCode(KeyCode.UP_ARROW);
const isKeyDown = isKeyCode(KeyCode.DOWN_ARROW);
const isKeyLeft = isKeyCode(KeyCode.LEFT_ARROW);
const isKeyRight = isKeyCode(KeyCode.RIGHT_ARROW);
class NavigatorMode {
    constructor(navigator) {
        this.navigator = navigator;
        this.isActive = false;
    }
    enter() { }
    exit() { }
    getName() { return this.modeName; }
    click(_e) { }
    dblclick(_e) { }
    mousedown(_e) { }
    mousemove(_e) { }
    mouseup(_e) { }
    keydown(_e) { }
    wheel(_e) { }
    keypress(event) {
        if (isKeyI(event)) {
            this.navigator.zoomIn();
        }
        else if (isKeyO(event)) {
            this.navigator.zoomOut();
        }
    }
    keyup(event) {
        if (isKeyUp(event)) {
            this.navigator.south();
        }
        else if (isKeyDown(event)) {
            this.navigator.north();
        }
        else if (isKeyLeft(event)) {
            this.navigator.east();
        }
        else if (isKeyRight(event)) {
            this.navigator.west();
        }
    }
    getMouseEventPos(ev) {
        if (ev instanceof MouseEvent) {
            const target = ev.target;
            const trect = target.getBoundingClientRect();
            const node = this.navigator.getNode();
            const nrect = node.getBoundingClientRect();
            return [
                ev.clientX - (nrect.left - trect.left),
                ev.clientY - (nrect.top - trect.top)
            ];
        }
        return [0, 0];
    }
}
exports.NavigatorMode = NavigatorMode;
class NavigatorModeBase extends NavigatorMode {
    constructor() {
        super(...arguments);
        this.modeName = 'ModeBase';
    }
    enter() {
        this.navigator.draw();
        this.isActive = true;
    }
    exit() {
        this.navigator.clear();
        this.isActive = false;
    }
    wheel(event) {
        if (Math.abs(event.deltaY) > 2) {
            if (event.deltaY < 0) {
                this.navigator.zoomIn();
            }
            else {
                this.navigator.zoomOut();
            }
        }
    }
    mousedown(event) {
        event.preventDefault();
        event.stopPropagation();
        this.startPoint = this.getMouseEventPos(event);
        this.isStarted = true;
        this.isPanning = !event.shiftKey;
    }
    drawPanControl(hp) {
        const sp = this.startPoint;
        const extent = new waend_lib_1.Extent(sp.concat(hp));
        const ctx = this.navigator.context;
        extent.normalize();
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.save();
        ctx.strokeStyle = '#0092FF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sp[0], sp[1]);
        ctx.lineTo(hp[0], hp[1]);
        const tr0 = new waend_lib_1.Transform();
        const tr1 = new waend_lib_1.Transform();
        const mpX = sp[0] + ((hp[0] - sp[0]) * 0.9);
        const mpY = sp[1] + ((hp[1] - sp[1]) * 0.9);
        const mp0 = [mpX, mpY];
        const mp1 = [mpX, mpY];
        tr0.rotate(60, hp);
        tr1.rotate(-60, hp);
        tr0.mapVec2(mp0);
        tr1.mapVec2(mp1);
        ctx.lineTo(mp0[0], mp0[1]);
        ctx.lineTo(mp1[0], mp1[1]);
        ctx.lineTo(hp[0], hp[1]);
        ctx.stroke();
        ctx.restore();
    }
    drawZoomControl(hp) {
        const sp = this.startPoint;
        const extent = new waend_lib_1.Extent(sp.concat(hp));
        const ctx = this.navigator.context;
        extent.normalize();
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.save();
        ctx.strokeStyle = '#0092FF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sp[0], sp[1]);
        ctx.lineTo(hp[0], sp[1]);
        ctx.lineTo(hp[0], hp[1]);
        ctx.lineTo(sp[0], hp[1]);
        ctx.lineTo(sp[0], sp[1]);
        ctx.stroke();
        ctx.restore();
    }
    mousemove(event) {
        if (this.isStarted) {
            if (this.isPanning) {
                this.drawPanControl(this.getMouseEventPos(event));
            }
            else {
                this.drawZoomControl(this.getMouseEventPos(event));
            }
            if (!this.isMoving) {
                this.isMoving = true;
            }
        }
    }
    mouseup(event) {
        if (this.isStarted) {
            const endPoint = this.getMouseEventPos(event);
            const startPoint = this.startPoint;
            const dist = waend_util_1.vecDist(startPoint, endPoint);
            const map = this.navigator.map;
            const ctx = this.navigator.context;
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            if (dist > 4) {
                const startCoordinates = map.getCoordinateFromPixel(startPoint);
                const endCoordinates = map.getCoordinateFromPixel(endPoint);
                if (this.isPanning) {
                    const T = new waend_lib_1.Transform();
                    var extent = waend_shell_1.region.get();
                    T.translate(startCoordinates[0] - endCoordinates[0], startCoordinates[1] - endCoordinates[1]);
                    transformRegion(T, extent);
                }
                else {
                    var extent = new waend_lib_1.Extent(startCoordinates.concat(endCoordinates));
                    waend_shell_1.region.push(extent);
                }
            }
            else {
                this.navigator.centerOn(startPoint);
            }
            this.isStarted = false;
            this.isZooming = false;
            this.isMoving = false;
        }
    }
}
const NAVIGATOR_MODES = [
    NavigatorModeBase,
];
class Navigator {
    constructor(options) {
        this.isStarted = false;
        this.events = [
            'click', 'dblclick',
            'mousedown', 'mousemove', 'mouseup',
            'keypress', 'keydown', 'keyup',
            'wheel'
        ];
        this.options = options;
        this.setupModes();
        this.setupCanvas();
        this.map = options.map;
        this.view = options.view;
        waend_shell_1.semaphore.observe('region:change', () => {
            const mode = this.getMode();
            if (mode && mode.isActive) {
                this.draw();
            }
        });
        logger('constructed');
    }
    get transform() {
        return this.view.transform.clone();
    }
    setupCanvas() {
        const container = this.options.container, rect = container.getBoundingClientRect();
        this.canvas = CANVAS();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.canvas.style.backgroundColor = 'transparent';
        this.canvas.style.position = 'absolute';
        this.canvas.style.transform = 'translateZ(0)';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        container.appendChild(this.canvas);
        this.canvas.setAttribute('tabindex', '-1');
        const context = this.canvas.getContext('2d');
        if (context) {
            this.context = context;
        }
        for (let i = 0; i < this.events.length; i++) {
            logger('add to dispatcher', this.events[i]);
            this.canvas.addEventListener(this.events[i], (e) => this.dispatcher(e), false);
        }
    }
    resize() {
        const container = this.options.container;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.draw();
    }
    getNode() {
        return this.canvas;
    }
    setupModes() {
        for (let i = 0; i < NAVIGATOR_MODES.length; i++) {
            this.createMode(NAVIGATOR_MODES[i]);
        }
    }
    clear() {
        const rect = this.canvas.getBoundingClientRect();
        this.context.clearRect(0, 0, rect.width, rect.height);
    }
    start() {
        this.isStarted = true;
        this.setMode('ModeBase');
        this.draw();
    }
    drawScale() {
        const ctx = this.context;
        const rect = this.canvas.getBoundingClientRect();
        const extent = waend_shell_1.region.get();
        const bl = waend_util_1.pointProject(extent.getBottomLeft().getCoordinates());
        const tr = waend_util_1.pointProject(extent.getTopRight().getCoordinates());
        const center = waend_util_1.pointProject(extent.getCenter().getCoordinates());
        this.transform.mapVec2(bl);
        this.transform.mapVec2(tr);
        this.transform.mapVec2(center);
        const rightOffset = 64;
        const scaleWidth = 74;
        const right = rect.width - rightOffset;
        let left = rect.width - (scaleWidth + rightOffset);
        const top = rect.height - 17;
        const thickness = 6;
        const length = right - left;
        const hw = ((length - 1) / 2) + left;
        const leftVec = this.map.getCoordinateFromPixel([left, top]);
        const rightVec = this.map.getCoordinateFromPixel([right, top]);
        const dist = turf_1.distance(helpers_1.point(leftVec), helpers_1.point(rightVec), 'kilometers') * 100000;
        const formatNumber = (n) => Math.ceil(n);
        let labelRight;
        let labelCenter;
        if (dist < 100) {
            labelRight = `${formatNumber(dist)} cm`;
            labelCenter = `${formatNumber(dist / 2)} cm`;
        }
        else if (dist < 100000) {
            labelRight = `${formatNumber(dist / 100)} m`;
            labelCenter = `${formatNumber((dist / 2) / 100)} m`;
        }
        else {
            labelRight = `${formatNumber(dist / 100000)} km`;
            labelCenter = `${formatNumber((dist / 2) / 100000)} km`;
        }
        const distDiff = Math.ceil(dist) / dist;
        left = rect.width - ((scaleWidth * distDiff) + rightOffset);
        ctx.save();
        ctx.fillStyle = 'black';
        ctx.font = '11px sansguiltmb';
        ctx.textAlign = 'left';
        ctx.fillText(labelRight, right + 5, top + thickness);
        ctx.restore();
        ctx.save();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.fillRect(left, top, right - left, thickness);
        ctx.restore();
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.fillRect(left + 1, top + 1, (length / 2) - 1, (thickness / 2) - 1);
        ctx.fillRect(hw + 1, top + (thickness / 2), (length / 2) - 1, (thickness / 2) - 1);
        ctx.restore();
    }
    draw() {
        this.clear();
        this.drawScale();
        return this;
    }
    createMode(Mode) {
        const mode = new Mode(this);
        const modeName = mode.getName();
        if (!this.modes) {
            this.modes = {};
        }
        this.modes[modeName] = mode;
        return this;
    }
    setMode(modeName) {
        if (this.currentMode) {
            const oldMode = this.getMode();
            oldMode.exit();
        }
        this.currentMode = modeName;
        const mode = this.getMode();
        mode.enter();
        return this;
    }
    getMode() {
        return this.modes[this.currentMode];
    }
    dispatcher(event) {
        event.preventDefault();
        event.stopPropagation();
        const mode = this.getMode();
        if (mode) {
            switch (event.type) {
                case 'click':
                    mode.click(event);
                    break;
                case 'dblclick':
                    mode.dblclick(event);
                    break;
                case 'mousedown':
                    mode.mousedown(event);
                    break;
                case 'mousemove':
                    mode.mousemove(event);
                    break;
                case 'mouseup':
                    mode.mouseup(event);
                    break;
                case 'keydown':
                    mode.keydown(event);
                    break;
                case 'keypress':
                    mode.keypress(event);
                    break;
                case 'keyup':
                    mode.keyup(event);
                    break;
                case 'wheel':
                    mode.wheel(event);
                    break;
                default:
                    break;
            }
        }
    }
    zoomIn() {
        const extent = waend_shell_1.region.get();
        const val = getStep(extent);
        waend_shell_1.region.push(extent.buffer(-val));
    }
    zoomOut() {
        const extent = waend_shell_1.region.get();
        const val = getStep(extent);
        waend_shell_1.region.push(extent.buffer(val));
    }
    north() {
        const T = new waend_lib_1.Transform();
        const extent = waend_shell_1.region.get();
        const val = getStep(extent);
        T.translate(0, -val);
        transformRegion(T, extent);
    }
    south() {
        const T = new waend_lib_1.Transform();
        const extent = waend_shell_1.region.get();
        const val = getStep(extent);
        T.translate(0, val);
        transformRegion(T, extent);
    }
    east() {
        const T = new waend_lib_1.Transform();
        const extent = waend_shell_1.region.get();
        const val = getStep(extent);
        T.translate(-val, 0);
        transformRegion(T, extent);
    }
    west() {
        const T = new waend_lib_1.Transform();
        const extent = waend_shell_1.region.get();
        const val = getStep(extent);
        T.translate(val, 0);
        transformRegion(T, extent);
    }
    centerOn(pix) {
        const coords = this.map.getCoordinateFromPixel(pix);
        const T = new waend_lib_1.Transform();
        const extent = waend_shell_1.region.get();
        const center = extent.getCenter().getCoordinates();
        T.translate(coords[0] - center[0], coords[1] - center[1]);
        transformRegion(T, extent);
    }
}
exports.Navigator = Navigator;
exports.default = Navigator;

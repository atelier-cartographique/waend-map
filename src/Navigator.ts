/*
 * app/lib/src/Navigator.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';

import { distance } from "@turf/turf";
import { point as turfPoint } from "@turf/helpers";
import { Extent, Transform } from 'waend-lib';
import { region, semaphore } from 'waend-shell';
import * as debug from 'debug';
import View from "./View";
import WaendMap from "./WaendMap";

import { pointProject, vecDist, dom } from 'waend-util';

const { isKeyCode, KeyCode, CANVAS } = dom;
const logger = debug('waend:Navigator');

function getStep(extent: Extent) {
    const width = extent.getWidth();
    const height = extent.getHeight();
    const diag = Math.sqrt((width * width) + (height * height));

    return (diag / 20);
}

function transformRegion(T: Transform, opt_extent: Extent) {
    const extent = opt_extent.getArray();
    const NE = T.mapVec2([extent[2], extent[3]]);
    const SW = T.mapVec2([extent[0], extent[1]]);
    const newExtent = [SW[0], SW[1], NE[0], NE[1]];
    region.push(newExtent);
}

const isKeyI = isKeyCode(KeyCode.KEY_I);
const isKeyO = isKeyCode(KeyCode.KEY_O);
const isKeyUp = isKeyCode(KeyCode.UP_ARROW);
const isKeyDown = isKeyCode(KeyCode.DOWN_ARROW);
const isKeyLeft = isKeyCode(KeyCode.LEFT_ARROW);
const isKeyRight = isKeyCode(KeyCode.RIGHT_ARROW);

export class NavigatorMode {
    protected modeName: string;
    isActive = false;

    constructor(protected navigator: Navigator) { }

    enter() { }
    exit() { }
    getName() { return this.modeName; }

    click(_e: Event) { }
    dblclick(_e: Event) { }
    mousedown(_e: Event) { }
    mousemove(_e: Event) { }
    mouseup(_e: Event) { }
    keydown(_e: Event) { }
    wheel(_e: Event) { }

    keypress(event: KeyboardEvent) {
        if (isKeyI(event)) { // i
            this.navigator.zoomIn();
        }
        else if (isKeyO(event)) { // o
            this.navigator.zoomOut();
        }
    }

    keyup(event: KeyboardEvent) {
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

    getMouseEventPos(ev: MouseEvent) {
        if (ev instanceof MouseEvent) {
            const target = <Element>ev.target;
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

class NavigatorModeBase extends NavigatorMode {
    isZooming: boolean;
    isMoving: boolean;
    isPanning: boolean;
    isStarted: boolean;
    startPoint: number[];
    modeName = 'ModeBase';

    enter() {
        this.navigator.draw();
        this.isActive = true;
    }

    exit() {
        this.navigator.clear();
        this.isActive = false;
    }

    wheel(event: WheelEvent) {
        if (Math.abs(event.deltaY) > 2) {
            if (event.deltaY < 0) {
                this.navigator.zoomIn();
            }
            else {
                this.navigator.zoomOut();
            }
        }
    }

    mousedown(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.startPoint = this.getMouseEventPos(event);
        this.isStarted = true;
        this.isPanning = !event.shiftKey;
    }

    drawPanControl(hp: number[]) {
        const sp = this.startPoint;
        const extent = new Extent(sp.concat(hp));
        const ctx = this.navigator.context;
        extent.normalize();
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.save();
        ctx.strokeStyle = '#0092FF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sp[0], sp[1]);
        ctx.lineTo(hp[0], hp[1]);

        const tr0 = new Transform();
        const tr1 = new Transform();
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

    drawZoomControl(hp: number[]) {
        const sp = this.startPoint;
        const extent = new Extent(sp.concat(hp));
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

    mousemove(event: MouseEvent) {
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

    mouseup(event: MouseEvent) {
        if (this.isStarted) {
            const endPoint = this.getMouseEventPos(event);
            const startPoint = this.startPoint;
            const dist = vecDist(startPoint, endPoint);
            const map = this.navigator.map;
            const ctx = this.navigator.context;

            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            if (dist > 4) {
                const startCoordinates = map.getCoordinateFromPixel(startPoint);
                const endCoordinates = map.getCoordinateFromPixel(endPoint);
                if (this.isPanning) {
                    const T = new Transform();
                    var extent = region.get();
                    T.translate(startCoordinates[0] - endCoordinates[0],
                        startCoordinates[1] - endCoordinates[1]);
                    transformRegion(T, extent);
                }
                else {
                    var extent = new Extent(
                        startCoordinates.concat(endCoordinates)
                    );
                    region.push(extent);
                }
            }
            else {
                this.navigator.centerOn(startPoint);
            }
            this.isStarted = false;
            this.isZooming = false;
            this.isMoving = false;
            // this.navigator.draw();
        }
    }
}



const NAVIGATOR_MODES = [
    NavigatorModeBase,
];



export interface NavigatorOptions {
    map: WaendMap;
    view: View;
    [propName: string]: any;
}

export class Navigator {
    isStarted = false;
    private currentMode: string;
    private modes: { [propName: string]: NavigatorMode };
    readonly map: WaendMap;
    readonly view: View;
    readonly options: any;

    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;

    readonly events = [
        'click', 'dblclick',
        'mousedown', 'mousemove', 'mouseup',
        'keypress', 'keydown', 'keyup',
        'wheel'
    ];

    constructor(options: NavigatorOptions) {
        this.options = options;
        this.setupModes();
        this.setupCanvas();
        this.map = options.map;
        this.view = options.view;


        semaphore.observe<Extent>('region:change', () => {
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
        const container = this.options.container,
            rect = container.getBoundingClientRect();

        this.canvas = CANVAS();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.canvas.style.backgroundColor = 'transparent';
        this.canvas.style.position = 'absolute';
        // this.canvas.style.willChange = 'transform';
        this.canvas.style.transform = 'translateZ(0)';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';

        container.appendChild(this.canvas);
        this.canvas.setAttribute('tabindex', '-1');
        // this.canvas.focus();
        const context = this.canvas.getContext('2d');
        if (context) {
            this.context = context;
        }
        for (let i = 0; i < this.events.length; i++) {
            logger('add to dispatcher', this.events[i]);
            this.canvas.addEventListener(this.events[i],
                (e) => this.dispatcher(e), false);
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
        const extent = region.get();
        const bl = pointProject(extent.getBottomLeft().getCoordinates());
        const tr = pointProject(extent.getTopRight().getCoordinates());
        const center = pointProject(extent.getCenter().getCoordinates());

        this.transform.mapVec2(bl);
        this.transform.mapVec2(tr);
        this.transform.mapVec2(center);

        const rightOffset = 64; // centimeters
        const scaleWidth = 74;
        const right = rect.width - rightOffset;
        let left = rect.width - (scaleWidth + rightOffset);
        const top = rect.height - 17;
        const thickness = 6;
        // const bottom = top + thickness;
        const length = right - left;
        const hw = ((length - 1) / 2) + left;
        const leftVec = this.map.getCoordinateFromPixel([left, top]);
        const rightVec = this.map.getCoordinateFromPixel([right, top]);
        const dist = distance(turfPoint(leftVec), turfPoint(rightVec), 'kilometers') * 100000;

        const formatNumber = (n: number) => Math.ceil(n);

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

        // adjust scale size to fit dispayed size
        const distDiff = Math.ceil(dist) / dist;
        left = rect.width - ((scaleWidth * distDiff) + rightOffset);

        ctx.save();
        ctx.fillStyle = 'black';
        ctx.font = '11px sansguiltmb';
        ctx.textAlign = 'left';
        // ctx.fillText('0', left, top - 8);
        // ctx.fillText(labelCenter, hw, top - 4);
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

    createMode<T extends NavigatorMode>(Mode: (new (a: Navigator) => T)) {
        const mode = new Mode(this);
        const modeName = mode.getName();

        if (!this.modes) { this.modes = {}; }
        this.modes[modeName] = mode;
        return this;
    }

    setMode(modeName: string) {
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

    dispatcher(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        const mode = this.getMode();

        if (mode) {
            switch (event.type) {
                case 'click':
                    mode.click(<MouseEvent>event);
                    break;
                case 'dblclick':
                    mode.dblclick(<MouseEvent>event);
                    break;
                case 'mousedown':
                    mode.mousedown(<MouseEvent>event);
                    break;
                case 'mousemove':
                    mode.mousemove(<MouseEvent>event);
                    break;
                case 'mouseup':
                    mode.mouseup(<MouseEvent>event);
                    break;
                case 'keydown':
                    mode.keydown(<KeyboardEvent>event);
                    break;
                case 'keypress':
                    mode.keypress(<KeyboardEvent>event);
                    break;
                case 'keyup':
                    mode.keyup(<KeyboardEvent>event);
                    break;
                case 'wheel':
                    mode.wheel(<WheelEvent>event);
                    break;

                default:
                    break;
            }
        }
    }

    zoomIn() {
        const extent = region.get();
        const val = getStep(extent);
        region.push(extent.buffer(-val));
    }

    zoomOut() {
        const extent = region.get();
        const val = getStep(extent);
        region.push(extent.buffer(val));
    }

    north() {
        const T = new Transform();
        const extent = region.get();
        const val = getStep(extent);

        T.translate(0, -val);
        transformRegion(T, extent);
    }

    south() {
        const T = new Transform();
        const extent = region.get();
        const val = getStep(extent);

        T.translate(0, val);
        transformRegion(T, extent);
    }

    east() {
        const T = new Transform();
        const extent = region.get();
        const val = getStep(extent);

        T.translate(-val, 0);
        transformRegion(T, extent);
    }

    west() {
        const T = new Transform();
        const extent = region.get();
        const val = getStep(extent);

        T.translate(val, 0);
        transformRegion(T, extent);
    }

    centerOn(pix: number[]) {
        const coords = this.map.getCoordinateFromPixel(pix);
        const T = new Transform();
        const extent = region.get();
        const center = extent.getCenter().getCoordinates();

        T.translate(coords[0] - center[0], coords[1] - center[1]);
        transformRegion(T, extent);
    }
}




export default Navigator;

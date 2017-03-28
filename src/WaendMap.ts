/*
 * app/src/Map.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';


import * as _ from 'lodash';

import proj4 from 'proj4';
import { Extent, Feature } from 'waend-lib';
import { semaphore, region } from 'waend-shell';
import Renderer from './Renderer';
import View, { ViewOptions } from './View';
import Source from './Source';
import { pointProject, pointUnproject } from "waend-util";

export interface MapOptions {
    root: Element;
    defaultProgramUrl: string;
    mediaUrl: string;
    projection?: string;
    extent?: Extent;
}

export default class WaendMap {
    private mediaUrl: string;
    private defaultProgramUrl: string;
    private view: View;
    private renderers: { [id: string]: Renderer };
    private projection: proj4.InterfaceProjection;

    constructor(options: MapOptions) {
        this.projection = proj4.Proj(options.projection || 'EPSG:3857');
        this.renderers = {};
        this.defaultProgramUrl = options.defaultProgramUrl;
        this.mediaUrl = options.mediaUrl;

        const vo: ViewOptions = {
            map: this,
            extent: this.projectedExtent(options.extent || region.get()),
            root: options.root
        };

        this.view = new View(vo);
        this.listenToWaend();
    }

    listenToWaend() {
        semaphore.observe<Source>('layer:layer:add',
            this.waendAddSource.bind(this));
        semaphore.observe<Source>('layer:layer:remove',
            this.waendRemoveSource.bind(this));
        semaphore.observe<Extent>('region:change',
            this.waendUpdateExtent.bind(this));
        semaphore.observe<string[]>('visibility:change',
            this.setVisibility.bind(this));
        semaphore.on('please:map:render',
            this.render.bind(this));
    }

    unlistenToWaend() {
        // TODO?
    }

    projectedExtent(extent: Extent) {
        const bl = pointProject(
            extent.getBottomLeft().getCoordinates());
        const tr = pointProject(
            extent.getTopRight().getCoordinates());
        const pr = [bl[0], bl[1], tr[0], tr[1]];
        return new Extent(pr);
    }

    waendUpdateExtent(extent: Extent) {
        this.view.setExtent(this.projectedExtent(extent));
        this.render();
    }

    waendUpdateRegion() {
    }

    setVisibility(layerIds: string[]) {
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

    waendAddSource(source: Source) {
        this.view.addSource(source);
        const renderer = new Renderer({
            source,
            view: this.view,
            projection: this.projection,
            defaultProgramUrl: this.defaultProgramUrl,
            mediaUrl: this.mediaUrl,
        });

        this.renderers[source.id] = renderer;
        renderer.render();
    }

    waendRemoveSource(source: Source) {
        this.renderers[source.id].stop();
        delete this.renderers[source.id];
        this.view.removeSource(source);
    }

    getCoordinateFromPixel(pixel: number[]) {
        const v = [pixel[0], pixel[1]];
        const inverse = this.view.transform.inverse();
        const tv = inverse.mapVec2(v);
        // logger('map.getCoordinateFromPixel', v, inverse.flatMatrix(), tv);
        return pointUnproject(tv);
    }

    getPixelFromCoordinate(coord: number[]) {
        const v = [coord[0], coord[1]];
        const pv = pointProject(v);
        const tv = this.view.transform.mapVec2(pv);
        return tv;
    }

    getView() {
        return this.view;
    }

    getFeatures(extent?: Extent | number[] | rbush.BBox): Feature[] {
        return this.view.getFeatures(extent);
    }
}


/*
 * src/Image.ts
 *
 * 
 * Copyright (C) 2015-2017 Pierre Marchand <pierremarc07@gmail.com>
 * Copyright (C) 2017 Pacôme Béru <pacome.beru@gmail.com>
 *
 *  License in LICENSE file at the root of the repository.
 *
 *  This file is part of waend-map package.
 *
 *  waend-map is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, version 3 of the License.
 *
 *  waend-map is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with waend-map.  If not, see <http://www.gnu.org/licenses/>.
 */

import Painter from './Painter';
import { CoordPolygon, ImageOptions, Extent } from "waend-lib";
import { dom } from "waend-util";



export default class Image {
    private cancelDrawing = false;

    constructor(private painter: Painter) { }

    load(coordinates: CoordPolygon, extentArray: number[], options: ImageOptions) {
        const painter = this.painter;
        const img = dom.IMG();
        const url = `${painter.getMediaUrl()}/${options.image}`;
        const extent = new Extent(extentArray);
        const width = extent.getWidth();
        const height = extent.getHeight();

        const complete =
            () => {
                if (this.cancelDrawing) {
                    return;
                }

                // now we're supposed to have access to image size
                let imgWidth = img.naturalWidth;

                let imgHeight = img.naturalHeight;
                const sw = extent.getBottomLeft().getCoordinates();
                let scale;

                switch (options.adjust) {
                    case 'none':
                        imgWidth = width;
                        imgHeight = height;
                        break;

                    case 'fit':
                        scale = Math.min(width / imgWidth, height / imgHeight);
                        imgWidth = imgWidth * scale;
                        imgHeight = imgHeight * scale;
                        if ((width - imgWidth) < (height - imgHeight)) {
                            sw[1] += (height - imgHeight) / 2;
                        }
                        else {
                            sw[0] += (width - imgWidth) / 2;
                        }
                        break;

                    case 'cover':
                        scale = Math.max(width / imgWidth, height / imgHeight);
                        imgWidth = imgWidth * scale;
                        imgHeight = imgHeight * scale;
                        if ((width - imgWidth) > (height - imgHeight)) {
                            sw[1] += (height - imgHeight) / 2;
                        }
                        else {
                            sw[0] += (width - imgWidth) / 2;
                        }
                        break;

                }

                painter.save();
                if (options.clip) {
                    painter.drawPolygon(coordinates, ['clip']);
                }
                if (options.rotation) {
                    const rot = options.rotation * Math.PI / 180;
                    const cx = sw[0] + (imgWidth / 2);
                    const cy = sw[1] + (imgHeight / 2);

                    painter.context.translate(cx, cy);
                    painter.context.rotate(rot);
                    painter.context.translate(-cx, -cy);
                }
                painter.context.drawImage(img, sw[0], sw[1], imgWidth, imgHeight);
                painter.restore();
            };

        const getStep: (a: number) => number =
            (sz) => {
                const steps = [4, 8, 16, 32, 64, 128, 256, 512, 1024];
                const sl = steps.length;
                for (let i = sl - 1; i >= 0; i--) {
                    if (sz >= steps[i]) {
                        if (i < (sl - 1)) {
                            return steps[i + 1];
                        }
                        return steps[i];
                    }
                }
                return steps[steps.length - 1];
            };

        img.src = `${url}/${getStep(Math.max(width, height))}`;
        if (img.complete) {
            complete();
        }
        else {
            img.addEventListener('load', complete, false);
        }
    }

    cancel() {
        this.cancelDrawing = true;
    }
}
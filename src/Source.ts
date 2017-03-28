/*
 * src/Source.ts
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

import * as _ from 'lodash';
import { BaseSource, Layer, Feature, ModelData } from 'waend-lib';
import { getBinder } from 'waend-shell';
import * as debug from 'debug';
const logger = debug('waend:Source');



class Source extends BaseSource<Feature> {
    readonly id: string;
    readonly layer: Layer;
    private uid: string;
    private gid: string;

    constructor(uid: string, gid: string, layer: Layer) {
        super();
        this.uid = uid;
        this.gid = gid;
        this.id = layer.id;
        this.layer = layer;

        // listen to the layer to update features if some are created
        layer.on('change', () => this.update());
        layer.on('set', (key: string) => {
            const prefix = _.first(key.split('.'));
            if (('style' === prefix) || ('params' === prefix)) {
                this.emit('update');
            }
        });
    }


    update() {
        const updateWithFeatures: (a: Feature[]) => void =
            (features) => {
                this.clear();
                const emitUpdate =
                    (f: Feature) => {
                        return (() => {
                            this.emit('update:feature', f);
                        });
                    };

                for (const feature of features) {
                    this.addFeature(feature, true);
                    feature.on('set', emitUpdate(feature));
                    feature.on('set:data', emitUpdate(feature));
                }

                this.buildTree();
                this.emit('update');
            };

        getBinder().getFeatures(this.uid, this.gid, this.id)
            .then(updateWithFeatures)
            .catch(err => {
                logger('Source.update', err);
            });
    }

    toJSON(features = this.getFeatures()) {
        const a: ModelData[] = new Array(features.length);
        const layerData = this.layer.getData();
        const layerStyle = layerData.style || {};
        const layerParams = layerData.params || {};

        for (let i = 0; i < features.length; i++) {
            const f = features[i].cloneData();
            const props = f.properties;
            if ('style' in props) {
                _.defaults(props.style, layerStyle);
            }
            else {
                props.style = layerStyle;
            }
            if ('params' in props) {
                _.defaults(props.params, layerParams);
            }
            else {
                props.params = layerParams;
            }
            a[i] = f;
        }
        return a;
    }

}


//
// function str2ab(str) {
//   var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
//   var bufView = new Uint16Array(buf);
//   for (var i=0, strLen=str.length; i < strLen; i++) {
//     bufView[i] = str.charCodeAt(i);
//   }
//   return buf;
// }



export default Source;

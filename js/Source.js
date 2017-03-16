"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const waend_lib_1 = require("waend-lib");
const waend_shell_1 = require("waend-shell");
const debug = require("debug");
const logger = debug('waend:Source');
class Source extends waend_lib_1.BaseSource {
    constructor(uid, gid, layer) {
        super();
        this.uid = uid;
        this.gid = gid;
        this.id = layer.id;
        this.layer = layer;
        layer.on('change', () => this.update());
        layer.on('set', (key) => {
            const prefix = _.first(key.split('.'));
            if (('style' === prefix) || ('params' === prefix)) {
                this.emit('update');
            }
        });
    }
    update() {
        const updateWithFeatures = (features) => {
            this.clear();
            const emitUpdate = (f) => {
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
        waend_shell_1.getBinder().getFeatures(this.uid, this.gid, this.id)
            .then(updateWithFeatures)
            .catch(err => {
            logger('Source.update', err);
        });
    }
    toJSON(features = this.getFeatures()) {
        const a = new Array(features.length);
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
exports.default = Source;

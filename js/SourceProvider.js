"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Promise = require("bluebird");
const waend_shell_1 = require("waend-shell");
const Source_1 = require("./Source");
class SourceProvider {
    constructor() {
        this.sources = [];
        waend_shell_1.semaphore.observe('shell:change:context', (event) => {
            const { index, path } = event;
            if (index > waend_shell_1.ContextIndex.USER) {
                this.currentPath = path;
                this.updateGroup(path[0], path[1]);
            }
        });
        waend_shell_1.semaphore.on('create:layer', () => {
            const uid = this.currentPath[0];
            const gid = this.currentPath[1];
            this.updateGroup(uid, gid, true);
        });
    }
    updateGroup(userId, groupId, opt_force = false) {
        if (!opt_force && this.groupId === groupId) {
            return;
        }
        this.userId = userId;
        this.groupId = groupId;
        waend_shell_1.getBinder()
            .getGroup(userId, groupId)
            .then(group => this.group = group)
            .then(() => this.loadLayers())
            .then(() => this.updateLayers())
            .then(() => {
            if (this.group.has('visible')) {
                const layers = this.group.get('visible', []);
                waend_shell_1.semaphore.once('layer:update:complete', () => {
                    waend_shell_1.semaphore.signal('visibility:change', layers);
                });
            }
            waend_shell_1.semaphore.signal('source:change', this.getSources());
        })
            .catch(console.error.bind(console));
    }
    clearLayers() {
        this.sources.forEach(layer => {
            layer.clear();
        });
        this.sources = [];
    }
    updateLayers() {
        this.sources.forEach(layer => {
            return layer.update();
        }, this);
    }
    loadLayers() {
        this.group.once('set', (key) => {
            if ('visible' === key) {
                this.updateGroup(this.userId, this.groupId, true);
            }
        });
        return waend_shell_1.getBinder()
            .getLayers(this.userId, this.groupId)
            .then((layers) => {
            this.clearLayers();
            for (let lidx = 0; lidx < layers.length; lidx++) {
                this.sources.push(new Source_1.default(this.userId, this.groupId, layers[lidx]));
            }
            return Promise.resolve();
        })
            .catch(console.error.bind(console));
    }
    getSources() {
        return this.sources;
    }
}
exports.SourceProvider = SourceProvider;
let provider;
function default_1() {
    if (!provider) {
        provider = new SourceProvider();
    }
    return provider;
}
exports.default = default_1;
;

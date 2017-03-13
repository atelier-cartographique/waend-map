"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const waend_shell_1 = require("waend-shell");
class LayerProvider extends events_1.EventEmitter {
    constructor() {
        super();
        this.sources = [];
        waend_shell_1.semaphore.observe('source:change', this.update.bind(this));
    }
    clearSources() {
        this.sources.forEach((source) => {
            waend_shell_1.semaphore.signal('layer:layer:remove', source);
        });
        this.sources = [];
    }
    addSource(source) {
        this.sources.push(source);
        waend_shell_1.semaphore.signal('layer:layer:add', source);
    }
    update(sources) {
        waend_shell_1.semaphore.signal('layer:update:start', this);
        this.clearSources();
        sources.forEach((source) => this.addSource(source));
        waend_shell_1.semaphore.signal('layer:update:complete', this);
    }
}
exports.LayerProvider = LayerProvider;
;
let provider;
function default_1() {
    if (!provider) {
        provider = new LayerProvider();
    }
    return provider;
}
exports.default = default_1;
;

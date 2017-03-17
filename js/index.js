"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LayerProvider_1 = require("./LayerProvider");
const SourceProvider_1 = require("./SourceProvider");
const WaendMap_1 = require("./WaendMap");
function default_1(root, defaultProgramUrl, mediaUrl, projection) {
    LayerProvider_1.default();
    SourceProvider_1.default();
    return (new WaendMap_1.default({ root, defaultProgramUrl, mediaUrl, projection }));
}
exports.default = default_1;


import layers from './LayerProvider';
import sources from './SourceProvider';
import WaendMap from './WaendMap';

export default function (root: Element, defaultProgramUrl: string, projection?: string): WaendMap {
    layers();
    sources();
    return (new WaendMap({ root, defaultProgramUrl, projection }));
} 
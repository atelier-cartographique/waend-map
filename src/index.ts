
import layers from './LayerProvider';
import sources from './SourceProvider';
import WaendMap from './WaendMap';

export default function (
    root: Element,
    defaultProgramUrl: string,
    mediaUrl: string,
    projection?: string): WaendMap {
    layers();
    sources();
    return (new WaendMap({ root, defaultProgramUrl, mediaUrl, projection }));
} 
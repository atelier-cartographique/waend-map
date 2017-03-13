
import * as Promise from 'bluebird';
import { ContextIndex, IEventChangeContext, semaphore, getBinder } from 'waend-shell';
import { Group } from "waend-lib";
import Source from './Source';




export class SourceProvider {

    private sources: Source[];
    private currentPath: string[];
    private userId: string;
    private groupId: string;
    private group: Group;

    constructor() {
        this.sources = [];

        semaphore.observe<IEventChangeContext>('shell:change:context',
            (event) => {
                const { index, path } = event;
                if (index > ContextIndex.USER) {
                    this.currentPath = path;
                    this.updateGroup(path[0], path[1]);
                }
            });

        semaphore.on('create:layer',
            () => {
                const uid = this.currentPath[0];
                const gid = this.currentPath[1]
                this.updateGroup(uid, gid, true);
            });
    }


    updateGroup(userId: string, groupId: string, opt_force = false) {
        if (!opt_force && this.groupId === groupId) {
            return;
        }

        this.userId = userId;
        this.groupId = groupId;

        getBinder()
            .getGroup(userId, groupId)
            .then(group => this.group = group)
            .then(() => this.loadLayers())
            .then(() => this.updateLayers())
            .then(() => {
                if (this.group.has('visible')) {
                    const layers = this.group.get('visible', []);
                    semaphore.once('layer:update:complete', () => {
                        semaphore.signal('visibility:change', layers);
                    });
                }
                semaphore.signal('source:change', this.getSources());
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

    loadLayers(): Promise<void> {
        this.group.once('set',
            (key: string) => {
                if ('visible' === key) {
                    this.updateGroup(this.userId, this.groupId, true);
                }
            });

        return getBinder()
            .getLayers(this.userId, this.groupId)
            .then((layers) => {
                this.clearLayers();
                for (let lidx = 0; lidx < layers.length; lidx++) {
                    this.sources.push(new Source(this.userId, this.groupId, layers[lidx]));
                }
                return Promise.resolve();
            })
            .catch(console.error.bind(console));
    }

    getSources() {
        return this.sources;
    }
}

let provider: SourceProvider;

export default function (): SourceProvider {
    if (!provider) {
        provider = new SourceProvider();
    }
    return provider;
};

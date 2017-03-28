/*
 * src/SourceProvider.ts
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

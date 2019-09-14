import { Storage } from '@bhmb/bot';
import { EventEmitter } from '../events';

export class BankerManager extends EventEmitter<{ change: [string] }> {
    readonly id = 'bankers';
    readonly default = [];

    constructor(private storage: Storage) {
        super();
    }

    isBanker(name: string) {
        return this.getBankers().includes(name.toLocaleUpperCase());
    }

    setBanker(name: string, isBanker: boolean) {
        name = name.toLocaleUpperCase();

        const bankers = this.getBankers();
        const index = bankers.indexOf(name);
        let changed = false;
        if (isBanker && index === -1) {
            bankers.push(name);
            changed = true;
        } else if (!isBanker && index !== -1) {
            bankers.splice(index, 1);
            changed = true;
        }

        this.storage.set(this.id, bankers);
        if (changed) this.emit('change', name);
    }

    getBankers(): string[] {
        return this.storage.get<string[]>(this.id, []).filter(Boolean);
    }
}

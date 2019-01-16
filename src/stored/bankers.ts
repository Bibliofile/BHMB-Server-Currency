import { Storage } from '@bhmb/bot';

export class BankerManager {
    readonly id = 'bankers';
    readonly default = [];

    constructor(private storage: Storage) { }

    isBanker(name: string) {
        return this.getBankers().includes(name.toLocaleUpperCase());
    }

    setBanker(name: string, isBanker: boolean) {
        name = name.toLocaleUpperCase();

        const bankers = this.getBankers();
        const index = bankers.indexOf(name);
        if (isBanker && index === -1) {
            bankers.push(name);
        } else if (!isBanker && index !== -1) {
            bankers.splice(index, 1);
        }

        this.storage.set(this.id, bankers);
    }

    getBankers(): string[] {
        return this.storage.get<string[]>(this.id, []).filter(Boolean);
    }
}

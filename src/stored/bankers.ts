import { Storage } from 'blockheads-messagebot';

export class BankerManager {
    readonly id = 'biblio_banks_bankers';
    readonly default = [];

    constructor(private storage: Storage) { }

    isBanker(name: string) {
        let bankers = this.storage.getObject(this.id, [] as string[]);
        return bankers.includes(name.toLocaleUpperCase());
    }

    setBanker(name: string, isBanker: boolean) {
        name = name.toLocaleUpperCase();

        let bankers = this.storage.getObject(this.id, [] as string[]);
        if (isBanker && !bankers.includes(name)) {
            bankers.push(name);
        } else if (!isBanker && bankers.includes(name)) {
            bankers.splice(bankers.indexOf(name), 1);
        }

        this.storage.set(this.id, bankers);
    }

    getBankers(): string[] {
        return this.storage.getObject(this.id, [] as string[]);
    }
}

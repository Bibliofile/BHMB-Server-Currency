import { Storage } from 'blockheads-messagebot';

export type PermissionValues = 'All' | 'AdminBanker' | 'Admin' | 'Owner' | 'Banker';

export interface Permissions {
    check: PermissionValues;
    add: PermissionValues;
    silent: PermissionValues;
    daily: PermissionValues;
    lastdaily: PermissionValues;
    online: PermissionValues;
    remove: PermissionValues;
    banker: PermissionValues;
}


export class PermissionManager {
    readonly id = 'biblio_banks_perms';
    readonly defaults: Permissions = {
        check: 'All',
        add: 'AdminBanker',
        silent: 'AdminBanker',
        daily: 'AdminBanker',
        lastdaily: 'AdminBanker',
        online: 'AdminBanker',
        remove: 'AdminBanker',
        banker: 'Admin',
    };

    constructor(private storage: Storage) {}

    getPerm(item: keyof Permissions): PermissionValues {
        let messages = this.storage.getObject(this.id, this.defaults);

        return messages[item] || this.defaults[item];
    }

    setPerm(item: keyof Permissions, message: PermissionValues) {
        let messages = this.storage.getObject(this.id, this.defaults);
        messages[item] = message;

        this.storage.set(this.id, messages);
    }

    keys(): string[] {
        return Object.keys(this.defaults);
    }
}

import { Storage } from '@bhmb/bot';

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
    readonly id = 'permissions';
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
        return this.getPerms()[item];
    }

    setPerm(item: keyof Permissions, value: PermissionValues) {
        const perms = this.getPerms();
        perms[item] = value;

        this.storage.set(this.id, perms);
    }

    keys(): string[] {
        return Object.keys(this.defaults);
    }

    private getPerms(): Permissions {
        return { ...this.defaults, ...this.storage.get(this.id, this.defaults) };
    }
}

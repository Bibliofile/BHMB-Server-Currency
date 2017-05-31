import { Storage, World } from 'blockheads-messagebot';

export interface Account {
    balance: number;
    last_daily_award?: number;
}

export interface Accounts {
    [name: string]: Account;
}

export class AccountManager {
    readonly id = 'biblio_banks_accounts';
    readonly defaults: Accounts = {
        'SERVER': { balance: 0 },
        'ACCOUNT_DOES_NOT_EXIST': {
            balance: -Infinity
        }
    };

    constructor(private storage: Storage, private world: World) {}

    // Override
    getItem(key: string): Account {
        key = key.toLocaleUpperCase();

        let stored = this.storage.getObject(this.id, this.defaults);
        return stored[key] || this.defaults[key] || (this.defaults.ACCOUNT_DOES_NOT_EXIST as Account);
    }

    // Override
    setItem(key: string, item: Account): void {
        key = key.toLocaleUpperCase();

        if (key != 'ACCOUNT_DOES_NOT_EXIST') {
            let stored = this.storage.getObject(this.id, this.defaults);
            stored[key] = item;
            delete stored['ACCOUNT_DOES_NOT_EXIST'];
            this.storage.set(this.id, stored);
        }
    }

    deposit(name: string, amount: number) {
        let account = this.getItem(name);
        account.balance += amount;
        this.setItem(name, account);
    }

    withdraw(name: string, amount: number) {
        this.deposit(name, -amount);
    }

    transfer(from: string, to: string, amount: number) {
        this.withdraw(from, amount);
        this.deposit(to, amount);
    }

    getBalance(name: string) {
        return this.getItem(name).balance;
    }

    getLastDaily(name: string): number {
        return this.getItem(name).last_daily_award || 0;
    }

    updateLastDaily(name: string) {
        let account = this.getItem(name);
        account.last_daily_award = Date.now();
        this.setItem(name, account);
    }

    canExist(name: string): boolean {
        return (isFinite(this.getBalance(name))) || this.world.getPlayer(name).hasJoined();
    }

    createIfDoesNotExist(name: string): void {
        name = name.toLocaleUpperCase();
        if (!isFinite(this.getBalance(name))) {
            this.setItem(name, {
                balance: 0
            });
        }
    }

    getAll(): Accounts {
        return this.storage.getObject(this.id, this.defaults);
    }
}

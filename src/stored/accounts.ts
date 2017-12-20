import { Storage, World } from '@bhmb/bot';

export interface Account {
    balance: number;
    last_daily_award?: number;
}

export type AccountArrayElement = Account & { name: string };
export type AccountArray = AccountArrayElement[];

export interface Accounts {
    [name: string]: Account;
}

export class AccountManager {
    readonly id = 'accounts';
    readonly defaults: Accounts = {
        'SERVER': { balance: 0 }
    };

    constructor(private storage: Storage, private world: World) {}

    private getAccounts(): Accounts {
        return this.storage.get(this.id, this.defaults);
    }

    private getAccount(name: string): Account {
        name = name.toLocaleUpperCase();
        let stored = this.getAccounts();
        if (!stored[name]) {
            if (this.world.getPlayer(name).hasJoined) {
                this.updateAccount(name, { balance: 0 });
                return this.getAccount(name);
            }
            throw new Error(`The account for ${name} does not exist.`);
        }

        return stored[name];
    }

    private updateAccount(key: string, info: Partial<Account>): void {
        key = key.toLocaleUpperCase();

        const stored = this.getAccounts();
        stored[key] = { ...stored[key], ...info };
        this.storage.set(this.id, stored);
    }

    removeAccounts(names: string[]): void {
        const stored = this.getAccounts();
        names.forEach(name => delete stored[name]);
        this.storage.set(this.id, stored);
    }

    private checkDeposit(name: string, amount: number) {
        if (this.getBalance(name) + amount > Number.MAX_SAFE_INTEGER) {
            throw new Error(`Can't deposit funds for ${name}. Balance would exceed maximum value.`);
        }
    }

    deposit = (name: string, amount: number) => {
        this.checkDeposit(name, amount);
        this.updateAccount(name, { balance: this.getBalance(name) + amount });
    }

    private checkWithdraw(name: string, amount: number) {
        if (this.getBalance(name) - amount < 0) {
            throw new Error(`Balance for ${name} cannot be less than 0.`);
        }
    }

    withdraw = (name: string, amount: number) => {
        this.checkWithdraw(name, amount);
        this.updateAccount(name, { balance: this.getBalance(name) - amount });
    }

    transfer = (from: string, to: string, amount: number) => {
        this.checkDeposit(to, amount);
        this.checkWithdraw(from, amount);
        this.withdraw(from, amount);
        this.deposit(to, amount);
    }

    getBalance = (name: string) => {
        return this.getAccount(name).balance;
    }

    getLastDaily = (name: string): number => {
        return this.getAccount(name).last_daily_award || 0;
    }

    updateLastDaily = (name: string) => {
        this.updateAccount(name, { last_daily_award: Date.now() });
    }

    accountExists = (name: string): boolean => {
        try {
            this.getAccount(name);
            return true;
        } catch {
            return false;
        }
    }

    getAll(): AccountArray {
        const accounts: AccountArray = [];
        for (const [name, account] of Object.entries(this.getAccounts())) {
            accounts.push({ name, ...account });
        }
        return accounts;
    }
}

import { Storage } from '@bhmb/bot';
import { UIExtensionExports } from '@bhmb/ui';

import {
    AccountManager,
    PermissionManager, Permissions, PermissionValues,
    BankerManager,
    MessageManager, Messages,
} from './stored';

import commandsHTML from './html/commands.html';
import accountsHTML from './html/accounts.html';
import settingsHTML from './html/settings.html';
import { AccountArray, AccountArrayElement } from './stored/accounts';

import { debounce } from './helpers';

export class BankingTab {
    private commandTab!: HTMLDivElement;
    private accountsTab!: HTMLDivElement;
    private settingsTab!: HTMLDivElement;

    constructor(
        private ui: UIExtensionExports,
        private accounts: AccountManager,
        private perms: PermissionManager,
        private bankers: BankerManager,
        private messages: MessageManager,
        private storage: Storage
    ) {
        this.ui.addTabGroup('Banking', 'banking');
        this.initCommandTab();
        this.initAccountsTab();
        this.initSettingsTab();
    }

    initCommandTab() {
        this.commandTab = this.ui.addTab('Commands', 'banking');
        this.commandTab.innerHTML = commandsHTML;

        for (let el of this.commandTab.querySelectorAll('[data-perm]') as NodeListOf<HTMLInputElement>) {
            el.value = this.perms.getPerm(el.dataset['perm'] as keyof Permissions);
        }

        this.commandTab.addEventListener('change', () => {
            for (let el of this.commandTab.querySelectorAll('[data-perm]') as NodeListOf<HTMLInputElement>) {
                this.perms.setPerm(el.dataset['perm'] as keyof Permissions, el.value as PermissionValues);
            }
        });
    }

    initAccountsTab() {
        this.accountsTab = this.ui.addTab('Accounts', 'banking');
        this.accountsTab.innerHTML = accountsHTML;

        const input = this.accountsTab.querySelector('input')!;
        const container = this.accountsTab.querySelector('tbody')!;
        const template = this.accountsTab.querySelector('template')!;

        function formatDate(epoch: number | undefined): string {
            if (!epoch) return 'Never';
            const date = new Date(epoch);
            return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        }

        const showAccounts = (accounts: AccountArray) => {
            container.innerHTML = '';

            for (const account of accounts) {
                this.ui.buildTemplate(template, container, [
                    { selector: 'tr', account_name: account.name },
                    { selector: '[data-for=name]', text: account.name },
                    { selector: '[data-for=last_daily_award]', text: formatDate(account.last_daily_award) },
                    { selector: '[type=checkbox]', checked: this.bankers.isBanker(account.name) },
                    { selector: 'input', value: account.balance }
                ]);
            }
        };

        const getSortType = (): 'bal_d' | 'bal_a' | 'daily_d' | 'daily_a' => {
            return (<HTMLInputElement>this.accountsTab.querySelector('[name=sort]:checked')).value as any;
        };

        const rebuildAccounts = () => {
            const name = input.value.toLocaleUpperCase().trim();
            let accountFilter = (account: AccountArrayElement) => account.name.includes(name);

            const parts = name.split(/\s+/);
            const checks: Array<(account: AccountArrayElement) => boolean> = [];

            if (name === '') {
                accountFilter = () => true;
            } else if (parts.some(part => part.startsWith('IS:') || part.startsWith('BALANCE:') || part.startsWith('DAILY:'))) {
                for (const part of parts) {
                    if (part === 'IS:BANKER') {
                        const bankers = this.bankers.getBankers();
                        checks.push(account => bankers.includes(account.name));
                    } else if (/balance:[<>]?\d+/i.test(part)) {
                        const result = part.match(/balance:[<>]?(\d+)/i);
                        const amount = result ? +result[1] : 0;
                        if (part.includes('<')) {
                            checks.push(account => account.balance < amount);
                        } else if (part.includes('>')) {
                            checks.push(account => account.balance > amount);
                        } else {
                            checks.push(account => account.balance === amount);
                        }
                    } else if (/daily:-?\d+/i.test(part)) {
                        const target = part.substr('daily:'.length)
                        const days = parseInt(target, 10);
                        const ms = days * 24 * 60 * 60 * 1000;
                        if (days < 0) {
                            checks.push(account => (account.last_daily_award || 0) - ms > Date.now());
                        } else {
                            checks.push(account => (account.last_daily_award || 0) < Date.now() - ms);
                        }
                    } else {
                        checks.push(account => account.name.includes(part));
                    }
                }

                accountFilter = account => checks.every(check => check(account));
            }

            const accounts = this.accounts.getAll().filter(accountFilter);

            // Sort
            switch (getSortType()) {
                case 'bal_d':
                    accounts.sort((a, b) => b.balance - a.balance);
                    break;
                case 'bal_a':
                    accounts.sort((a, b) => a.balance - b.balance);
                    break;
                case 'daily_d':
                    accounts.sort((a, b) => {
                        if (!a.last_daily_award) return 1;
                        if (!b.last_daily_award) return -1;
                        return b.last_daily_award - a.last_daily_award;
                    });
                    break;
                case 'daily_a':
                    accounts.sort((a, b) => {
                        if (!a.last_daily_award) return 1;
                        if (!b.last_daily_award) return -1;
                        return a.last_daily_award - b.last_daily_award;
                    });
                    break;
                default:
                    break;
            }

            if (accounts.length > 300) {
                this.ui.notify(`Showing 300/${accounts.length} matches`);
                accounts.length = 300;
            }


            showAccounts(accounts);
        };

        let ignoreEvents = false;
        const userEdit = () => {
            ignoreEvents = true;
            for (const row of Array.from(this.accountsTab.querySelectorAll('tr[account_name]'))) {
                const banker = row.querySelector<HTMLInputElement>('input[type=checkbox]')!.checked;
                this.bankers.setBanker(row.getAttribute('account_name')!, banker);
                this.accounts.setBalance(row.getAttribute('account_name')!, +row.querySelector('input')!.value);
            }
            ignoreEvents = false;
        };

        this.accounts.on('change', name => {
            if (ignoreEvents) return;
            const row = this.accountsTab.querySelector(`[account_name="${name}"]`);
            if (row) {
                row.querySelector<HTMLInputElement>('input[type=number]')!.value = this.accounts.getBalance(name) + '';
            }
        });
        this.bankers.on('change', name => {
            if (ignoreEvents) return;
            const row = this.accountsTab.querySelector(`[account_name="${name}"]`);
            if (row) {
                row.querySelector<HTMLInputElement>('input[type=checkbox]')!.checked = this.bankers.isBanker(name);
            }
        });

        input.addEventListener('input', debounce(rebuildAccounts, 300));
        this.accountsTab.querySelectorAll('input[name=sort]').forEach(el => el.addEventListener('input', rebuildAccounts));
        this.accountsTab.addEventListener('change', ev => {
            if (!(ev.target instanceof HTMLElement)) return;
            if (ev.target.matches('[name=sort]') || ev.target.matches('[name=search]')) return;
            userEdit();
        });

        // Deleting accounts
        this.accountsTab.querySelector('button.is-danger')!.addEventListener('click', () => {
            this.ui.alert(
                'Are you sure? This will delete all accounts currently shown on the page.',
                [{ text: 'Delete', style: 'is-danger'}, 'Cancel'],
                response => {
                    if (response !== 'Delete') return;
                    const names = Array.from(this.accountsTab.querySelectorAll('tr[account_name]'))
                        .map(tr => tr.getAttribute('account_name')!);

                    this.accounts.removeAccounts(names);
                    rebuildAccounts();
                }
            );
        });

        // Making accounts banker
        this.accountsTab.addEventListener('change', event => {
            const target = event.target as HTMLInputElement;
            if (target.matches('[type=checkbox]')) {
                const row = target.parentElement!.parentElement!.parentElement!;
                this.bankers.setBanker(row.getAttribute('account_name') || '', target.checked);
            }
        });

        rebuildAccounts();
    }

    initSettingsTab() {
        this.settingsTab = this.ui.addTab('Settings', 'banking');
        this.settingsTab.innerHTML = settingsHTML;

        let currencyInput = this.settingsTab.querySelector('input') as HTMLInputElement;

        currencyInput.value = this.storage.get('name', 'Server Coin');

        for (let el of this.settingsTab.querySelectorAll('[data-msg-key]') as NodeListOf<HTMLInputElement>) {
            el.value = this.messages.getMessage(el.dataset['msgKey'] as keyof Messages);
        }

        this.settingsTab.addEventListener('change', () => {
            for (let el of this.settingsTab.querySelectorAll('[data-msg-key]') as NodeListOf<HTMLInputElement>) {
                this.messages.setMessage(el.dataset['msgKey'] as keyof Messages, el.value);
            }

            this.storage.set('name', currencyInput.value);
        });
    }

    remove() {
        this.ui.removeTabGroup('banking');
    }
}

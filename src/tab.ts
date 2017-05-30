import { UIExtensionExports, Storage } from 'blockheads-messagebot';

declare var Awesomplete: any;

import {
    AccountManager, Account,
    PermissionManager, Permissions, PermissionValues,
    BankerManager,
    MessageManager, Messages,
} from './stored';

import { loadCSS, loadJS, stripHTML } from './helpers';

import commandsHTML = require('./html/commands.html');
import searchHTML = require('./html/search.html');
import settingsHTML = require('./html/settings.html');

export class BankingTab {
    private commandTab: HTMLDivElement;
    private searchTab: HTMLDivElement;
    private settingsTab: HTMLDivElement;

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
        loadCSS('//cdnjs.cloudflare.com/ajax/libs/awesomplete/1.1.1/awesomplete.min.css');
        this.initSearchTab();
        this.initSettingsTab();

        [this.commandTab, this.searchTab, this.settingsTab].forEach(tab => {
            tab.classList.add('container');
        });
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

    initSearchTab() {
        this.searchTab = this.ui.addTab('Search', 'banking');
        this.searchTab.innerHTML = searchHTML;

        let input = this.searchTab.querySelector('input') as HTMLInputElement;
        let container = this.searchTab.querySelector('div') as HTMLDivElement;

        // Searching for a single name
        let checkNames = () => {
            let name = input.value;
            if (this.accounts.canExist(name)) {
                this.accounts.createIfDoesNotExist(name);

                let amount = this.accounts.getBalance(name);
                let safeName = stripHTML(name);

                let html = `<h4 class="subtitle">${safeName}'s Account:</h4>`;
                html += `<p>Balance: ${amount}</p>`;
                html += `<p><label class="checkbox"><input type="checkbox" ${this.bankers.isBanker(name) ? 'checked' : ''}> Banker</label></p>`;

                container.innerHTML = html;
                let box = container.querySelector('input') as HTMLInputElement;
                box.addEventListener('change', () => {
                    this.bankers.setBanker(name, box.checked);
                });
            }
        };

        input.addEventListener('blur', checkNames);
        input.addEventListener('keyup', checkNames);
        input.addEventListener('awesomplete-selectcomplete', checkNames);

        // Showing all players
        (this.searchTab.querySelector('a') as HTMLAnchorElement).addEventListener('click', () => {
            let html = `<h4 class="subtitle">Bankers</h4><ul style="padding-left: 1.5em;">`;
            for (let name of this.bankers.getBankers().sort()) {
                html += `<li>${stripHTML(name)}</li>`;
            }
            html += `</ul><h4 class="subtitle">All accounts:</h4><ul style="padding-left: 1.5em;">`;

            let stored = this.accounts.getAll();
            let accounts: (Account & { name: string })[] = [];
            for (let name of Object.keys(stored)) {
                accounts.push({...stored[name], name});
            }

            accounts.sort((a, b) => b.balance - a.balance);

            html += `<table class="table is-narrow"><thead><tr><th>Name</th><th>Balance</th></tr></thead><tbody>`;
            for (let account of accounts) {
                html += `<tr${this.bankers.isBanker(account.name) ? ' class="is-selected">' : '>'}<td>${stripHTML(account.name)}</td><td>${account.balance}</td></tr>`;
            }
            html += `</tbody></table>`;

            container.innerHTML = html;
        });

        // Initialize searching autocomplete
        loadJS('//cdnjs.cloudflare.com/ajax/libs/awesomplete/1.1.1/awesomplete.min.js', 'Awesomplete')
            .then(() => {
                let names = Object.keys(this.accounts.getAll());
                names.splice(names.indexOf('ACCOUNT_DOES_NOT_EXIST'), 1);

                new Awesomplete(input, {
                    minChars: 1,
                    maxItems: 8,
                    autoFirst: false,
                    list: names
                });

                input.disabled = false;
                input.placeholder = 'Enter a name...';
            });
    }

    initSettingsTab() {
        this.settingsTab = this.ui.addTab('Settings', 'banking');
        this.settingsTab.innerHTML = settingsHTML;

        let currencyInput = this.settingsTab.querySelector('#biblio_banks_currency') as HTMLInputElement;
        let limitInput = this.settingsTab.querySelector('#biblio_banks_limit') as HTMLInputElement;

        limitInput.value = this.storage.getObject('biblio_banks_limit', '100000000');
        currencyInput.value = this.storage.getString('biblio_banks_currency', 'Server Coin');

        for (let el of this.settingsTab.querySelectorAll('[data-msg-key]') as NodeListOf<HTMLInputElement>) {
            el.value = this.messages.getMessage(el.dataset['msgKey'] as keyof Messages);
        }

        this.settingsTab.addEventListener('change', () => {
            for (let el of this.settingsTab.querySelectorAll('[data-msg-key]') as NodeListOf<HTMLInputElement>) {
                this.messages.setMessage(el.dataset['msgKey'] as keyof Messages, el.value);
            }

            this.storage.set('biblio_banks_currency', currencyInput.value);
            this.storage.set('biblio_banks_limit', +limitInput.value);
        });
    }

    remove() {
        this.ui.removeTabGroup('banking');
    }
}

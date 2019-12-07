(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('@bhmb/bot')) :
    typeof define === 'function' && define.amd ? define(['@bhmb/bot'], factory) :
    (global = global || self, factory(global['@bhmb/bot']));
}(this, (function (bot) { 'use strict';

    var commandsHTML = "<div class=\"container is-widescreen\">\n\n    <h3 class=\"title\">Commands</h3>\n    <p>The following commands have been added to your world.</p>\n\n    <ul style=\"padding-left: 1.5em;\">\n        <li>/CHECK - Checks how much currency the user has.</li>\n        <li>/CHECK [name] - (<select class=\"select is-small\" data-perm=\"check\">\n            <option value=\"All\">everyone</option>\n            <option value=\"Admin\">admin</option>\n            <option value=\"AdminBanker\">admin &amp; banker</option>\n            <option value=\"Banker\">banker</option>\n            <option value=\"Owner\">owner</option>\n        </select>) Checks how much currency [name] has.</li>\n        <li>/TRANSFER [amount] [to] - Transfers [amount] from the current user's account to the [to] account.</li>\n        <li>/PAY [amount] [to] - Alias of /TRANSFER.</li>\n        <li>/GIVE [amount] [to] - Alias of /TRANSFER.</li>\n        <li>/ADD [amount] [name] - (<select class=\"select is-small\" data-perm=\"add\">\n            <option value=\"Admin\">admin</option>\n            <option value=\"AdminBanker\">admin &amp; banker</option>\n            <option value=\"Banker\">banker</option>\n            <option value=\"Owner\">owner</option>\n        </select>) Adds [amount] to [name]&apos;s account.</li>\n        <li>/ADDSILENT [amount] [name] - (<select class=\"select is-small\" data-perm=\"silent\">\n            <option value=\"Admin\">admin</option>\n            <option value=\"AdminBanker\">admin &amp; banker</option>\n            <option value=\"Banker\">banker</option>\n            <option value=\"Owner\">owner</option>\n        </select>) Adds [amount] to [name]&apos;s account. Does not send a message on success or failure.</li>\n        <li>/ADDDAILY [amount] [name] - (<select class=\"select is-small\" data-perm=\"daily\">\n            <option value=\"Admin\">admin</option>\n            <option value=\"AdminBanker\">admin &amp; banker</option>\n            <option value=\"Banker\">banker</option>\n            <option value=\"Owner\">owner</option>\n        </select>) Adds [amount] to [name]&apos;s account. Can only add to an account once per day.</li>\n        <li>/LASTDAILY - Checks the last time the user recieved a daily award.</li>\n        <li>/LASTDAILY [name] - (<select class=\"select is-small\" data-perm=\"lastdaily\">\n            <option value=\"Admin\">admin</option>\n            <option value=\"AdminBanker\">admin &amp; banker</option>\n            <option value=\"Banker\">banker</option>\n            <option value=\"Owner\">owner</option>\n        </select>) Checks the last time [name] recieved a daily award.</li>\n        <li>/ADDONLINE [amount] - (<select class=\"select is-small\" data-perm=\"online\">\n            <option value=\"Admin\">admin</option>\n            <option value=\"AdminBanker\">admin &amp; banker</option>\n            <option value=\"Banker\">banker</option>\n            <option value=\"Owner\">owner</option>\n        </select>) Adds [amount] to everyone who is online.</li>\n        <li>/REMOVE [amount] [name] - (<select class=\"select is-small\" data-perm=\"remove\">\n            <option value=\"Admin\">admin</option>\n            <option value=\"AdminBanker\">admin &amp; banker</option>\n            <option value=\"Banker\">banker</option>\n            <option value=\"Owner\">owner</option>\n        </select>) Removes [amount] from [name]&apos;s account.</li>\n        <li>/BANKER [name] or /UNBANKER [name] - (<select class=\"select is-small\" data-perm=\"banker\">\n            <option value=\"Admin\">admin</option>\n            <option value=\"AdminBanker\">admin &amp; banker</option>\n            <option value=\"Banker\">banker</option>\n            <option value=\"Owner\">owner</option>\n        </select>) Adds or removes [name] to/from the banker list.</li>\n    </ul>\n\n</div>\n";

    var accountsHTML = "<template>\n    <tr>\n        <td data-for=\"name\"></td>\n        <td>\n            <input type=\"number\" class=\"input is-small\">\n        </td>\n        <td data-for=\"last_daily_award\"></td>\n        <td>\n            <label>\n                Banker:\n                <input type=\"checkbox\">\n            </label>\n        </td>\n    </tr>\n</template>\n\n<div class=\"container is-widescreen\">\n\n    <h3 class=\"title\">Accounts</h3>\n    <div class=\"content\">\n        <p>Use this tab to search for, modify, and delete user accounts. Once deleted, accounts cannot be recovered.</p>\n        <p>For the following special searches, you cannot use spaces.</p>\n        <ul>\n            <li>Use <code>is:banker</code> to search for accounts which are bankers.</li>\n            <li>Use <code>balance:10</code> to search for accounts with a balance equal to 10.</li>\n            <li>Use <code>balance:&lt;10</code> to search for accounts with a balance less than 10</li>\n            <li>Use <code>balance:&gt;10</code> to search for accounts with a balance greater than 10.</li>\n        </ul>\n    </div>\n\n    <br>\n\n    <div class=\"columns\">\n        <div class=\"column\">\n            <input class=\"input\" name=\"search\" placeholder=\"Enter a name...\" value=\"is:banker\">\n        </div>\n        <div class=\"column is-narrow\">\n            <button class=\"button is-danger\">Delete accounts</button>\n        </div>\n    </div>\n\n    <span class=\"has-text-weight-bold\">Sort:</span>\n    <div class=\"control\">\n        <label class=\"radio\">\n            <input type=\"radio\" name=\"sort\" value=\"bal_d\" checked> Balance (most first)\n        </label>\n        <label class=\"radio\">\n            <input type=\"radio\" name=\"sort\" value=\"bal_a\"> Balance (least first)\n        </label>\n        <label class=\"radio\">\n            <input type=\"radio\" name=\"sort\" value=\"daily_d\"> Last daily award (recent first)\n        </label>\n        <label class=\"radio\">\n            <input type=\"radio\" name=\"sort\" value=\"daily_a\"> Last daily award (old first)\n        </label>\n    </div>\n\n    <br>\n\n    <table class=\"table is-fullwidth is-striped\">\n        <thead>\n            <tr>\n                <th>Name</th>\n                <th>Balance</th>\n                <th>Last Daily</th>\n                <th>Actions</th>\n            </tr>\n        </thead>\n        <tfoot>\n            <tr>\n                <th>Name</th>\n                <th>Balance</th>\n                <th>Last Daily</th>\n                <th>Actions</th>\n            </tr>\n        </tfoot>\n        <tbody>\n\n        </tbody>\n    </table>\n</div>\n";

    var settingsHTML = "<div class=\"container is-widescreen\">\n\n    <h3 class=\"title\">General</h3>\n        <label>Currency Name:</label>\n        <input class=\"input\">\n\n    <h3 class=\"title\">Responses - Commands</h3>\n        <label>/CHECK:</label>\n        <input class=\"input\" data-msg-key=\"check\">\n        <label>/TRANSFER:</label>\n        <input class=\"input\" data-msg-key=\"transfer\">\n        <label>/ADD:</label>\n        <input class=\"input\" data-msg-key=\"add\">\n        <label>/ADDONLINE:</label>\n        <input class=\"input\" data-msg-key=\"online\">\n        <label>/ADDDAILY - Added:</label>\n        <input class=\"input\" data-msg-key=\"daily_yes\">\n        <label>/ADDDAILY - Already added:</label>\n        <input class=\"input\" data-msg-key=\"daily_no\">\n        <label>/LASTDAILY:</label>\n        <input class=\"input\" data-msg-key=\"last_daily\">\n        <label>/REMOVE:</label>\n        <input class=\"input\" data-msg-key=\"remove\">\n        <label>/BANKER - Added:</label>\n        <input class=\"input\" data-msg-key=\"banker_yes\">\n        <label>/BANKER - Already on list:</label>\n        <input class=\"input\" data-msg-key=\"banker_on_list_already\">\n        <label>/UNBANKER - Removed:</label>\n        <input class=\"input\" data-msg-key=\"banker_no\">\n        <label>/UNBANKER - Not a banker:</label>\n        <input class=\"input\" data-msg-key=\"banker_not_on_list\">\n\n    <h3 class=\"title\">Responses - Errors</h3>\n        <label>Account does not exist:</label>\n        <input class=\"input\" data-msg-key=\"error_no_account\">\n        <label>Account limit reached:</label>\n        <input class=\"input\" data-msg-key=\"error_limit_reached\">\n        <label>Insufficient funds:</label>\n        <input class=\"input\" data-msg-key=\"error_funds\">\n\n    <br>\n    <br>\n</div>\n";

    function debounce(fn, delay) {
        let timeout = 0;
        const run = () => {
            fn();
            timeout = 0;
        };
        return () => {
            clearTimeout(timeout);
            timeout = setTimeout(run, delay);
        };
    }

    class BankingTab {
        constructor(ui, accounts, perms, bankers, messages, storage) {
            this.ui = ui;
            this.accounts = accounts;
            this.perms = perms;
            this.bankers = bankers;
            this.messages = messages;
            this.storage = storage;
            this.ui.addTabGroup('Banking', 'banking');
            this.initCommandTab();
            this.initAccountsTab();
            this.initSettingsTab();
        }
        initCommandTab() {
            this.commandTab = this.ui.addTab('Commands', 'banking');
            this.commandTab.innerHTML = commandsHTML;
            for (let el of this.commandTab.querySelectorAll('[data-perm]')) {
                el.value = this.perms.getPerm(el.dataset['perm']);
            }
            this.commandTab.addEventListener('change', () => {
                for (let el of this.commandTab.querySelectorAll('[data-perm]')) {
                    this.perms.setPerm(el.dataset['perm'], el.value);
                }
            });
        }
        initAccountsTab() {
            this.accountsTab = this.ui.addTab('Accounts', 'banking');
            this.accountsTab.innerHTML = accountsHTML;
            const input = this.accountsTab.querySelector('input');
            const container = this.accountsTab.querySelector('tbody');
            const template = this.accountsTab.querySelector('template');
            function formatDate(epoch) {
                if (!epoch)
                    return 'Never';
                const date = new Date(epoch);
                return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            }
            const showAccounts = (accounts) => {
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
            const getSortType = () => {
                return this.accountsTab.querySelector('[name=sort]:checked').value;
            };
            const rebuildAccounts = () => {
                const name = input.value.toLocaleUpperCase().trim();
                let accountFilter = (account) => account.name.includes(name);
                if (name === '') {
                    accountFilter = () => true;
                }
                else if (name === 'IS:BANKER') {
                    const bankers = this.bankers.getBankers();
                    accountFilter = account => bankers.includes(account.name);
                }
                else if (/balance:[<>]?\d+/i.test(name)) {
                    const result = name.match(/balance:[<>]?(\d+)/);
                    const amount = result ? +result[1] : 0;
                    if (name.includes('<')) {
                        accountFilter = account => account.balance < amount;
                    }
                    else if (name.includes('>')) {
                        accountFilter = account => account.balance > amount;
                    }
                    else {
                        accountFilter = account => account.balance === amount;
                    }
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
                            if (!a.last_daily_award)
                                return 1;
                            if (!b.last_daily_award)
                                return -1;
                            return b.last_daily_award - a.last_daily_award;
                        });
                        break;
                    case 'daily_a':
                        accounts.sort((a, b) => {
                            if (!a.last_daily_award)
                                return 1;
                            if (!b.last_daily_award)
                                return -1;
                            return a.last_daily_award - b.last_daily_award;
                        });
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
                    const banker = row.querySelector('input[type=checkbox]').checked;
                    this.bankers.setBanker(row.getAttribute('account_name'), banker);
                    this.accounts.setBalance(row.getAttribute('account_name'), +row.querySelector('input').value);
                }
                ignoreEvents = false;
            };
            this.accounts.on('change', name => {
                if (ignoreEvents)
                    return;
                const row = this.accountsTab.querySelector(`[account_name="${name}"]`);
                if (row) {
                    row.querySelector('input[type=number]').value = this.accounts.getBalance(name) + '';
                }
            });
            this.bankers.on('change', name => {
                if (ignoreEvents)
                    return;
                const row = this.accountsTab.querySelector(`[account_name="${name}"]`);
                if (row) {
                    row.querySelector('input[type=checkbox]').checked = this.bankers.isBanker(name);
                }
            });
            input.addEventListener('input', debounce(rebuildAccounts, 300));
            this.accountsTab.querySelectorAll('input[name=sort]').forEach(el => el.addEventListener('input', rebuildAccounts));
            this.accountsTab.addEventListener('change', ev => {
                if (!(ev.target instanceof HTMLElement))
                    return;
                if (ev.target.matches('[name=sort]') || ev.target.matches('[name=search]'))
                    return;
                userEdit();
            });
            // Deleting accounts
            this.accountsTab.querySelector('button.is-danger').addEventListener('click', () => {
                this.ui.alert('Are you sure? This will delete all accounts currently shown on the page.', [{ text: 'Delete', style: 'is-danger' }, 'Cancel'], response => {
                    if (response !== 'Delete')
                        return;
                    const names = Array.from(this.accountsTab.querySelectorAll('tr[account_name]'))
                        .map(tr => tr.getAttribute('account_name'));
                    this.accounts.removeAccounts(names);
                    rebuildAccounts();
                });
            });
            // Making accounts banker
            this.accountsTab.addEventListener('change', event => {
                const target = event.target;
                if (target.matches('[type=checkbox]')) {
                    const row = target.parentElement.parentElement.parentElement;
                    this.bankers.setBanker(row.getAttribute('account_name') || '', target.checked);
                }
            });
            rebuildAccounts();
        }
        initSettingsTab() {
            this.settingsTab = this.ui.addTab('Settings', 'banking');
            this.settingsTab.innerHTML = settingsHTML;
            let currencyInput = this.settingsTab.querySelector('input');
            currencyInput.value = this.storage.get('name', 'Server Coin');
            for (let el of this.settingsTab.querySelectorAll('[data-msg-key]')) {
                el.value = this.messages.getMessage(el.dataset['msgKey']);
            }
            this.settingsTab.addEventListener('change', () => {
                for (let el of this.settingsTab.querySelectorAll('[data-msg-key]')) {
                    this.messages.setMessage(el.dataset['msgKey'], el.value);
                }
                this.storage.set('name', currencyInput.value);
            });
        }
        remove() {
            this.ui.removeTabGroup('banking');
        }
    }

    /**
     * Simple, type safe, event emitter class.
     *
     * @example
     * ```ts
     * const x = new EventEmitter<{ a: [string] }>()
     * x.on('a', a => a.repeat(123)) // ok
     * x.on('b', console.log) // error, 'b' is not assignable to 'a'
     * const y = new EventEmitter<{ a: [string]; [k: string]: unknown[] }>()
     * y.on('a', a => a.repeat(123)) // ok
     * y.on('b', (...args: unknown[]) => console.log(...args)) // ok, any unknown events will contain an unknown number of arguments.
     * ```
     */
    class EventEmitter {
        constructor() {
            this.listeners = new Map();
        }
        /**
         * Starts listening to an event.
         * @param event the event to listen to.
         * @param listener function to be called when an this event is emitted.
         */
        on(event, listener) {
            const list = (this.listeners.get(event) || []).slice();
            list.push(listener);
            this.listeners.set(event, list);
        }
        /**
         * Stops listening to an event.
         * @param event the event to stop listening to.
         * @param listener the function to remove from the listener array.
         */
        off(event, listener) {
            const list = this.listeners.get(event) || [];
            const index = list.indexOf(listener);
            if (index !== -1) {
                list.splice(index, 1);
            }
        }
        /**
         * Emits an event to all currently subscribed listeners.
         * @param event the event to emit.
         * @param args any arguments required for the event.
         */
        emit(event, ...args) {
            for (const listener of (this.listeners.get(event) || []).slice()) {
                listener(...args);
            }
        }
    }

    class AccountManager extends EventEmitter {
        constructor(storage, world) {
            super();
            this.storage = storage;
            this.world = world;
            this.id = 'accounts';
            this.defaults = {
                'SERVER': { balance: 0 }
            };
            this.deposit = (name, amount) => {
                this.checkDeposit(name, amount);
                this.updateAccount(name, { balance: this.getBalance(name) + amount });
            };
            this.withdraw = (name, amount) => {
                this.checkWithdraw(name, amount);
                this.updateAccount(name, { balance: this.getBalance(name) - amount });
            };
            this.setBalance = (name, amount) => {
                this.updateAccount(name, { balance: Math.max(amount, 0) });
            };
            this.transfer = (from, to, amount) => {
                this.checkDeposit(to, amount);
                this.checkWithdraw(from, amount);
                this.withdraw(from, amount);
                this.deposit(to, amount);
            };
            this.getBalance = (name) => {
                return this.getAccount(name).balance;
            };
            this.getLastDaily = (name) => {
                return this.getAccount(name).last_daily_award || 0;
            };
            this.updateLastDaily = (name) => {
                this.updateAccount(name, { last_daily_award: Date.now() });
            };
            this.accountExists = (name) => {
                try {
                    this.getAccount(name);
                    return true;
                }
                catch (_a) {
                    return false;
                }
            };
        }
        getAccounts() {
            return this.storage.get(this.id, this.defaults);
        }
        getAccount(name) {
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
        updateAccount(key, info) {
            key = key.toLocaleUpperCase();
            const stored = this.getAccounts();
            stored[key] = Object.assign(Object.assign({}, stored[key]), info);
            this.storage.set(this.id, stored);
            this.emit('change', key);
        }
        removeAccounts(names) {
            const stored = this.getAccounts();
            names.forEach(name => delete stored[name]);
            this.storage.set(this.id, stored);
        }
        checkDeposit(name, amount) {
            if (this.getBalance(name) + amount > Number.MAX_SAFE_INTEGER) {
                throw new Error(`Can't deposit funds for ${name}. Balance would exceed maximum value.`);
            }
        }
        checkWithdraw(name, amount) {
            if (this.getBalance(name) - amount < 0) {
                throw new Error(`Balance for ${name} cannot be less than 0.`);
            }
        }
        getAll() {
            const accounts = [];
            for (const [name, account] of Object.entries(this.getAccounts())) {
                accounts.push(Object.assign({ name }, account));
            }
            return accounts;
        }
    }

    class PermissionManager {
        constructor(storage) {
            this.storage = storage;
            this.id = 'permissions';
            this.defaults = {
                check: 'All',
                add: 'AdminBanker',
                silent: 'AdminBanker',
                daily: 'AdminBanker',
                lastdaily: 'AdminBanker',
                online: 'AdminBanker',
                remove: 'AdminBanker',
                banker: 'Admin',
            };
        }
        getPerm(item) {
            return this.getPerms()[item];
        }
        setPerm(item, value) {
            const perms = this.getPerms();
            perms[item] = value;
            this.storage.set(this.id, perms);
        }
        keys() {
            return Object.keys(this.defaults);
        }
        getPerms() {
            return Object.assign(Object.assign({}, this.defaults), this.storage.get(this.id, this.defaults));
        }
    }

    class MessageManager {
        constructor(storage) {
            this.storage = storage;
            this.id = 'messages';
            this.defaults = {
                check: '{{Name}} currently has {{amount}} {{currency}}.',
                transfer: 'Transferred {{amount}} {{currency}} from {{From}} to {{To}}.',
                add: 'Added {{amount}} {{currency}} to {{Name}}.',
                online: 'Everyone online has received {{amount}} {{currency}}!',
                daily_yes: 'Added daily reward of {{currency}} to {{Name}}.',
                daily_no: '{{Name}} has already received their daily reward.',
                last_daily: '{{Name}} last received a daily award at {{time}}',
                remove: 'Removed {{amount}} {{currency}} from {{Name}}.',
                banker_yes: '{{Name}} has been added to the banker list.',
                banker_on_list_already: '{{Name}} was already on the banker list.',
                banker_no: '{{Name}} has been removed from the banker list.',
                banker_not_on_list: '{{Name}} was not on the banker list.',
                error_no_account: 'Error: unable to {{command}}, the specified account does not exist.',
                error_limit_reached: 'Error: {{Name}} can\'t have more {{currency}} added to their account.',
                error_funds: 'Error: {{Name}} does not have enough {{currency}} to transfer funds.',
            };
        }
        getMessage(item) {
            return this.getMessages()[item];
        }
        setMessage(item, message) {
            const messages = this.getMessages();
            messages[item] = message;
            this.storage.set(this.id, messages);
        }
        keys() {
            return Object.keys(this.defaults);
        }
        getMessages() {
            return Object.assign(Object.assign({}, this.defaults), this.storage.get(this.id, this.defaults));
        }
    }

    class BankerManager extends EventEmitter {
        constructor(storage) {
            super();
            this.storage = storage;
            this.id = 'bankers';
            this.default = [];
        }
        isBanker(name) {
            return this.getBankers().includes(name.toLocaleUpperCase());
        }
        setBanker(name, isBanker) {
            name = name.toLocaleUpperCase();
            const bankers = this.getBankers();
            const index = bankers.indexOf(name);
            let changed = false;
            if (isBanker && index === -1) {
                bankers.push(name);
                changed = true;
            }
            else if (!isBanker && index !== -1) {
                bankers.splice(index, 1);
                changed = true;
            }
            this.storage.set(this.id, bankers);
            if (changed)
                this.emit('change', name);
        }
        getBankers() {
            return this.storage.get(this.id, []).filter(Boolean);
        }
    }

    const currency_id = 'name';
    bot.MessageBot.registerExtension('bibliofile/banking', function (ex, world) {
        const storage = ex.storage;
        // Helpers
        const getCurrencyName = () => storage.get(currency_id, 'Server Coin');
        // Commands
        const listeners = new Map();
        const accounts = new AccountManager(storage, world);
        const messages = new MessageManager(storage);
        const permissions = new PermissionManager(storage);
        const bankers = new BankerManager(storage);
        function permissionCheck(player, perm) {
            switch (perm) {
                case 'All':
                    return true;
                case 'Owner':
                    return player.isOwner;
                case 'AdminBanker':
                    return player.isAdmin || bankers.isBanker(player.name);
                case 'Banker':
                    return bankers.isBanker(player.name);
                case 'Admin':
                    return player.isAdmin;
                default:
                    return false;
            }
        }
        listeners.set('check', (player, args) => {
            let check = player.name;
            if (args && permissionCheck(player, permissions.getPerm('check'))) {
                check = args.toLocaleUpperCase();
            }
            try {
                ex.bot.send(messages.getMessage('check'), {
                    name: check,
                    amount: accounts.getBalance(check) + '',
                    currency: getCurrencyName()
                });
            }
            catch (_a) {
                ex.bot.send(messages.getMessage('error_no_account'), {
                    name: check,
                    command: 'check'
                });
            }
        });
        listeners.set('transfer', (player, args) => {
            const parts = args.match(/([1-9]\d*) (.+)/);
            if (!parts) {
                return;
            }
            const amount = +parts[1];
            const to = parts[2];
            const from = player.name;
            // Does the player exist?
            if (!accounts.accountExists(to)) {
                ex.bot.send(messages.getMessage('error_no_account'), {
                    name: to,
                    command: 'transfer'
                });
                return;
            }
            try {
                accounts.transfer(from, to, amount);
            }
            catch (error) {
                const message = error.message.includes('max') ? 'error_limit_reached' : 'error_funds';
                ex.bot.send(messages.getMessage(message), {
                    name: from,
                    currency: getCurrencyName()
                });
                return;
            }
            // Let players know it worked
            ex.bot.send(messages.getMessage('transfer'), {
                FROM: from,
                From: from[0] + from.substr(1).toLocaleLowerCase(),
                from: from.toLocaleLowerCase(),
                TO: to,
                To: to[0] + to.substr(1).toLocaleLowerCase(),
                to: to.toLocaleLowerCase(),
                amount: amount + '',
                currency: getCurrencyName(),
            });
        });
        listeners.set('pay', listeners.get('transfer'));
        listeners.set('give', listeners.get('transfer'));
        listeners.set('add', (player, args) => {
            const parts = args.match(/([1-9]\d*) (.+)/);
            if (!parts)
                return;
            if (!permissionCheck(player, permissions.getPerm('add')))
                return;
            let amount = +parts[1];
            let to = parts[2];
            try {
                accounts.deposit(to, amount);
            }
            catch (error) {
                const message = error.message.includes('max') ? 'error_limit_reached' : 'error_no_account';
                ex.bot.send(messages.getMessage(message), {
                    command: 'add',
                    currency: getCurrencyName(),
                    name: to
                });
            }
            ex.bot.send(messages.getMessage('add'), {
                currency: getCurrencyName(),
                amount: amount + '',
                name: to,
            });
        });
        listeners.set('addsilent', (player, args) => {
            const parts = args.match(/([1-9]\d*) (.+)/);
            if (!parts)
                return;
            if (!permissionCheck(player, permissions.getPerm('silent')))
                return;
            const amount = +parts[1];
            const to = parts[2];
            try {
                accounts.deposit(to, amount);
            }
            catch (_a) {
                // Fail silently
            }
        });
        listeners.set('adddaily', (player, args) => {
            const parts = args.match(/([1-9]\d*) (.+)/);
            if (!parts)
                return;
            if (!permissionCheck(player, permissions.getPerm('daily')))
                return;
            const amount = +parts[1];
            const to = parts[2];
            if (!accounts.accountExists(to)) {
                ex.bot.send(messages.getMessage('error_no_account'), { name: to, command: 'adddaily' });
                return;
            }
            const lastAdd = accounts.getLastDaily(to);
            // If it's been more than 24 hours
            if (lastAdd / 1000 / 60 / 60 / 24 < Date.now() / 1000 / 60 / 60 / 24 - 1) {
                accounts.deposit(to, amount);
                accounts.updateLastDaily(to);
                ex.bot.send(messages.getMessage('daily_yes'), {
                    amount: amount + '',
                    currency: getCurrencyName(),
                    name: to,
                });
            }
            else {
                ex.bot.send(messages.getMessage('daily_no'), {
                    amount: amount + '',
                    currency: getCurrencyName(),
                    name: to,
                });
            }
        });
        listeners.set('lastdaily', (player, args) => {
            let check = player.name;
            if (args && permissionCheck(player, permissions.getPerm('lastdaily'))) {
                check = args;
            }
            if (!accounts.accountExists(check)) {
                ex.bot.send(messages.getMessage('error_no_account'), { name: check, command: 'lastdaily' });
                return;
            }
            ex.bot.send(messages.getMessage('last_daily'), {
                time: (new Date(accounts.getLastDaily(check))).toString(),
                name: check,
            });
        });
        listeners.set('remove', (player, args) => {
            const parts = args.match(/([1-9]\d*) (.+)/);
            if (!parts)
                return;
            if (!permissionCheck(player, permissions.getPerm('remove')))
                return;
            const amount = +parts[1];
            const from = parts[2];
            if (!accounts.accountExists(from)) {
                ex.bot.send(messages.getMessage('error_no_account'), { name: from, command: 'remove' });
                return;
            }
            try {
                accounts.withdraw(from, amount);
            }
            catch (_a) {
                return;
            }
            ex.bot.send(messages.getMessage('remove'), {
                amount: amount + '',
                currency: getCurrencyName(),
                name: from,
            });
        });
        listeners.set('addonline', (player, args) => {
            const amount = +args;
            if (isNaN(amount))
                return;
            if (!permissionCheck(player, permissions.getPerm('online')))
                return;
            world.online.forEach(name => {
                try {
                    accounts.deposit(name, amount);
                }
                catch (_a) {
                    // Ignore errors to avoid spam.
                }
            });
            ex.bot.send(messages.getMessage('online'), {
                amount: amount + '',
                currency: getCurrencyName(),
            });
        });
        listeners.set('banker', (player, args) => {
            if (!permissionCheck(player, permissions.getPerm('banker'))) {
                return;
            }
            const candidate = args.toLocaleUpperCase();
            if (!accounts.accountExists(candidate)) {
                ex.bot.send(messages.getMessage('error_no_account'), {
                    name: candidate,
                    command: 'banker',
                });
                return;
            }
            if (!bankers.isBanker(candidate)) {
                bankers.setBanker(candidate, true);
                ex.bot.send(messages.getMessage('banker_yes'), { name: candidate });
            }
            else {
                ex.bot.send(messages.getMessage('banker_on_list_already'), { name: candidate });
            }
        });
        listeners.set('unbanker', (player, args) => {
            if (!permissionCheck(player, permissions.getPerm('banker'))) {
                return;
            }
            const demoted = args;
            if (bankers.isBanker(demoted)) {
                bankers.setBanker(demoted, false);
                ex.bot.send(messages.getMessage('banker_no'), { name: demoted });
            }
            else {
                ex.bot.send(messages.getMessage('banker_not_on_list'), { name: demoted });
            }
        });
        function commandListener({ player, message }) {
            const [command, ...args] = message.split(' ');
            if (!command.startsWith('/'))
                return;
            const handler = listeners.get(command.substr(1).toLocaleLowerCase());
            if (handler)
                handler(player, args.join(' '));
        }
        world.onMessage.sub(commandListener);
        // Right now the uninstall function only has to remove the listener & storage
        ex.remove = () => world.onMessage.unsub(commandListener);
        // Enter the land of the browsers
        const ui = ex.bot.getExports('ui');
        if (!ui)
            return;
        let tab = new BankingTab(ui, accounts, permissions, bankers, messages, storage);
        ex.uninstall = () => {
            tab.remove();
            world.onMessage.unsub(commandListener);
        };
        ex.exports = {
            deposit: accounts.deposit,
            withdraw: accounts.withdraw,
            transfer: accounts.transfer,
            getBalance: accounts.getBalance
        };
    });

})));
//# sourceMappingURL=bundle.js.map

import { MessageBot, Player, UIExtensionExports } from 'blockheads-messagebot';

import { BankingTab } from './tab';

import {
    AccountManager, Accounts,
    PermissionManager,
    PermissionValues,
    BankerManager,
    MessageManager, Messages
} from './stored';

const currency_id = 'biblio_banks_currency';
const limit_id = 'biblio_banks_limit';

MessageBot.registerExtension('bibliofile/banking', function(ex, world) {
    const storage = world.storage;
    // Migrations
    (function() {
        let migration = storage.getObject('biblio_banks_migration', 0, false);

        if (migration == 0) {
            storage.clearNamespace('biblio_banks_version');
            migration++;
        }

        if (migration == 1) {
            // Fix any NaN issues
            storage.migrate('biblio_banks_accounts', function(accounts: Accounts) {
                Object.keys(accounts).forEach(name => {
                    accounts[name].balance = accounts[name].balance || 0;
                });

                return accounts;
            });

            migration++;
        }

        if (migration == 2 || migration == 3) {
            storage.migrate('biblio_banks_messages', function(messages: Messages) {
                Object.keys(messages).forEach((key: keyof Messages) => {
                    messages[key] = messages[key]
                        .replace(/ammount/g, 'amount')
                        .replace(/recieved/g, 'received');
                });

                return messages;
            });

            migration++;
        }

        storage.set('biblio_banks_migration', 3, false);
    }());

    // Helpers
    const getCurrencyName = () => storage.getString(currency_id, 'Server Coin');
    const getLimit = () => storage.getObject(limit_id, 100000000);

    // Commands
    let listeners = new Map<string, (player: Player, args: string) => void>();

    let accounts = new AccountManager(storage, world);
    let messages = new MessageManager(storage);
    let permissions = new PermissionManager(storage);
    let bankers = new BankerManager(storage);

    function permissionCheck(player: Player, perm: PermissionValues): boolean {
        switch (perm) {
            case 'All':
                return true;
            case 'Owner':
                return player.isOwner();
            case 'AdminBanker':
                return player.isAdmin() || bankers.isBanker(player.getName());
            case 'Banker':
                return bankers.isBanker(player.getName());
            case 'Admin':
                return player.isAdmin();
            default:
                return false;
        }
    }

    listeners.set('check', (player, args) => {
        let check = player.getName();
        if (args && permissionCheck(player, permissions.getPerm('check'))) {
            check = args.toLocaleUpperCase();
        }

        if (!accounts.canExist(check)) {
            ex.bot.send(messages.getMessage('error_no_account'), {
                name: check,
                command: 'check'
            });
            return;
        }

        accounts.createIfDoesNotExist(check);

        ex.bot.send(messages.getMessage('check'), {
            name: check,
            amount: accounts.getBalance(check) + '',
            currency: getCurrencyName()
        });
    });

    listeners.set('transfer', (player, args) => {
        let parts = args.match(/([1-9]\d*) (.+)/);
        if (!parts) {
            return;
        }

        accounts.createIfDoesNotExist(player.getName());
        let amount = +parts[1];
        let to = parts[2];
        let name = player.getName();

        // Does the sender have enough currency?
        if (accounts.getBalance(name) < amount) {
            ex.bot.send(messages.getMessage('error_funds'), {
                currency: getCurrencyName()
            });
            return;
        }

        // Does the player exist?
        if (!accounts.canExist(to)) {
            ex.bot.send(messages.getMessage('error_no_account'), {
                name: to,
                command: 'transfer'
            });
            return;
        }
        accounts.createIfDoesNotExist(to);

        // Will this put the receiving player over the limit?
        if (accounts.getBalance(to) + amount > getLimit()) {
            ex.bot.send(messages.getMessage('error_limit_reached'), {
                currency: getCurrencyName()
            });
            return;
        }

        // Everything checks out, transfer
        accounts.transfer(name, to, amount);

        // Let players know it worked
        ex.bot.send(messages.getMessage('transfer'), {
            FROM: name,
            From: name[0] + name.substr(1).toLocaleLowerCase(),
            from: name.toLocaleLowerCase(),
            TO: to,
            To: to[0] + to.substr(1).toLocaleLowerCase(),
            to: to.toLocaleLowerCase(),
            amount: amount + '',
            currency: getCurrencyName(),
        });
    });

    listeners.set('add', (player, args) => {
        let parts = args.match(/([1-9]\d*) (.+)/);
        if (!parts) return;
        if (!permissionCheck(player, permissions.getPerm('add'))) return;

        let amount = +parts[1];
        let to = parts[2];

        // Does "to" exist?
        if (!accounts.canExist(to)) {
            ex.bot.send(messages.getMessage('error_no_account'), {
                command: 'add',
            });
            return;
        }
        accounts.createIfDoesNotExist(to);

        // Will this put to above the limit?
        if (accounts.getBalance(to) + amount > getLimit()) {
            ex.bot.send(messages.getMessage('error_limit_reached'), {
                currency: getCurrencyName(),
                name: to,
            });
            return;
        }

        accounts.deposit(to, amount);

        ex.bot.send(messages.getMessage('add'), {
            currency: getCurrencyName(),
            amount: String(amount),
            name: to,
        });
    });

    listeners.set('addsilent', (player, args) => {
        let parts = args.match(/([1-9]\d*) (.+)/);
        if (!parts) return;
        if (!permissionCheck(player, permissions.getPerm('silent'))) return;

        let amount = +parts[1];
        let to = parts[2];

        if (!accounts.canExist(to)) return;
        accounts.createIfDoesNotExist(to);

        if (accounts.getBalance(to) + amount > getLimit()) return;

        accounts.deposit(to, amount);
    });

    listeners.set('adddaily', (player, args) => {
        let parts = args.match(/([1-9]\d*) (.+)/);
        if (!parts) return;
        if (!permissionCheck(player, permissions.getPerm('daily'))) return;

        let amount = +parts[1];
        let to = parts[2];

        if (!accounts.canExist(to)) {
            ex.bot.send(messages.getMessage('error_no_account'), { command: 'adddaily'});
            return;
        }
        accounts.createIfDoesNotExist(to);

        let lastAdd = accounts.getLastDaily(to);

        // If it's been more than 24 hours
        if (lastAdd / 1000 / 60/ 60 / 24 < Date.now() / 1000 / 60 / 60 / 24 - 1) {
            accounts.deposit(to, amount);
            accounts.updateLastDaily(to);
            ex.bot.send(messages.getMessage('daily_yes'), {
                amount: String(amount),
                currency: getCurrencyName(),
                name: to,
            });
        } else {
            ex.bot.send(messages.getMessage('daily_no'), {
                amount: String(amount),
                currency: getCurrencyName(),
                name: to,
            });
        }
    });

    listeners.set('lastdaily', (player, args) => {
        let check = player.getName();
        if (args && permissionCheck(player, permissions.getPerm('lastdaily'))) {
            check = args;
        }

        if (!accounts.canExist(check)) {
            ex.bot.send(messages.getMessage('error_no_account'), { command: 'lastdaily' });
            return;
        }

        ex.bot.send(messages.getMessage('last_daily'), {
            time: (new Date(accounts.getLastDaily(check))).toString(),
            name: check,
        });
    });

    listeners.set('remove', (player, args) => {
        let parts = args.match(/([1-9]\d*) (.+)/);
        if (!parts) return;
        if (!permissionCheck(player, permissions.getPerm('remove'))) return;

        let amount = +parts[1];
        let from = parts[2];

        if (!accounts.canExist(from)) {
            ex.bot.send(messages.getMessage('error_no_account'), { command: 'remove' });
            return;
        }
        accounts.createIfDoesNotExist(from);

        if (accounts.getBalance(from) - amount < 0) {
            return; // Balance must be positive
        }

        accounts.withdraw(from, amount);

        ex.bot.send(messages.getMessage('remove'), {
            amount: String(amount),
            currency: getCurrencyName(),
            name: from,
        });
    });

    listeners.set('addonline', (player, args) => {
        let amount = +args;
        if (isNaN(amount)) return;
        if (!permissionCheck(player, permissions.getPerm('online'))) return;

        world.getOverview().then(overview => {
            overview.online.forEach(name => {
                accounts.createIfDoesNotExist(name);
                //Silently ignore limit errors to avoid spam.
                if (accounts.getBalance(name) + amount <= getLimit()) {
                    accounts.deposit(name, amount);
                }
            });
        });

        ex.bot.send(messages.getMessage('online'), {
            amount: String(amount),
            currency: getCurrencyName(),
        });
    });

    listeners.set('banker', (player, args) => {
        if (!permissionCheck(player, permissions.getPerm('banker'))) {
            return;
        }

        var candidate = args.toLocaleUpperCase();

        if (!accounts.canExist(candidate)) {
            ex.bot.send(messages.getMessage('error_no_account'), {
                command: 'banker',
            });
            return;
        }

        if (!bankers.isBanker(candidate)) {
            bankers.setBanker(candidate, true);
            ex.bot.send(messages.getMessage('banker_yes'), {name: candidate });
        } else {
            ex.bot.send(messages.getMessage('banker_on_list_already'), { name: candidate });
        }
    });

    listeners.set('unbanker', (player, args) => {
        if (!permissionCheck(player, permissions.getPerm('banker'))) {
            return;
        }

        let demoted = args;

        if (bankers.isBanker(demoted)) {
            bankers.setBanker(demoted, false);
            ex.bot.send(messages.getMessage('banker_no'), { name: demoted });
        } else {
            ex.bot.send(messages.getMessage('banker_not_on_list'), { name: demoted });
        }
    });

    function commandListener({player, command, args}: {player: Player, command: string, args: string}) {
        let handler = listeners.get(command.toLocaleLowerCase());
        if (handler) {
            handler(player, args);
        }
    }
    world.onCommand.sub(commandListener);


    // Right now the uninstall function only has to remove the listener & storage
    ex.uninstall = function() {
        storage.clearNamespace('biblio_banks');
        world.onCommand.unsub(commandListener);
    };




    // Enter the land of the browsers
    if (ex.isNode || !ex.bot.getExports('ui')) {
        return;
    }


    let tab = new BankingTab(
        ex.bot.getExports('ui') as UIExtensionExports,
        accounts,
        permissions,
        bankers,
        messages,
        storage
    );

    ex.uninstall = function() {
        tab.remove();
        storage.clearNamespace('biblio_banks');
        world.onCommand.unsub(commandListener);
    };
});

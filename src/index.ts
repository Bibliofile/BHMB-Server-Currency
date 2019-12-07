import { MessageBot, Player } from '@bhmb/bot';
import { UIExtensionExports } from '@bhmb/ui';

import { BankingTab } from './tab';

import {
    AccountManager,
    PermissionManager,
    PermissionValues,
    BankerManager,
    MessageManager
} from './stored';

const currency_id = 'name';

MessageBot.registerExtension('bibliofile/banking', function(ex, world) {
    const storage = ex.storage;

    // Helpers
    const getCurrencyName = () => storage.get(currency_id, 'Server Coin');

    // Commands
    const listeners = new Map<string, (player: Player, args: string) => void>();

    const accounts = new AccountManager(storage, world);
    const messages = new MessageManager(storage);
    const permissions = new PermissionManager(storage);
    const bankers = new BankerManager(storage);

    function permissionCheck(player: Player, perm: PermissionValues): boolean {
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
        } catch {

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
        } catch (error) {
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

    listeners.set('pay', listeners.get('transfer')!)
    listeners.set('give', listeners.get('transfer')!)

    listeners.set('add', (player, args) => {
        const parts = args.match(/([1-9]\d*) (.+)/);
        if (!parts) return;
        if (!permissionCheck(player, permissions.getPerm('add'))) return;

        let amount = +parts[1];
        let to = parts[2];

        try {
            accounts.deposit(to, amount);
        } catch (error) {
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
        if (!parts) return;
        if (!permissionCheck(player, permissions.getPerm('silent'))) return;

        const amount = +parts[1];
        const to = parts[2];

        try {
            accounts.deposit(to, amount);
        } catch {
            // Fail silently
        }
    });

    listeners.set('adddaily', (player, args) => {
        const parts = args.match(/([1-9]\d*) (.+)/);
        if (!parts) return;
        if (!permissionCheck(player, permissions.getPerm('daily'))) return;

        const amount = +parts[1];
        const to = parts[2];

        if (!accounts.accountExists(to)) {
            ex.bot.send(messages.getMessage('error_no_account'), { name: to, command: 'adddaily'});
            return;
        }

        const lastAdd = accounts.getLastDaily(to);

        // If it's been more than 24 hours
        if (lastAdd / 1000 / 60/ 60 / 24 < Date.now() / 1000 / 60 / 60 / 24 - 1) {
            accounts.deposit(to, amount);
            accounts.updateLastDaily(to);
            ex.bot.send(messages.getMessage('daily_yes'), {
                amount: amount + '',
                currency: getCurrencyName(),
                name: to,
            });
        } else {
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
        if (!parts) return;
        if (!permissionCheck(player, permissions.getPerm('remove'))) return;

        const amount = +parts[1];
        const from = parts[2];

        if (!accounts.accountExists(from)) {
            ex.bot.send(messages.getMessage('error_no_account'), { name: from, command: 'remove' });
            return;
        }

        try {
            accounts.withdraw(from, amount);
        } catch{
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
        if (isNaN(amount)) return;
        if (!permissionCheck(player, permissions.getPerm('online'))) return;

        world.online.forEach(name => {
            try {
                accounts.deposit(name, amount);
            } catch {
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
        } else {
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
        } else {
            ex.bot.send(messages.getMessage('banker_not_on_list'), { name: demoted });
        }
    });

    function commandListener({player, message}: {player: Player, message: string}) {
        const [ command, ...args ] = message.split(' ');
        if (!command.startsWith('/')) return;
        const handler = listeners.get(command.substr(1).toLocaleLowerCase());
        if (handler) handler(player, args.join(' '));
    }
    world.onMessage.sub(commandListener);

    // Right now the uninstall function only has to remove the listener & storage
    ex.remove = () => world.onMessage.unsub(commandListener);


    // Enter the land of the browsers
    const ui = ex.bot.getExports('ui') as UIExtensionExports | undefined;
    if (!ui) return;

    let tab = new BankingTab(
        ui,
        accounts,
        permissions,
        bankers,
        messages,
        storage
    );

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

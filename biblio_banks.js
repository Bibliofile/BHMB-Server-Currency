/*jshint
    esnext:        true,
    browser:    true,
    devel:        true,
    unused:        true,
    undef:        true,
    -W097
*/
/*global
    MessageBotExtension,
    Awesomplete
*/

'use strict';

var biblio_banks = MessageBotExtension('biblio_banks');

//Migration
(function(storage) {
    //Yes, no break statements.
    //jshint -W086
    switch (storage.getObject('biblio_banks_migration', 0, false)) {
        case 0:
            storage.clearNamespace('biblio_banks_version');
            //Fix any NaN issues from older versions of the extension
            Object.keys(localStorage).forEach(function(key) {
                if (!key.startsWith('biblio_banks_accounts')) {
                    return;
                }

                var accounts = storage.getObject(key, {}, false); //Fake global as we have the full key.
                Object.keys(accounts).forEach(function(name) {
                    accounts[name].balance = accounts[name].balance || 0;
                });
                storage.set(key, accounts, false);
            });
            //Fix any messages with ammount misspelling
            Object.keys(localStorage).forEach(function(key) {
                if (!key.startsWith('biblio_banks_messages')) {
                    return;
                }

                var messages = storage.getObject(key, {}, false);
                Object.keys(messages).forEach(function(id) {
                    messages[id] = messages[id].replace(/ammount/g, 'amount');
                });
                storage.set(key, messages, false);
            });
    }
    //jshint +W086
    storage.set('biblio_banks_migration', 1);
}(biblio_banks.storage));


(function(ex) {
    ex.debug = false;
    ex.setAutoLaunch(true);
    ex.uninstall = function() {
        //Remove tab
        ex.ui.removeTab(ex.tab);

        //Remove listeners
        ex.hook.remove('world.command', checkCommands);

        //Remove stored bank
        ex.storage.removeNamespace(ex.id);
    };

    function defaultHelper(obj, defaults) {
        Object.keys(defaults).forEach(function(key) {
            if (!obj.hasOwnProperty(key)) {
                obj[key] = defaults[key];
            }
        });
    }

    ex.tab = ex.ui.addTab('Banking');

    ex.accounts = ex.storage.getObject('biblio_banks_accounts', {});
    if (!ex.accounts.SERVER) {
        ex.accounts.SERVER = {balance: 0};
    }
    ex.limit = ex.storage.getObject('biblio_banks_limit', 10000000);
    ex.bankers = ex.storage.getObject('biblio_banks_bankers', []);
    ex.currency = ex.storage.getString('biblio_banks_currency', 'Server Coin');

    ex.perms = ex.storage.getObject('biblio_banks_perms', {});
    defaultHelper(ex.perms, {
        check: 'All',
        add: 'AdminBanker',
        silent: 'AdminBanker',
        daily: 'AdminBanker',
        online: 'AdminBanker',
        remove: 'AdminBanker',
        banker: 'Admin',
    });
    ex.messages = ex.storage.getObject('biblio_banks_messages', {});
    defaultHelper(ex.messages, {
        check: '{{Name}} currently has {{amount}} {{currency}}.',
        transfer: 'Transferred {{amount}} {{currency}} from {{From}} to {{To}}.',
        add: 'Added {{amount}} {{currency}} to {{Name}}.',
        online: 'Everyone online has recieved {{amount}} {{currency}}!',
        daily_yes: 'Added daily reward of {{currency}} to {{Name}}.',
        daily_no: '{{Name}} has already recieved their daily reward.',
        last_daily: '{{Name}} last recieved a daily award at {{time}}',
        remove: 'Removed {{amount}} {{currency}} from {{Name}}.',
        banker_yes: '{{Name}} has been added to the banker list.',
        banker_on_list_already: '{{Name}} was already on the banker list.',
        banker_no: '{{Name}} has been removed from the banker list.',
        banker_not_on_list: '{{Name}} was not on the banker list.',
        error_no_account: 'Error: unable to {{command}}, the specified account does not exist.',
        error_limit_reached: 'Error: {{Name}} can\'t have more {{currency}} added to their account.',
        error_funds: 'Error: {{Name}} does not have enough {{currency}} to transfer funds.',
    });

    var account = {
        canExist: function(name) {
            var n = name.toLocaleUpperCase();
            return ex.bot.world.players.hasOwnProperty(n) || ex.accounts.hasOwnProperty(n);
        },
        createIfDoesNotExist: function(name) {
            var n = name.toLocaleUpperCase();
            if (!ex.accounts[n]) {
                ex.accounts[n] = {balance: 0};
            }
        },
    };
    account.getBalance = function(name) {
        //Assume account exists.
        return ex.accounts[name.toLocaleUpperCase()].balance;
    };
    account.setBalance = function(name, balance) {
        //Assume account exists.
        ex.accounts[name.toLocaleUpperCase()].balance = balance;
    };
    account.deposit = function(name, amount) {
        //Assume account exists.
        account.setBalance(name, account.getBalance(name) + amount);
    };
    account.withdraw = function(name, amount) {
        //Assume account exists.
        account.deposit(name, -amount);
    };
    account.transfer = function(from, to, amount) {
        account.withdraw(from, amount);
        account.deposit(to, amount);
    };
    account.getLastDaily = function(name) {
        return ex.accounts[name.toLocaleUpperCase()].last_daily_award || 0;
    };

    function merge(a, b) {
        var hash = {}, i;
        for (i=0; i<a.length; i++) {
            hash[a[i]] = true;
        }
        for (i=0; i<b.length; i++) {
            hash[b[i]] = true;
        }
        return Object.keys(hash);
    }

    function stripHTML(html) {
        return html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/'/g, '&apos;')
            .replace(/"/g, '&quot;');
    }

    function installLib(path, tag, prop) {
        return new Promise(function(resolve) {
            if (document.querySelector(tag + '[' + prop + '="' + path + '"]')) {
                return resolve();
            }

            var s = document.createElement(tag);
            s[prop] = path;
            if (tag == 'link') {
                s.rel = 'stylesheet';
            }

            //IE -.- Otherwise just listen for s.onload & don't check readyState
            s.onreadystatechange = s.onload = function() {
                if (!s.readyState || /loaded|complete/.test(s.readyState)) {
                    return resolve();
                }
            };

            document.head.appendChild(s);
        });
    }

    installLib('//cdnjs.cloudflare.com/ajax/libs/awesomplete/1.1.1/awesomplete.min.css', 'link', 'href');
    installLib('//cdnjs.cloudflare.com/ajax/libs/awesomplete/1.1.1/awesomplete.min.js', 'script', 'src')
        .then(ex.api.getLogs)
        .then(function() {
            //We just care that the logs were loaded, not about what was in them.
            if (ex.debug) console.log("Loaded!");

            var input = document.getElementById('biblio_banks_input');

            var players = merge(Object.keys(ex.bot.world.players), ex.accounts);
            if (!players.includes('SERVER')) {
                players.push('SERVER');
            }

            ex.awesomplete = new Awesomplete(input, {
                minChars: 1,
                maxItems: 8,
                autoFirst: false,
                list: players
            });

            input.disabled = false;
            input.placeholder = 'Enter a name...';
        });

    //Display functions
    ex.showAll = function() {
        if (ex.debug) { console.log('showAll');}

        var html = '<h4 style="margin-top:5px;">Bankers:</h4><ul style="padding-left: 1.5em;">';
        ex.bankers.forEach(function(banker) {
            html += '<li>' + stripHTML(banker);
        });

        html += '</ul><h4>All accounts:</h4><ul style="padding-left: 1.5em;">';

        Object.keys(ex.accounts).forEach(function(key) {
            account.createIfDoesNotExist(key); //Odd, but should fix the error
            html += '<li' + ((ex.bankers.includes(key)) ? ' style="color:#182B73">' : '>') +
                stripHTML(key) + ' has ' + account.getBalance(key) + ' ' + stripHTML(ex.currency);
        });
        html += '</ul>';
        document.getElementById('biblio_banks_user').innerHTML = html;
    };

    ex.accountInfo = function() {
        if (ex.debug) { console.log('accountInfo');}

        var name = document.getElementById('biblio_banks_input').value;
        var container = document.getElementById('biblio_banks_user');

        if (account.canExist(name)) {
            account.createIfDoesNotExist(name);
            var amount = account.getBalance(name);
            var safeName = stripHTML(name);
            var safeCurrency = stripHTML(ex.currency);

            var html = '<h4 style="margin-top: 5px;">' + safeName + '\'s Account:</h4>';

            html += '<p>' + safeName + ' has ' + amount + ' ' + safeCurrency + '</p>';

            html += '<p><label for="biblio_banks_banker">Banker: </label><input type="checkbox" id="biblio_banks_banker"';
                html += (ex.bankers.includes(name)) ? ' checked="checked"></p>' : '></p>';

            container.innerHTML = html;
            container.querySelector('input[type=checkbox]').addEventListener('change', function() {
                ex.setBanker(safeName, container.querySelector('input[type=checkbox]').checked);
            });
        }
    };

    //Group functions
    ex.setBanker = function(name, promoted) {
        if (ex.debug) { console.log('setBanker', name, promoted);}
        if (promoted) {
            if (!ex.bankers.includes(name)) {
                ex.bankers.push(name);
            }
        } else {
            if (ex.bankers.includes(name)) {
                ex.bankers.splice(ex.bankers.indexOf(name), 1);
            }
        }
        ex.save();
    };

    ex.save = function() {
        if (ex.debug) { console.log('saving...');}
        ex.currency = document.getElementById('biblio_banks_currency').value;
        ex.limit = parseInt(document.getElementById('biblio_banks_limit').value);

        var keys = Object.keys(ex.messages);
        ex.messages = {};
        keys.forEach(function(key) {
            ex.messages[key] = ex.tab.querySelector('#biblio_banks_tc input[data-msg-key="' + key + '"]').value;
        });

        keys = Object.keys(ex.perms);
        ex.perms = {};
        keys.forEach(function(key) {
            ex.perms[key] = ex.tab.querySelector('#biblio_banks_tc select[data-perm="' + key + '"]').value;
        }.bind(ex));

        ex.storage.set('biblio_banks_bankers', ex.bankers);
        ex.storage.set('biblio_banks_accounts', ex.accounts);
        ex.storage.set('biblio_banks_currency', ex.currency);
        ex.storage.set('biblio_banks_limit', ex.limit);
        ex.storage.set('biblio_banks_messages', ex.messages);
        ex.storage.set('biblio_banks_perms', ex.perms);
    };

    var listeners = {};
    function addListener(command, closure) {
        listeners[command.toLocaleUpperCase()] = closure;
    }
    function checkCommands(name, command, args) {
        if (listeners[command.toLocaleUpperCase()]) {
            listeners[command.toLocaleUpperCase()](name, args);
            ex.save();
        }
    }
    ex.hook.listen('world.command', checkCommands);

    function privilageCheck(name, command) {
        if (name == 'SERVER') {
            return true;
        }

        var target = ex.perms[command];

        switch (target.toLocaleLowerCase()) {
            case 'adminbanker':
                return ex.bot.checkGroup('Admin', name) || ex.bankers.includes(name);
            case 'banker':
                return ex.bankers.includes(name);
            default:
                return ex.bot.checkGroup(target, name);
        }
    }

    function sendHelper(message, replacements, name) {
        var m = Object.keys(replacements).reduce(function(p, key) {
            return p.replace(new RegExp('{{' + key + '}}', 'g'), replacements[key]);
        }, message);

        if (name) {
            m = m.replace(/{{NAME}}/g, name)
                .replace(/{{Name}}/g, name[0] + name.substr(1).toLocaleLowerCase())
                .replace(/{{name}}/g, name.toLocaleLowerCase());
        }

        if (m.length > 3) {
            ex.bot.send(m);
        }
    }

    addListener('check', function(name, args) {
        var check = name;
        if (args && privilageCheck(name, 'check')) {
            check = args.toLocaleUpperCase();
        }

        if (!account.canExist(check)) {
            sendHelper(ex.messages.error_no_account, {command: 'check'});
            return;
        }

        account.createIfDoesNotExist(check);

        sendHelper(ex.messages.check, {
            amount: account.getBalance(check),
            currency: ex.currency
        }, check);
    });

    addListener('transfer', function(name, args) {
        var parts = args.split(/([0-9]+) (.{1,})/);

        if (!parts[2]) {
            return; //Invalid match
        }

        account.createIfDoesNotExist(name);

        var amount = +parts[1];
        var to = parts[2].toLocaleUpperCase();

        //Sufficient funds?
        if (account.getBalance(name) < amount) {
            sendHelper(ex.messages.error_funds, {
                currency: ex.currency,
            }, name);
            return;
        }

        //Can we transfer currency to "to"?
        if (!account.canExist(to)) {
            sendHelper(ex.messages.error_no_account, {
                command: 'transfer',
            });
            return;
        }
        account.createIfDoesNotExist(to);

        //Will this transfer put the to account over the currency limit?
        if (account.getBalance(to) + amount > ex.limit) {
            sendHelper(ex.message.error_limit_reached, {
                currency: ex.currency,
            }, to);
            return;
        }

        //Everything checks out, do the transfer.
        account.transfer(name, to, amount);

        //Let users know it succeeded
        sendHelper(ex.messages.transfer, {
            FROM: name,
            From: name[0] + name.substr(1).toLocaleLowerCase(),
            from: name.toLocaleLowerCase(),
            TO: to,
            To: to[0] + to.substr(1).toLocaleLowerCase(),
            to: to.toLocaleLowerCase(),
            amount: amount,
            currency: ex.currency,
        });
    });

    addListener('add', function(name, args) {
        var parts = args.split(/([0-9]+) (.{1,})/);
        if (!parts[2]) {
            return; //Invalid match
        }

        if (!privilageCheck(name, 'add')) {
            return;
        }

        var amount = +parts[1];
        var to = parts[2].toLocaleUpperCase();

        //Can we even add to "to"?
        if (!account.canExist(to)) {
            ex.sendHelper(ex.messages.error_no_account, {
                command: 'add',
            });
            return;
        }
        account.createIfDoesNotExist(to);

        //Check the limit to be safe
        if (account.getBalance(to) + amount > ex.limit) {
            sendHelper(ex.messages.error_limit_reached, {
                currency: ex.currency,
            }, to);
            return;
        }

        //Everything checks out, add the currency.
        account.deposit(to, amount);

        //Let the user know we added the currency.
        sendHelper(ex.messages.add, {
            currency: ex.currency,
            amount: amount,
        }, to);
    });

    addListener('addsilent', function(name, args) {
        var parts = args.split(/([0-9]+) (.{1,})/);
        if (!parts[2]) {
            return; //Invalid format
        }

        if (!privilageCheck(name, 'silent')) {
            return;
        }

        var amount = +parts[1];
        var to = parts[2].toLocaleUpperCase();

        //Does or can the to account exist?
        if (!account.canExist(to)) {
            return;
        }
        account.createIfDoesNotExist(to);

        //Limit?
        if (account.getBalance(to) + amount > ex.limit) {
            return;
        }

        //Everything checks out, add the currency
        account.deposit(to, amount);
    });

    addListener('adddaily', function(name, args) {
        var parts = args.split(/([0-9]+) (.{1,})/);
        if (!parts[2]) {
            return; //Invalid format
        }

        if (!privilageCheck(name, 'daily')) {
            return;
        }

        var amount = +parts[1];
        var to = parts[2].toLocaleUpperCase();

        if (!account.canExist(to)) {
            sendHelper(ex.messages.error_no_account, {command: 'adddaily'});
        }
        account.createIfDoesNotExist(to);


        var lastAdd = account.getLastDaily(to);

        if (lastAdd / 1000 / 60 / 60 / 24 < Date.now() / 1000 / 60 / 60 / 24 - 1) {
            account.deposit(to, amount);
            ex.accounts[to].last_daily_award = Date.now();
            sendHelper(ex.messages.daily_yes, {
                amount: amount,
                currency: ex.currency,
            }, to);
        } else {
            sendHelper(ex.messages.daily_no, {
                amount: amount,
                currency: ex.currency,
            }, to);
        }
    });

    addListener('lastdaily', function(name, args) {
        var check = name;
        if (args && privilageCheck(name, 'lastdaily')) {
            check = args.toLocaleUpperCase();
        }

        if (!account.canExist(check)) {
            sendHelper(ex.messages.error_no_account, {command: 'lastdaily'});
            return;
        }

        sendHelper(ex.messages.last_daily, {
            time: (new Date(account.getLastDaily(check))).toString(),
        }, check);
    });

    addListener('remove', function(name, args) {
        var parts = args.split(/([0-9]+) (.{1,})/);
        if (!parts[2]) {
            return; //Invalid format
        }

        if (!privilageCheck(name, 'remove')) {
            return;
        }

        var amount = +parts[1];
        var user = parts[2].toLocaleUpperCase();

        if (!account.canExist(user)) {
            sendHelper(ex.messages.error_no_account, {command: 'remove'});
        }
        account.createIfDoesNotExist(user);

        if (account.getBalance(user) - amount < 0) {
            return; //No negative balances allowed.
        }

        account.withdraw(user, amount);
        sendHelper(ex.messages.remove, {
            amount: amount,
            currency: ex.currency,
        }, user);
    });

    addListener('addonline', function(name, args) {
        var amount = +args;
        if (isNaN(amount)) {
            return; //Invalid number to add
        }

        if (!privilageCheck(name, 'online')) {
            return;
        }

        ex.bot.world.online.forEach(function(player) {
            account.createIfDoesNotExist(player);
            //Silently ignore limit errors to avoid spam.
            if (account.getBalance(player) + amount <= ex.limit) {
                account.deposit(player, amount);
            }
        });

        sendHelper(ex.messages.online, {
            amount: amount,
            currency: ex.currency,
        });
    });

    addListener('banker', function(name, args) {
        if (!privilageCheck(name, 'banker')) {
            return;
        }

        var canidate = args.toLocaleUpperCase();

        if (!account.canExist(canidate)) {
            sendHelper(ex.message.error_no_account, {
                command: 'banker',
            });
            return;
        }

        if (!ex.bankers.includes(canidate)) {
            ex.bankers.push(canidate);
            sendHelper(ex.messages.banker_yes, {}, canidate);
        } else {
            sendHelper(ex.messages.banker_on_list_already, {}, canidate);
        }
    });

    addListener('unbanker', function(name, args) {
        if (!privilageCheck(name, 'banker')) {
            return;
        }
        var demoted = args.toLocaleUpperCase();

        if (ex.bankers.includes(demoted)) {
            ex.bankers.splice(ex.bankers.indexOf(demoted), 1);
            sendHelper(ex.messages.banker_no, {}, demoted);
        } else {
            sendHelper(ex.messages.banker_not_on_list, {}, demoted);
        }
    });

    ex.tab.innerHTML = ' <style>#biblio_banks_tn{width:100%;display:-webkit-box;display:-ms-flexbox;display:flex;-ms-flex-flow:row wrap;flex-flow:row wrap}#biblio_banks_tn>span{background:#182B73;color:#fff;height:40px;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-flex:1;-ms-flex-positive:1;flex-grow:1;margin-top:5px;margin-right:5px;min-width:120px}#biblio_banks_tn>span.selected{background:#E7E7E7;color:#000}#biblio_banks_tc>div{display:none;height:calc(100vh - 155px);overflow-y:auto;background:#E7E7E7;padding:5px}#biblio_banks_tc>div.visible{display:block}#mb_biblio_banks_search .awesomplete{top:7px}#biblio_banks_user{margin-top:5px}#biblio_banks_tc [data-tab-name=settings]>input{width:calc(100% - 20px);margin-left:10px}</style> <nav data-scope=biblio_banks_tc id=biblio_banks_tn> <span data-tab-name=commands class=selected>Commands</span> <span data-tab-name=search>Search</span> <span data-tab-name=settings>Settings</span> </nav> <div id=biblio_banks_tc> <div data-tab-name=commands class=visible> <ul style=padding-left:1.5em> <li>/CHECK - Checks how much currency the user has.</li> <li>/CHECK [name] - (<select data-perm=check> <option value=All>everyone</option> <option value=Admin>admin only</option> <option value=AdminBanker>admin &amp; banker only</option> <option value=Banker>banker only</option> </select>) Checks how much currency [name] has.</li> <li>/TRANSFER [ammount] [to] - Transfers [ammount] from the current user&apos;s account to the [to] account.</li> <li>/ADD [ammount] [name] - (<select data-perm=add> <option value=Admin>admin</option> <option value=AdminBanker>admin &amp; banker</option> <option value=Banker>banker</option> </select> only) Adds [ammount] to [name]&apos;s account.</li> <li>/ADDSILENT [ammount] [name] - (<select data-perm=silent> <option value=Admin>admin</option> <option value=AdminBanker>admin &amp; banker</option> <option value=Banker>banker</option> </select> only) Adds [ammount] to [name]&apos;s account. Does not send a message on success or failure.</li> <li>/ADDDAILY [ammount] [name] - (<select data-perm=daily> <option value=Admin>admin</option> <option value=AdminBanker>admin &amp; banker</option> <option value=Banker>banker</option> </select> only) Adds [ammount] to [name]&apos;s account. Can only add to an account once per day.</li> <li>/LASTDAILY - Checks the last time the user recieved a daily award.</li> <li>/LASTDAILY [name] - (<select data-perm=lastdaily> <option value=Admin>admin</option> <option value=AdminBanker>admin &amp; banker</option> <option value=Banker>banker</option> </select> only) Checks the last time [name] recieved a daily award.</li> <li>/ADDONLINE [ammount] - (<select data-perm=online> <option value=Admin>admin only</option> <option value=AdminBanker>admin &amp; banker only</option> <option value=Banker>banker only</option> </select> only) Adds [ammount] to everyone who is online.</li> <li>/REMOVE [ammount] [name] - (<select data-perm=remove> <option value=Admin>admin</option> <option value=AdminBanker>admin &amp; banker</option> <option value=Banker>banker</option> </select> only) Removes [ammount] from [name]&apos;s account.</li> <li>/BANKER [name] or /UNBANKER [name] - (<select data-perm=banker> <option value=Admin>admin</option> <option value=AdminBanker>admin &amp; banker</option> <option value=Banker>banker</option> </select> only) Adds or removes [name] to/from the banker list.</li> </ul> </div> <div data-tab-name=search> <p> <input id=biblio_banks_input disabled placeholder=Loading...> or <a>view all bank accounts</a> </p> <div id=biblio_banks_user></div> </div> <div data-tab-name=settings> <h3>General</h3> <label>Currency Name:</label> <input id=biblio_banks_currency> <label>Account Currency Limit:</label> <input id=biblio_banks_limit max=100000000 min=0 type=number> <h3>Responses - Commands</h3> <label>/CHECK:</label> <input data-msg-key=check> <label>/TRANSFER:</label> <input data-msg-key=transfer> <label>/ADD:</label> <input data-msg-key=add> <label>/ADDONLINE:</label> <input data-msg-key=online> <label>/ADDDAILY - Added:</label> <input data-msg-key=daily_yes> <label>/ADDDAILY - Already added:</label> <input data-msg-key=daily_no> <label>/LASTDAILY:</label> <input data-msg-key=last_daily> <label>/REMOVE:</label> <input data-msg-key=remove> <label>/BANKER - Added:</label> <input data-msg-key=banker_yes> <label>/BANKER - Already on list:</label> <input data-msg-key=banker_on_list_already> <label>/UNBANKER - Removed:</label> <input data-msg-key=banker_no> <label>/UNBANKER - Not a banker:</label> <input data-msg-key=banker_not_on_list> <h3>Responses - Errors</h3> <label>Account does not exist:</label> <input data-msg-key=error_no_account> <label>Account limit reached:</label> <input data-msg-key=error_limit_reached> <label>Insufficient funds:</label> <input data-msg-key=error_funds> </div> </div>';




    //Show the saved preferences
    document.getElementById('biblio_banks_currency').value = ex.currency;
    document.getElementById('biblio_banks_limit').value = ex.limit;

    Object.keys(ex.messages).forEach(function(message) {
        ex.tab.querySelector('#biblio_banks_tc input[data-msg-key="' + message +'"]').value = ex.messages[message];
    });

    Object.keys(ex.perms).forEach(function(key) {
        ex.tab.querySelector('#biblio_banks_tc select[data-perm="' + key + '"]').value = ex.perms[key];
    });

    //Event listeners
    ex.tab.querySelector('nav').addEventListener('click', function(event) {
        var tabName = event.target.dataset.tabName;
        if (tabName) {
            //Tab nav
            document.querySelector('#biblio_banks_tn > .selected').classList.remove('selected');
            event.target.classList.add('selected');
            //Tab content
            document.querySelector('#biblio_banks_tc > .visible').classList.remove('visible');
            document.querySelector('#biblio_banks_tc [data-tab-name="' + tabName + '"]').classList.add('visible');

        }
    });
    ex.tab.querySelector('a').addEventListener('click', ex.showAll);
    ex.tab.querySelector('[data-tab-name="commands"]').addEventListener('change', ex.save);
    ex.tab.querySelector('[data-tab-name="settings"]').addEventListener('change', ex.save);
    document.getElementById('biblio_banks_input').addEventListener('blur', ex.accountInfo);
    document.getElementById('biblio_banks_input').addEventListener('keyup', ex.accountInfo);
    document.getElementById('biblio_banks_input').addEventListener('awesomplete-selectcomplete', ex.accountInfo);
}(biblio_banks));

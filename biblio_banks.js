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

var biblio_banks = new MessageBotExtension('biblio_banks');

(function() {
	this.version = '3';
	//Debug
	//this.bot.devMode = true;
	this.debug = true;
	
	
	//Libraries
	this.installLib = function(path, tag, property) {
		if (this.debug) { console.log('installLib', path, tag, property);}
		var list = document.getElementsByTagName(tag);
		var i = list.length;
		while (i--) {
			if (list[i][property] == path) {
				return;
			}
		}
		var s = document.createElement(tag);
		s[property] = path;
		if (tag == 'link') {
			s.rel = 'stylesheet';
		}
		
		document.head.appendChild(s);
	};
	this.installLib('//cdnjs.cloudflare.com/ajax/libs/awesomplete/1.0.0/awesomplete.min.js', 'script', 'src');
	this.installLib('//cdnjs.cloudflare.com/ajax/libs/awesomplete/1.0.0/awesomplete.min.css', 'link', 'href');
	this.lazyLoad = function() {
		if (typeof Awesomplete == 'function' && Object.keys(biblio_banks.core.players).length) {
			if (this.debug) { console.log('Lazy Load');}
			this.awesomplete = new Awesomplete(document.getElementById('biblio_banks_input'), {
				minChars: 1,
				maxItems: 8,
				autoFirst: false
			});

			setTimeout(function() {
				var tmpList = Object.keys(biblio_banks.core.players);
				tmpList.push('SERVER');
				biblio_banks.awesomplete.list = tmpList;
				document.getElementById('biblio_banks_input').removeAttribute('disabled');
				document.getElementById('biblio_banks_input').placeholder = 'Search by name';
			}, 1000);
		} else {
			setTimeout(this.lazyLoad.bind(this), 1000);
		}
	};
	
	//Uninstall
	this.uninstall = function() {
		//Unsafe to use "this" here.
		biblio_banks.removeServerListener('checkCommands');
		biblio_banks.removeBeforeSendListener('checkCommands');
		Object.keys(localStorage).forEach(function(key) { 
			if (key.indexOf('biblio_banks_') === 0) {
				localStorage.removeItem(key);
			}
		});
	};
	
	///Display functions
	this.showAll = function() {
		if (this.debug) { console.log('showAll');}
		var html = '<h4 style="margin-top:5px;">Bankers:</h4><ul style="padding-left: 1.5em;">';
		this.bankers.forEach(function(banker) {
			html += '<li>' + this.bot.stripHTML(banker);
		}.bind(this));

		html += '</ul><h4>All accounts:</h4><ul style="padding-left: 1.5em;">';

		Object.keys(this.accounts).forEach(function(key) {
			html += '<li' + ((this.bankers.indexOf(key) != -1) ? ' style="color:#182B73">' : '>') +
				this.bot.stripHTML(key) + ' has ' + this.accounts[key].balance + ' ' + this.currency;
		}.bind(this));
		html += '</ul>';
		document.getElementById('biblio_banks_user').innerHTML = html;
	};
	this.accountInfo = function() {
		if (this.debug) { console.log('accountInfo');}
		var name = document.getElementById('biblio_banks_input').value;
		var container = document.getElementById('biblio_banks_user');
		if (biblio_banks.core.players.hasOwnProperty(name)) {
			var ammount = (biblio_banks.accounts.hasOwnProperty(name)) ? this.accounts[name].balance : 0;
			var safeName = biblio_banks.bot.stripHTML(name), safeCurrency = biblio_banks.bot.stripHTML(biblio_banks.currency);
			var h = '<h4 style="margin-top: 5px;">' + safeName + '\'s Account:</h4>';
			h += '<p>' + safeName + ' has ' + ammount + ' ' + safeCurrency + '</p>';
			h += '<p><label for="biblio_banks_banker">Banker: </label><input type="checkbox" id="biblio_banks_banker"';
				h += ' onchange="biblio_banks.setBanker.call(biblio_banks, \'' + name.replace(/'/g, '\\\'') + '\', this.checked)"';
				h += (biblio_banks.bankers.indexOf(name) != -1) ? ' checked="checked"></p>' : '></p>';
			h += '<p><button onclick="biblio_banks.add.call(biblio_banks,\'' + name.replace(/'/g, '\\\'') + '\')">Add ' + safeCurrency + '</button><button onclick="biblio_banks.remove.call(biblio_banks,\'' + name.replace(/'/g, '\\\'') + '\')">Remove ' + safeCurrency + '</button></p>';
			container.innerHTML = h;
		}
	};
	
	//Group functions
	this.setBanker = function(name, promoted) {
		if (this.debug) { console.log('setBanker', name, promoted);}
		if (promoted) {
			if (this.bankers.indexOf(name) == -1) {
				this.bankers.push(name);
			}
		} else {
			var i = this.bankers.indexOf(name);
			if (i != -1) {
				this.bankers.splice(i, 1);
			}
		}

		localStorage.setItem('biblio_banks_bankers' + window.worldId, JSON.stringify(this.bankers));
	};
	
	//Admin functions
	this.add = function(name) {
		if (this.debug) { console.log('add', name);}
		var num = prompt('How much ' + this.currency + ' would you like to add to ' + name + '\'s account?');
		if (this.accounts.hasOwnProperty(name)) {
			this.accounts[name].balance += (isNaN(parseInt(num))) ? 0 : parseInt(num);
		} else if (biblio_banks.core.players.hasOwnProperty(name)) {
			this.accounts[name] = {};
			this.accounts[name].balance = (isNaN(parseInt(num))) ? 0 : parseInt(num);
		}
		this.accountInfo();
		this.save();
	};
	this.remove = function(name) {
		if (this.debug) { console.log('remove', name);}
		var num = prompt('How much ' + this.currency + ' would you like to remove from ' + name + '\'s account?');
		if (this.accounts.hasOwnProperty(name)) {
			this.accounts[name].balance -= (isNaN(parseInt(num))) ? 0 : parseInt(num);
		} else if (this.core.players.hasOwnProperty(name)) {
			this.accounts[name].balance = (isNaN(parseInt(num))) ? 0 : -1 * parseInt(num);
		}
		this.accountInfo();
		this.save();
	};
	
	//Saving functions
	this.save = function() {
		if (this.debug) { console.log('saving...');}
		this.currency = document.getElementById('biblio_banks_currency').value;
		this.limit = parseInt(document.getElementById('biblio_banks_limit').value);
		
		var keys = Object.keys(this.messages);
		this.messages = {};
		keys.forEach(function(key) {
			this.messages[key] = this.settingsTab.querySelector('input[data-msg-key="' + key + '"]').value;
		}.bind(this));
		
		keys = Object.keys(this.perms);
		this.perms = {};
		keys.forEach(function(key) {
			this.perms[key] = this.settingsTab.querySelector('select[data-perm="' + key + '"]').value;
		}.bind(this));
		
		
		localStorage.setItem('biblio_banks_bankers' + window.worldId, JSON.stringify(this.bankers));
		localStorage.setItem('biblio_banks_accounts' + window.worldId, JSON.stringify(this.accounts));
		localStorage.setItem('biblio_banks_currency' + window.worldId, this.currency);
		localStorage.setItem('biblio_banks_limit' + window.worldId, this.limit);
		localStorage.setItem('biblio_banks_messages' + window.worldId, JSON.stringify(this.messages));
		localStorage.setItem('biblio_banks_perms' + window.worldId, JSON.stringify(this.perms));
	};
	
	//Functions to handle chat types
	this.commandCheck = function(tmpdata) {
		if (this.debug) { console.log('ChatMsg', tmpdata);}
		
		function privilageCheck(ext, command, name) {
			if (name == 'SERVER') {
				return true;
			}
			var target = ext.perms[command];
			
			if (ext.bot.checkGroup(target, name)) {
				return true;
			} else if (target == 'AdminBanker') {
				if (ext.bot.checkGroup('Admin', name) || ext.bankers.indexOf(name) != -1) {
					return true;
				}
			} else if (target == 'Banker') {
				return ext.bankers.indexOf(name) != -1;
			}
			return false;
		}
		
		var data = (typeof tmpdata == 'string') ? {name: 'SERVER', message: tmpdata} : tmpdata;
		data.message = data.message.toLocaleUpperCase();
		
		if (/^\/CHECK ?$/.test(data.message)) {
			if (this.debug) { console.log('Check no privilage');}
			this.checkCmd(data);
		} else if (/^\/TRANSFER [0-9]+ .{3,}/.test(data.message)) {
			if (this.debug) { console.log('Transfer');}
			this.transferCmd(data);
		}

		if (/^\/ADD [0-9]+ .{3,}/.test(data.message) && privilageCheck(this, 'add', data.name)) {
			if (this.debug) { console.log('Add');}
			this.addCmd(data);
		} else if (/^\/REMOVE [0-9]+ .{3,}/.test(data.message) && privilageCheck(this, 'remove', data.name)) {
			if (this.debug) { console.log('Remove');}
			this.removeCmd(data);
		} else if (/^\/ADDSILENT [0-9]+ .{3,}/.test(data.message) && privilageCheck(this, 'silent', data.name)) {
			if (this.debug) { console.log('AddSilent');}
			this.addSilentCmd(data);
		} else if (/^\/ADDONLINE [0-9]+/.test(data.message) && privilageCheck(this, 'online', data.name)) {
			if (this.debug) { console.log('AddOnline');}
			this.onlineCmd(data);
		} else if (/^\/ADDDAILY [0-9]+ .{3,}/.test(data.message) && privilageCheck(this, 'daily', data.name)) {
			if (this.debug) { console.log('AddDaily');}
			this.addDailyCmd(data);
		} else if (/^\/(UN)?BANKER .{3,}/.test(data.message) && privilageCheck(this, 'banker', data.name)) {
			if (this.debug) { console.log('(Un)Banker');}
			this.bankerCmd(data);
		} else if (/^\/CHECK .{3,16}/.test(data.message) && privilageCheck(this, 'check', data.name)) {
			if (this.debug) { console.log('Check Privilaged');}
			this.checkCmd(data);
		}
		//As this is bound both as a beforesend listener and a trigger listener, we need to return the original message we were passed.
		return tmpdata;
	};
	this.checkCmd = function(data) {
		var name = data.name;
		
		var parts = data.message.split(/(\/CHECK)( |$)(.{3,})?/);
		if (typeof parts[3] == 'string') {
			name = parts[3];
		}
		
		if (!this.core.players.hasOwnProperty(name) && name != 'SERVER') {
			this.sendHelper(this.messages.error_no_account, ['{{command}}'], ['check']);
			return;
		}
		
		if (!this.accounts.hasOwnProperty(name)) {
			this.accounts[name] = {};
			this.accounts[name].balance = 0;
		}

		var ammount = this.accounts[name].balance || 0;
	
		this.sendHelper(this.messages.check, 
						['{{NAME}}', '{{Name}}', '{{name}}', '{{ammount}}', '{{currency}}'],
					    [name, name[0] + name.substr(1).toLocaleLowerCase(), name.toLocaleLowerCase(), ammount, this.currency]);
	};
	this.transferCmd = function(data) {
		var parts = data.message.split(/(?:\/TRANSFER)(?: )([0-9]+)(?: )(.{3,})/);
		var ammount = parseInt(parts[1]);
		var name = parts[2];
		
		//Trasferer new account
		if (!this.accounts.hasOwnProperty(data.name)) {
			this.accounts[data.name] = {};
			this.accounts[data.name].balance = 0;
		}
		
		var oldAmmountFrom = this.accounts[data.name] || 0; //NaN fix
		
		if (oldAmmountFrom < ammount) {
			this.sendHelper(this.messages.error_funds, 
						  ['{{NAME}}', '{{Name}}', '{{name}}', '{{currency}}'],
						  [data.name, data.name[0] + data.name.substr(1).toLocaleLowerCase(), data.name.toLocaleLowerCase(), this.currency]);
			return;
		}
		
		//Check if reciever account can exist, if it doesn't exist and can exist then create it.
		if (!this.core.players.hasOwnProperty(name) && name != 'SERVER') {
			this.sendHelper(this.messages.error_no_account, ['{{command}}'], ['transfer']);
			return;
		}
		if (!this.accounts.hasOwnProperty(name)) {
			this.accounts[name] = {};
			this.accounts[name].balance = 0;
		} 
		
		var oldAmmountTo = this.accounts[name].balance || 0; //NaN fix
		
		//Handle ammounts over the limit
		if (oldAmmountTo + ammount > this.limit) {
			this.sendHelper(this.messages.error_limit_reached,
						  ['{{NAME}}', '{{Name}}', '{{name}}', '{{currency}}'],
						  [name, name[0] + name.substr(1).toLocaleLowerCase(), name.toLocaleLowerCase(), this.currency]);
			return;
		}
		
		this.accounts[name].balance = oldAmmountTo + ammount;
		
		this.accounts[data.name].balance = oldAmmountFrom - ammount;
		
		this.sendHelper(this.messages.transfer,
					  ['{{FROM}}', '{{From}}', '{{from}}', 
						'{{TO}}', '{{To}}', '{{to}}', 
						'{{ammount}}', '{{currency}}'],
					  [data.name, data.name[0] + data.name.substr(1).toLocaleLowerCase(), data.name.toLocaleLowerCase(),
					   name, name[0] + name.substr(1).toLocaleLowerCase(), name.toLocaleLowerCase(),
					   ammount, this.currency]);
		
		this.save();
	};
	this.addCmd = function(data) {
		var parts = data.message.split(/(?:\/ADD)(?: )([0-9]+)(?: )(.{3,})/);
		var ammount = parseInt(parts[1]);
		var name = parts[2];
		
		if (!this.core.players.hasOwnProperty(name) && name != 'SERVER') {
			this.sendHelper(this.messages.error_no_account, ['{{command}}'], ['add']);
			return;
		}
		
		//Newly made account
		if (!this.accounts.hasOwnProperty(name)) {
			this.accounts[name] = {};
			this.accounts[name].balance = 0;
		}
		
		var oldAmmount = this.accounts[name].balance || 0;
		
		if (oldAmmount + ammount > this.limit) {
			this.sendHelper(this.messages.error_limit_reached,
						  ['{{NAME}}', '{{Name}}', '{{name}}', '{{currency}}'],
						  [name, name[0] + name.substr(1).toLocaleLowerCase(), name.toLocaleLowerCase(), this.currency]);
			return;
		}
		
		this.accounts[name].balance = oldAmmount + ammount;
		
		this.save();
		
		this.sendHelper(this.messages.add, 
					  ['{{NAME}}', '{{Name}}', '{{name}}', '{{ammount}}', '{{currency}}'],
					  [name, name[0] + name.substr(1).toLocaleLowerCase(), name.toLocaleLowerCase(), ammount, this.currency]);
	};
	this.addSilentCmd = function(data) {
		var parts = data.message.split(/(?:\/ADDSILENT)(?: )([0-9]+)(?: )(.{3,})/);
		var ammount = parseInt(parts[1]);
		var name = parts[2];
		
		if (!this.core.players.hasOwnProperty(name) && name != 'SERVER') {
			//No account
			return;
		}
		
		//Newly made account
		if (!this.accounts.hasOwnProperty(name)) {
			this.accounts[name] = {};
			this.accounts[name].balance = 0;
		}
		//Fix NaN ammounts
		var oldAmmount = this.accounts[name].balance || 0;
		
		if (oldAmmount + ammount <= this.limit) {
			this.accounts[name].balance = oldAmmount + ammount;
			this.save();
		}
	};
	this.addDailyCmd = function(data) {
		var parts = data.message.split(/(?:\/ADDDAILY)(?: )([0-9]+)(?: )(.{3,})/);
		var ammount = parseInt(parts[1]);
		var name = parts[2];
		
		if (!this.core.players.hasOwnProperty(name) && name != 'SERVER') {
			//No account
			this.sendHelper(this.messages.error_no_account, ['{{command}}'], ['adddaily']);
			return;
		}
		
		//Newly made account
		if (!this.accounts.hasOwnProperty(name)) {
			this.accounts[name] = {};
			this.accounts[name].balance = 0;
		}
		//Fix NaN ammounts
		var oldAmmount = this.accounts[name].balance || 0;
		var last_daily_add = this.accounts[name].last_daily_award || 0;
		
		if (last_daily_add / 1000 / 60 / 60 / 24 < Date.now() / 1000 / 60 / 60 / 24 - 1) {
			this.accounts[name].balance = oldAmmount + ammount;
			this.accounts[name].last_daily_award = Date.now();
			this.sendHelper(this.messages.daily_yes, 
					  ['{{NAME}}', '{{Name}}', '{{name}}', '{{ammount}}', '{{currency}}'],
					  [name, name[0] + name.substr(1).toLocaleLowerCase(), name.toLocaleLowerCase(), ammount, this.currency]);
		} else {
			this.sendHelper(this.messages.daily_no, 
					  ['{{NAME}}', '{{Name}}', '{{name}}', '{{ammount}}', '{{currency}}'],
					  [name, name[0] + name.substr(1).toLocaleLowerCase(), name.toLocaleLowerCase(), ammount, this.currency]);
		}
	};
	this.removeCmd = function(data) {
		var parts = data.message.split(/(?:\/REMOVE)(?: )([0-9]+)(?: )(.{3,})/);
		var ammount = parseInt(parts[1]);
		var name = parts[2];
		
		if (!this.accounts.hasOwnProperty(name) && !this.core.players.hasOwnProperty(name)) {
			this.sendHelper(this.messages.error_no_account, ['{{command}}'], ['remove']);
		}
		
		var oldAmmount = (this.accounts.hasOwnProperty(name)) ? this.accounts[name].balance : 0;
		//Fix NaN ammounts
		oldAmmount = oldAmmount || 0;
		
		if (oldAmmount - ammount > 0) { //Silently disallow a negative balance
			this.accounts[name].balance = oldAmmount - ammount;
			this.save();

			this.sendHelper(this.messages.remove,
						  ['{{NAME}}', '{{Name}}', '{{name}}', '{{ammount}}', '{{currency}}'],
						  [name, name[0] + name.substr(1).toLocaleLowerCase(), name.toLocaleLowerCase(), ammount, this.currency]);
		}
	};
	this.onlineCmd = function(data) {
		var parts = data.message.split(/(?:\/ADDONLINE )([0-9]+)/);
		var ammount = parseInt(parts[1]);
		
		this.core.online.forEach(function(player) {
			var oldAmmount = (this.accounts.hasOwnProperty(player)) ? this.accounts[player].balance : 0;
			if (oldAmmount + ammount <= this.limit) {
				this.accounts[player].balance = oldAmmount + ammount;
			}
			//Silently fall through on limit errors here, otherwise potential spam.
		}.bind(this));
		this.save();
		
		this.sendHelper(this.messages.online,
					  ['{{ammount}}', '{{currency}}'],
					  [ammount, this.currency]);
	};
	this.bankerCmd = function(data) {
		var privilage = data.message.indexOf('/B') === 0;
		var name = data.message.split(/(?:\/(?:UN)?BANKER)(?: )(.{3,})/)[1];
		
		if (privilage) {
			//Adding to banker list
			if (this.bankers.indexOf(name) == -1) {
				this.bankers.push(name);
				this.save();
				this.sendHelper(this.messages.banker_yes,
							   ['{{NAME}}', '{{Name}}', '{{name}}'],
							   [name, name[0] + name.substr(1).toLocaleLowerCase(), name.toLocaleLowerCase()]);
				return;
			}
			
			this.sendHelper(this.messages.banker_on_list_already,
						   ['{{NAME}}', '{{Name}}', '{{name}}'],
						   [name, name[0] + name.substr(1).toLocaleLowerCase(), name.toLocaleLowerCase()]);
			return;
		}
		
		var bankerIndex = this.bankers.indexOf(name);
		if (bankerIndex == -1) {
			this.sendHelper(this.messages.banker_not_on_list,
						   ['{{NAME}}', '{{Name}}', '{{name}}'],
						   [name, name[0] + name.substr(1).toLocaleLowerCase(), name.toLocaleLowerCase()]);
			return;
		}

		this.bankers.splice(bankerIndex, 1);
		this.save();
		
		this.sendHelper(this.messages.banker_no,
					   ['{{NAME}}', '{{Name}}', '{{name}}'],
					   [name, name[0] + name.substr(1).toLocaleLowerCase(), name.toLocaleLowerCase()]);
	};
	
	this.sendHelper = function(message, find, replace) {
		var tmpMsg = message;
		find.forEach(function(f, i) {
			tmpMsg = this.bot.replaceAll(tmpMsg, f, replace[i]);
		}.bind(this));
		
		this.core.send(tmpMsg);
	};
	
	
	//Setup
	//====================================================================================
	this.setAutoLaunch(true);
	
	function defaultHelper(obj, prop, def) {
		if (!obj.hasOwnProperty(prop)) {
			obj[prop] = def;
		}
	}
	
	//Previously, a version was not set. Default to 2.
	var lastVersion = localStorage.getItem('biblio_banks_version');
	lastVersion = (lastVersion === null) ? '2' : lastVersion;
	//Save the current version
	localStorage.setItem('biblio_banks_version', this.version);
	if (lastVersion == '2') {
		//Upgrade needed.

		//Loop through every localStorage item
		Object.keys(localStorage).forEach(function(key) {
			//Only make a change if this was an account object
			if (key.indexOf('biblio_banks_accounts') === 0) {
				//Get the old object
				var accounts = localStorage.getItem(key);
				//Just in case, default to an empty object.
				accounts = (accounts === null) ? {} : JSON.parse(accounts);
				var newAccounts = {};

				//Loop through the old accounts, change the format {BIBLIOPHILE: 1} to {BIBLIOPHILE: {balance: 1}}
				Object.keys(accounts).forEach(function(name) {
					newAccounts[name] = {};
					newAccounts[name].balance = accounts[name];
				});

				//Save the altered account object
				localStorage.setItem(key, JSON.stringify(newAccounts));
			}			
		});
	}
	
	this.currency = localStorage.getItem('biblio_banks_currency' + window.worldId);
	this.currency = (this.currency === null) ? 'Server Coin' : this.currency;
	
	this.accounts = localStorage.getItem('biblio_banks_accounts' + window.worldId);
	this.accounts = (this.accounts === null) ? {} : JSON.parse(this.accounts);
	if (!this.accounts.hasOwnProperty('SERVER')) {
		this.accounts.SERVER = {};
		this.accounts.SERVER.balance = 0;
	}
	
	this.bankers = localStorage.getItem('biblio_banks_bankers' + window.worldId);
	this.bankers = (this.bankers === null) ? [] : JSON.parse(this.bankers);
	
	this.limit = localStorage.getItem('biblio_banks_limit' + window.worldId);
	this.limit = (this.limit === null) ? 10000000 : parseInt(this.limit); //Default: 10mil
	
	this.perms = localStorage.getItem('biblio_banks_perms' + window.worldId);
	this.perms = (this.perms === null) ? {} : JSON.parse(this.perms);
	defaultHelper(this.perms, 'check', 'All');
	defaultHelper(this.perms, 'add', 'AdminBanker');
	defaultHelper(this.perms, 'silent', 'AdminBanker');
	defaultHelper(this.perms, 'online', 'AdminBanker');
	defaultHelper(this.perms, 'remove', 'AdminBanker');
	defaultHelper(this.perms, 'banker', 'Admin');
	
	this.messages = localStorage.getItem('biblio_banks_messages' + window.worldId);
	this.messages = (this.messages === null) ? {} : JSON.parse(this.messages);
	defaultHelper(this.messages, 'check', '{{Name}} currently has {{ammount}} {{currency}}.');
	defaultHelper(this.messages, 'transfer', 'Transferred {{ammount}} {{currency}} from {{From}} to {{To}}.');
	defaultHelper(this.messages, 'add', 'Added {{ammount}} {{currency}} to {{Name}}.');
	defaultHelper(this.messages, 'online', 'Everyone online has recieved {{ammount}} {{currency}}!');
	defaultHelper(this.messages, 'daily_yes', 'Added daily reward of {{currency}} to {{Name}}.');
	defaultHelper(this.messages, 'daily_no', '{{Name}} has already recieved their daily reward.');
	defaultHelper(this.messages, 'remove', 'Removed {{ammount}} {{currency}} from {{Name}}.');
	defaultHelper(this.messages, 'banker_yes', '{{Name}} has been added to the banker list.');
	defaultHelper(this.messages, 'banker_on_list_already', '{{Name}} was already on the banker list.');
	defaultHelper(this.messages, 'banker_no', '{{Name}} has been removed from the banker list.');
	defaultHelper(this.messages, 'banker_not_on_list', '{{Name}} was not on the banker list.');
	defaultHelper(this.messages, 'error_no_account', 'Error: unable to {{command}}, the specified account does not exist.');
	defaultHelper(this.messages, 'error_limit_reached', 'Error: {{Name}} can\'t have more {{currency}} added to their account.');
	defaultHelper(this.messages, 'error_funds', 'Error: {{Name}} does not have enough {{currency}} to transfer funds.');
	
	this.addTriggerListener('checkCommands', this.commandCheck.bind(this));
	this.addBeforeSendListener('checkCommands', this.commandCheck.bind(this));
	
	this.addSettingsTab('Banking');
	this.settingsTab.innerHTML = '<style>#mb_biblio_banks_search div.awesomplete { top:7px; }#biblio_banks_user { margin-top: 5px;}#biblio_banks_user button { margin-right: 5px; padding: 2px; border: 2px solid #666;}#mb_biblio_banks_messages > input { width: calc(100% - 20px); margin-left: 10px;}#biblio_banks_mt > div.visible { background: #E7E7E7; }#biblio_banks_mt > div { min-height: calc(100vh - 280px); padding: 5px; margin-bottom: 20px; }</style><nav class="botTabs" tab-contents="biblio_banks_mt"><div tab-name="biblio_banks_commands" class="selected">Commands</div><div tab-name="biblio_banks_search">Search</div><div tab-name="biblio_banks_messages">Settings</div></nav><div id="biblio_banks_mt" class="tabContainer"><div id="mb_biblio_banks_commands" class="visible"><ul style="padding-left: 1.5em;"><li>/CHECK - Checks how much currency the user has.<li>/CHECK [name] - (<select data-perm="check"><option value="All">everyone</option><option value="Admin">admin only</option><option value="AdminBanker">admin &amp; banker only</option><option value="Banker">banker only</option></select>) Checks how much currency [name] has.<li>/TRANSFER [ammount] [to] - Transfers [ammount] from the current user\'s account to the [to] account.<li>/ADD [ammount] [name] - (<select data-perm="add"><option value="Admin">admin only</option><option value="AdminBanker">admin &amp; banker only</option><option value="Banker">banker only</option></select> only) Adds [ammount] to [name]\'s account.<li>/ADDSILENT [ammount] [name] - (<select data-perm="silent"><option value="Admin">admin only</option><option value="AdminBanker">admin &amp; banker only</option><option value="Banker">banker only</option></select> only) Adds [ammount] to [name]\'s account. Does not send a message on success or failure.<li>/ADDDAILY [ammount] [name] - (<select data-perm="daily"><option value="Admin">admin only</option><option value="AdminBanker">admin &amp; banker only</option><option value="Banker">banker only</option></select> only) Adds [ammount] to [name]\'s account. Can only add to an account once per day.<li>/ADDONLINE [ammount] - (<select data-perm="online"><option value="Admin">admin only</option><option value="AdminBanker">admin &amp; banker only</option><option value="Banker">banker only</option></select> only) Adds [ammount] to everyone who is online.<li>/REMOVE [ammount] [name] - (<select data-perm="remove"><option value="Admin">admin only</option><option value="AdminBanker">admin &amp; banker only</option><option value="Banker">banker only</option></select> only) Removes [ammount] from [name]\'s account.<li>/BANKER [name] or /UNBANKER [name] - (<select data-perm="banker"><option value="Admin">admin only</option><option value="AdminBanker">admin &amp; banker only</option><option value="Banker">banker only</option></select> only) Adds or removes [name] to/from the banker list.</li></ul></div><div id="mb_biblio_banks_search"><p><input id="biblio_banks_input" disabled="1" placeholder="Loading..."/> or <a>view all bank accounts</a></p><div id="biblio_banks_user"></div></div><div id="mb_biblio_banks_messages"><h3>General</h3><label>Currency Name: </label><input id="biblio_banks_currency"/><label>Account Limit: </label><input id="biblio_banks_limit" type="number" max="100000000" min="0"/><h3>Responses - Commands</h3><label>/CHECK:</label><input data-msg-key="check"/><label>/TRANSFER:</label><input data-msg-key="transfer"/><label>/ADD:</label><input data-msg-key="add"/><label>/ADDONLINE:</label><input data-msg-key="online"/><label>/ADDDAILY - Added:</label><input data-msg-key="daily_yes"/><label>/ADDDAILY - Already added:</label><input data-msg-key="daily_no"/><label>/REMOVE:</label><input data-msg-key="remove"/><label>/BANKER - Added:</label><input data-msg-key="banker_yes"/><label>/BANKER - Already on list:</label><input data-msg-key="banker_on_list_already"/><label>/UNBANKER - Removed:</label><input data-msg-key="banker_no"/><label>/UNBANKER - Not a banker:</label><input data-msg-key="banker_not_on_list"/><h3>Responses - Errors</h3><label>Account does not exist:</label><input data-msg-key="error_no_account"/><label>Account limit reached:</label><input data-msg-key="error_limit_reached"/><label>Insufficient funds:</label><input data-msg-key="error_funds"/></div></div>';
	
	this.settingsTab.querySelector('nav').addEventListener('click', this.bot.changeTab, false);
	
	this.settingsTab.querySelector('a').addEventListener('click', this.showAll.bind(this));
	
	document.getElementById('biblio_banks_currency').value = this.currency;
	document.getElementById('biblio_banks_limit').value = this.limit;
	
	Object.keys(this.messages).forEach(function(message) {
		this.settingsTab.querySelector('#mb_biblio_banks_messages > input[data-msg-key="' + message +'"]').value = this.messages[message];
	}.bind(this));
	
	Object.keys(this.perms).forEach(function(key) {
		this.settingsTab.querySelector('select[data-perm="' + key + '"]').value = this.perms[key];
	}.bind(this));
	
	document.getElementById('mb_biblio_banks_messages').addEventListener('change', this.save.bind(this), false);
	document.getElementById('mb_biblio_banks_commands').addEventListener('change', this.save.bind(this), false);
	document.getElementById('biblio_banks_input').addEventListener('blur', this.accountInfo.bind(this));
	document.getElementById('biblio_banks_input').addEventListener('keyup', this.accountInfo.bind(this));
	
	this.lazyLoad();
}.bind(biblio_banks)());
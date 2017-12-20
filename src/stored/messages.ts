import { Storage } from '@bhmb/bot';

export interface Messages {
    check: string;
    transfer: string;
    add: string;
    online: string;
    daily_yes: string;
    daily_no: string;
    last_daily: string;
    remove: string;
    banker_yes: string;
    banker_on_list_already: string;
    banker_no: string;
    banker_not_on_list: string;
    error_no_account: string;
    error_limit_reached: string;
    error_funds: string;
}

export class MessageManager {
    private readonly id = 'messages';
    private readonly defaults = {
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

    constructor(private storage: Storage) {}

    getMessage(item: keyof Messages): string {
        return this.getMessages()[item];
    }

    setMessage(item: keyof Messages, message: string) {
        const messages = this.getMessages();
        messages[item] = message;

        this.storage.set(this.id, messages);
    }

    keys(): string[] {
        return Object.keys(this.defaults);
    }

    private getMessages(): Messages {
        return { ...this.defaults, ...this.storage.get(this.id, this.defaults) };
    }
}

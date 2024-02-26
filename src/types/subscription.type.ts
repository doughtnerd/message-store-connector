import EventEmitter from "node:events";
import promisePoller, { PromisePollerOptions } from "promise-poller";

enum Status {
    CLOSED,
    OPEN,
}

type SubscriptionListener = {
    subscription_opened: (message: string) => void;
    subscription_closed: (message: string, errors: Error[]) => void;
};

type SubscriptionOptions = {
    id: string;
    pollFn: () => Promise<void>;
    pollingInterval: number;
    retries: number;
    retryStrategy: PromisePollerOptions<unknown>['strategy'];
}

export class Subscription extends EventEmitter {
    private status: Status;

    constructor(private options: SubscriptionOptions) {
        super();
        this.status = Status.CLOSED;
    }

    public start(): void {
        if (this.status === Status.OPEN) {
            return;
        }

        this.status = Status.OPEN;
        this.emit('subscription_opened', `Subscription opened: ${this.options.id}`);
        const poller = promisePoller({
            taskFn: this.options.pollFn,
            interval: this.options.pollingInterval,
            name: this.options.id,
            retries: this.options.retries,
            strategy: this.options.retryStrategy,
            shouldContinue: (_rejectionReason: any, _resolvedValue: unknown) => {
              return this.status === Status.OPEN;
            },
        });
        poller.catch((e) => {
            this.status = Status.CLOSED;
            this.emit('subscription_closed', `Subscription closing: ${this.options.id}.`, e);
        });
    }

    public on(event: keyof SubscriptionListener, listener: SubscriptionListener[typeof event]): this {
        return super.on(event, listener);
    }

    public emit(event: keyof SubscriptionListener, ...args: Parameters<SubscriptionListener[typeof event]>): boolean {
        return super.emit(event, ...args);
    }

    public unsubscribe(): void {
        if (this.status === Status.OPEN) {
            this.status = Status.CLOSED;
        }
    }
};

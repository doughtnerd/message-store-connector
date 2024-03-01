import EventEmitter from "node:events";
import promisePoller from "promise-poller";

enum Status {
    CLOSED,
    OPEN,
    ERROR,
}

type SubscriptionListener = {
    subscription_opened: (message: string) => void;
    subscription_closed: (message: string) => void;
    subscription_error: (message: string, errors: Error[]) => void;
};

type SubscriptionOptions = {
    id: string;
    pollFn: () => Promise<void>;
    pollingInterval: number;
    retries: number;
    retryStrategy: 'fixed-interval' | 'linear-backoff' | 'exponential-backoff' | undefined;
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
        this.emit('subscription_opened', `Subscription ${this.options.id} opened.`);
        promisePoller({
            taskFn: this.options.pollFn,
            interval: this.options.pollingInterval,
            name: this.options.id,
            retries: this.options.retries,
            strategy: this.options.retryStrategy,
            shouldContinue: (_rejectionReason: any, _resolvedValue: unknown) => {
              return this.status === Status.OPEN;
            },
        }).then(() => {
            this.status = Status.CLOSED;
            this.emit('subscription_closed', `Subscription ${this.options.id} closed.`);
        }).catch((e) => {
            this.status = Status.ERROR;
            this.emit('subscription_error', `Subscription ${this.options.id} encountered errors:`, e);
        });
    }

    public once(event: keyof SubscriptionListener, listener: SubscriptionListener[typeof event]): this {
        return super.once(event, listener);
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

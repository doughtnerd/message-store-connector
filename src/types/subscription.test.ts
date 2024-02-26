import { Subscription } from "./subscription.type";

describe('Subscription', () => {
    beforeAll(() => {
        jest.useFakeTimers();
    });

    it('Should emit subscription_opened event when start is called', () => {
        const subscription = new Subscription({
            id: 'test',
            pollFn: () => Promise.resolve(),
            pollingInterval: 1000,
            retries: 1,
            retryStrategy: 'linear-backoff',
        });

        const listener = jest.fn();
        subscription.once('subscription_opened', listener);
        subscription.start();

        expect(listener).toHaveBeenCalledWith(expect.any(String));
    });

    it('Should emit subscription_closed event when the subscription is gracefully closed', async () => {
        const subscription = new Subscription({
            id: 'test',
            pollFn: () => Promise.resolve(),
            pollingInterval: 1000,
            retries: 1,
            retryStrategy: 'linear-backoff',
        });

        const listener = jest.fn();
        subscription.once('subscription_closed', listener);
        subscription.start();
        subscription.unsubscribe();

        await jest.advanceTimersByTimeAsync(1000);

        expect(listener).toHaveBeenCalledWith(expect.any(String));
    });

    it('Should emit subscription_error event when the subscription encounters errors', async () => {
        const error = new Error('test error');
        const subscription = new Subscription({
            id: 'test',
            pollFn: () => Promise.reject(error),
            pollingInterval: 1000,
            retries: 1,
            retryStrategy: 'linear-backoff',
        });

        const listener = jest.fn();
        subscription.on('subscription_error', listener);
        subscription.start();

        await jest.advanceTimersByTimeAsync(2000);

        expect(listener).toHaveBeenCalledWith(expect.any(String), [error]);
    });

    it('Should not be able to start a subscription that is already open', () => {
        const subscription = new Subscription({
            id: 'test',
            pollFn: () => Promise.resolve(),
            pollingInterval: 1000,
            retries: 1,
            retryStrategy: 'linear-backoff',
        });

        const listener = jest.fn();
        subscription.on('subscription_opened', listener);
        subscription.start();
        subscription.start();

        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('Should not be able to close a subscription that is already closed', async () => {
        const subscription = new Subscription({
            id: 'test',
            pollFn: () => Promise.resolve(),
            pollingInterval: 1000,
            retries: 1,
            retryStrategy: 'linear-backoff',
        });

        const listener = jest.fn();
        subscription.on('subscription_closed', listener);
        subscription.start();
        subscription.unsubscribe();

        await jest.advanceTimersByTimeAsync(1000);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('Should be able to retry', async () => {
        const error = new Error('test error');
        const fn = jest.fn().mockRejectedValue(error);
        const subscription = new Subscription({
            id: 'test',
            pollFn: fn,
            pollingInterval: 1000,
            retries: 2,
            retryStrategy: 'linear-backoff',
        });

        const listener = jest.fn();
        subscription.on('subscription_error', listener);
        subscription.start();

        await jest.advanceTimersByTimeAsync(3000);

        expect(listener).toHaveBeenCalledWith(expect.any(String), [error, error]);
    });
});

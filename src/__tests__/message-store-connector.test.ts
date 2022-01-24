import { v4 as uuid } from "uuid";
import { MessageStoreConfig } from "../types/message-store-config.type";
import { MessageStore } from "../types/message-store.type";
import { Message } from "../types/message.type";
import { NoopLogger } from "../noop-logger";
import { connect } from "../message-store/connect";

const wait = (forMillis: number) =>
  new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      clearTimeout(timeout);
      resolve();
    }, forMillis);
  });

describe("Message Store Connector", () => {
  const messageStoreConfig: MessageStoreConfig = {
    messageStoreHost: process.env.MESSAGE_STORE_HOST as string,
    messageStorePassword: process.env.MESSAGE_STORE_PASSWORD as string,
    logger: NoopLogger,
  };
  let messageStore: MessageStore;

  beforeAll(async () => {
    messageStore = await connect(messageStoreConfig);
  });

  test("Can write a message and retrieve the last one written to a stream", async () => {
    const streamId = uuid();
    const messageId = uuid();
    await messageStore.writeMessage(`testStream-${streamId}`, {
      id: messageId,
      type: "TestEvent",
      data: {},
      metadata: {},
    });
    const message = await messageStore.getLastStreamMessage(`testStream-${streamId}`);

    expect(message[0].id).toEqual(messageId);
  });

  test("Can write several message and retrieve them", async () => {
    const streamId = uuid();
    await messageStore.writeMessage(`testStream-${streamId}`, {
      id: uuid(),
      type: "TestEvent",
      data: {},
      metadata: {},
    });
    await messageStore.writeMessage(`testStream-${streamId}`, {
      id: uuid(),
      type: "TestEvent",
      data: {},
      metadata: {},
    });
    const messages = await messageStore.getStreamMessages(`testStream-${streamId}`);

    expect(messages.length).toEqual(2);
  });

  test("Calls the correct handler for a message type in a subscription", (done) => {
    const streamId = uuid();
    const messageId = uuid();
    messageStore
      .writeMessage(`testStream-${streamId}`, {
        id: messageId,
        type: "TestEvent",
        data: {},
        metadata: {},
      })
      .then(() => {
        return messageStore.subscribeToStream(
          uuid(),
          `testStream-${streamId}`,
          {
            TestEvent: (message: Message, context: any) => {
              expect(message.id).toEqual(messageId);
              done();
              return Promise.resolve(true);
            },
          },
          { pollingInterval: 500 }
        );
      })
  });

  test("Calls the correct handler for a message type in a category subscription", (done) => {
    const streamId = uuid();
    const messageId = uuid();
    const uniqueCategory = uuid().replace('/\-/g', '')

      messageStore
      .writeMessage(`${uniqueCategory}:command-${streamId}`, {
        id: messageId,
        type: "TestEvent",
        data: {},
        metadata: {},
      })
      .then(() => {
        messageStore.subscribeToCategory(
          uuid(),
          `${uniqueCategory}:command`,
          {
            TestEvent: (message: Message, context: any) => {
              expect(message.id).toEqual(messageId);
              done();
              return Promise.resolve(true);
            },
          },
          { pollingInterval: 500 }
        );
      });
  });

  test("Can have subscriptions to multiple streams at a time", async () => {
    const streamOneId = uuid();
    const streamOne = `testStream-${streamOneId}`;

    const streamTwoId = uuid();
    const streamTwo = `testStream-${streamTwoId}`;
    const fakeFunc = jest.fn();

    await messageStore.writeMessage(streamOne, {
      id: uuid(),
      type: "TestEvent",
      data: {},
      metadata: {},
    });

    await messageStore.writeMessage(streamTwo, {
      id: uuid(),
      type: "TestEvent",
      data: {},
      metadata: {},
    });

    messageStore.subscribeToStream(
      uuid(),
      streamOne,
      {
        TestEvent: (message: Message, context: any) => {
          fakeFunc();
          return Promise.resolve(true);
        },
      },
      { pollingInterval: 500 }
    );

    messageStore.subscribeToStream(
      uuid(),
      streamTwo,
      {
        TestEvent: (message: Message, context: any) => {
          fakeFunc();
          return Promise.resolve(true);
        },
      },
      { pollingInterval: 500 }
    );

    await messageStore.writeMessage(streamTwo, {
      id: uuid(),
      type: "TestEvent",
      data: {},
      metadata: {},
    });

    await wait(3000);

    expect(fakeFunc).toHaveBeenCalledTimes(3);
  });

  test("Can unsubscribe from unsubscribe handler returned from the subscribe func", async () => {
    const streamId = uuid();
    const mockFunc = jest.fn();

    const { unsubscribe } = await messageStore.subscribeToStream(
      uuid(),
      `testStream-${streamId}`,
      {
        TestEvent: (message: Message, context: any) => {
          mockFunc();
          return Promise.resolve(true);
        },
      },
      { pollingInterval: 100 }
    );

    await messageStore.writeMessage(`testStream-${streamId}`, {
      id: uuid(),
      type: "TestEvent",
      data: {},
      metadata: {},
    });

    await wait(300);
    unsubscribe();
    await wait(300);

    await messageStore.writeMessage(`testStream-${streamId}`, {
      id: uuid(),
      type: "TestEvent",
      data: {},
      metadata: {},
    });

    await wait(1000);

    expect(mockFunc).toHaveBeenCalledTimes(1);
  });

  test("Can unsubscribe from unsubscribe handler returned from the category subscribe func", async () => {
    const streamId = uuid();
    const mockFunc = jest.fn();
    const uniqueCategory = uuid().replace(/\-/g, '');

    const { unsubscribe } = await messageStore.subscribeToCategory(
      uuid(),
      `${uniqueCategory}:command`,
      {
        TestEvent: (message: Message, context: any) => {
          mockFunc();
          return Promise.resolve(true);
        },
      },
      { pollingInterval: 100 }
    );

    await messageStore.writeMessage(`${uniqueCategory}:command-${streamId}`, {
      id: uuid(),
      type: "TestEvent",
      data: {},
      metadata: {},
    });

    await wait(500);
    unsubscribe();
    await wait(300);

    await messageStore.writeMessage(`${uniqueCategory}-${streamId}`, {
      id: uuid(),
      type: "TestEvent",
      data: {},
      metadata: {},
    });

    await wait(1000);

    expect(mockFunc).toHaveBeenCalledTimes(1);
  });

  test("Can unsubscribe and resubscribe and load the correct stream position", async () => {
    const streamId = uuid();
    const mockFunc = jest.fn();
    const mockFunc2 = jest.fn();
    const subscriberId = uuid();

    const { unsubscribe } = await messageStore.subscribeToStream(
      subscriberId,
      `testStream-${streamId}`,
      {
        TestEvent: (message: Message, context: any) => {
          mockFunc();
          return Promise.resolve(true);
        },
      },
      { pollingInterval: 100 }
    );

    await messageStore.writeMessage(`testStream-${streamId}`, {
      id: uuid(),
      type: "TestEvent",
      data: {},
      metadata: {},
    });

    await wait(300);
    unsubscribe();
    await wait(300);

    await messageStore.subscribeToStream(
      subscriberId,
      `testStream-${streamId}`,
      {
        TestEvent: (message: Message, context: any) => {
          mockFunc2();
          return Promise.resolve(true);
        },
      },
      { pollingInterval: 100 }
    );

    await wait(1000);

    expect(mockFunc).toHaveBeenCalledTimes(1);
    expect(mockFunc2).toHaveBeenCalledTimes(0);
  });

  test("Projection can be ran against a stream with one message in it", async () => {
    const streamId = uuid();
    const messageId = uuid();
    await messageStore.writeMessage(`testStream-${streamId}`, {
      id: messageId,
      type: "TestEvent",
      data: {},
      metadata: {},
    });

    const testEntity = await messageStore.project(`testStream-${streamId}`, {
      entity: { timestamps: [] },
      projectionName: "Test Projection",
      handlers: {
        TestEvent: (entity: any, message: any) => {
          entity.timestamps.push(message.time);
          return entity;
        },
      },
    });

    expect(testEntity.timestamps.length).toEqual(1);
  });

  test("Projection gracefully continues if there's no matching handler for an event", async () => {
    const streamId = uuid();
    const messageId = uuid();
    await messageStore.writeMessage(`testStream-${streamId}`, {
      id: messageId,
      type: "TestEvent",
      data: {},
      metadata: {},
    });

    const testEntity = await messageStore.project(`testStream-${streamId}`, {
      entity: { timestamps: [] },
      projectionName: "Test Projection",
      handlers: {
        NonMatchingHandler: (entity: any, message: any) => {
          fail();
        },
      },
    });

    expect(testEntity.timestamps.length).toEqual(0);
  });

  test("Projection can be ran against a stream with multiple messages in it", async () => {
    const streamId = uuid();
    await messageStore.writeMessage(`testStream-${streamId}`, {
      id: uuid(),
      type: "TestEvent",
      data: {},
      metadata: {},
    });
    await messageStore.writeMessage(`testStream-${streamId}`, {
      id: uuid(),
      type: "TestEvent",
      data: {},
      metadata: {},
    });

    const testEntity = await messageStore.project(`testStream-${streamId}`, {
      entity: { timestamps: [] },
      projectionName: "Test Projection",
      handlers: {
        TestEvent: (entity: any, message: any) => {
          entity.timestamps.push(message.time);
          return entity;
        },
      },
    });

    expect(testEntity.timestamps.length).toEqual(2);
  });

  test("Projection can be ran against a stream with no message in it", async () => {
    const streamId = uuid();

    const testEntity = await messageStore.project(`testStream-${streamId}`, {
      entity: { timestamps: [] },
      projectionName: "Test Projection",
      handlers: {
        TestEvent: (entity: any, message: any) => {
          entity.timestamps.push(message.time);
          return entity;
        },
      },
    });

    expect(testEntity.timestamps.length).toEqual(0);
  });

  test("Projection can be ran against a stream with multiple messages in it beyond the batch size", async () => {
    const streamId = uuid();
    await messageStore.writeMessage(`testStream-${streamId}`, {
      id: uuid(),
      type: "TestEvent",
      data: {},
      metadata: {},
    });
    await messageStore.writeMessage(`testStream-${streamId}`, {
      id: uuid(),
      type: "TestEvent",
      data: {},
      metadata: {},
    });

    const testEntity = await messageStore.project(
      `testStream-${streamId}`,
      {
        entity: { timestamps: [] },
        projectionName: "Test Projection",
        handlers: {
          TestEvent: (entity: any, message: any) => {
            entity.timestamps.push(message.time);
            return entity;
          },
        },
      },
      { batchSize: 1 }
    );

    expect(testEntity.timestamps.length).toEqual(2);
  });

  test("Can write messages of the same category but different streams and retrieve them", async () => {
    const uniqueCategory = `uniqueCategory${uuid().replace(/-/g, "")}`;
    await messageStore.writeMessage(`${uniqueCategory}-${uuid()}`, {
      id: uuid(),
      type: "TestEvent",
      data: {},
      metadata: {},
    });

    const secondMessageStream = `${uniqueCategory}-${uuid()}`;
    await messageStore.writeMessage(secondMessageStream, {
      id: uuid(),
      type: "TestEvent",
      data: {},
      metadata: {},
    });

    let messages = await messageStore.getCategoryMessages(uniqueCategory);

    expect(messages.length).toEqual(2);

    const lastMessage = await messageStore.getLastStreamMessage(secondMessageStream);
    messages = await messageStore.getCategoryMessages(uniqueCategory, {
      startingPosition: lastMessage[0].globalPosition,
    });

    expect(messages.length).toEqual(1);
  });

  afterAll(async () => {
    await messageStore.disconnect();
  });
});

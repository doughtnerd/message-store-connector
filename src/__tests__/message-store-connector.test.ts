import { v4 as uuid } from "uuid";
import { MessageStoreConfig } from "../types/message-store-config.type";
import { MessageStore } from "../types/message-store.type";
import { Message } from "../types/message.type";
import { NoopLogger } from "../noop-logger";
import { connect } from "../message-store/connect";

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
        messageStore.subscribeToStream(
          "abc",
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
      });
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

  afterAll(async () => {
    await messageStore.disconnect();
  });
});

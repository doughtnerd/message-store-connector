import { Client } from 'pg';
import { v4 as uuid } from "uuid";
import { EventideClient, PostgresClient } from '../message-db-client';
import { MessageStore } from '../message-store/message-store';
import { NoopLogger } from "../noop-logger";
import { Projection } from "../types";
import { IMessageStore } from "../types/message-store.interface";
import { Message } from "../types/message.type";

const wait = (forMillis: number) =>
  new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      clearTimeout(timeout);
      resolve();
    }, forMillis);
  });

describe("Message Store Connector", () => {
  let pgClient: Client;
  let messageStore: IMessageStore;

  beforeAll(async () => {
    pgClient = new Client({
      connectionString: process.env.MESSAGE_STORE_URI
    });

    await pgClient.connect().catch(console.error);

    const sqlClient = new PostgresClient(pgClient);
    const messageDBClient = new EventideClient(sqlClient);
    messageStore = new MessageStore(messageDBClient, NoopLogger);
  });

  afterAll(async () => {
    await pgClient.end();
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
              return Promise.resolve();
            },
          },
          { pollingInterval: 500 }
        );
      })
  });

  test("Calls the correct handler for a message type in a category subscription", async () => {
    const streamId = uuid();
    const messageId = uuid();
    const uniqueCategory = uuid().replace(/\-/g, '')
    const fakeFunc = jest.fn()

    await messageStore.writeMessage(`testCategorySub${uniqueCategory}:command-${streamId}`, {
      id: messageId,
      type: "TestEvent",
      data: {},
      metadata: {},
    })

    messageStore.subscribeToCategory(
      uuid(),
      `testCategorySub${uniqueCategory}:command`,
      {
        TestEvent: (message: Message, context: any) => {
          expect(message.id).toEqual(messageId);
          fakeFunc()
          return Promise.resolve();
        },
      },
      { pollingInterval: 500 }
    );

    await wait(1000)

    expect(fakeFunc).toHaveBeenCalled()
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
          return Promise.resolve();
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
          return Promise.resolve();
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
          return Promise.resolve();
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
          return Promise.resolve();
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

    await wait(300);
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
          return Promise.resolve();
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
          return Promise.resolve();
        },
      },
      { pollingInterval: 100 }
    );

    await wait(1000);

    expect(mockFunc).toHaveBeenCalledTimes(1);
    expect(mockFunc2).toHaveBeenCalledTimes(0);
  });

  test("Projection can be ran against category", async () => {
    const uniqueCategory = `uniqueCategory${uuid().replace(/-/g, "")}`;
    const streamId = uuid();
    const streamId2 = uuid();
    const messageId = uuid();
    const messageId2 = uuid();
    
    await messageStore.writeMessage(`${uniqueCategory}-${streamId}`, {
      id: messageId,
      type: "TestEvent",
      data: {},
      metadata: {},
    });

    await messageStore.writeMessage(`${uniqueCategory}-${streamId2}`, {
      id: messageId2,
      type: "TestEvent",
      data: {},
      metadata: {},
    });

    type TestEntityType = {
      timestamps: []
    }

    const testProjection: Projection<TestEntityType, Message> = {
      entity: { timestamps: [] },
      projectionName: "Test Projection",
      handlers: {
        TestEvent: (entity: any, message: any) => {
          entity.timestamps.push(message.time);
          return entity;
        },
      },
    }

    const testEntity = await messageStore.projectCategory<TestEntityType, Message>(uniqueCategory, testProjection);

    expect(testEntity.timestamps.length).toEqual(2);
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

    type TestEntityType = {
      timestamps: []
    }

    const testProjection: Projection<TestEntityType, Message> = {
      entity: { timestamps: [] },
      projectionName: "Test Projection",
      handlers: {
        TestEvent: (entity: any, message: any) => {
          entity.timestamps.push(message.time);
          return entity;
        },
      },
    }

    const testEntity = await messageStore.project<TestEntityType, Message>(`testStream-${streamId}`, testProjection);

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

    type TestEntityType = {
      timestamps: []
    }

    const testProjection: Projection<TestEntityType, Message> = {
      entity: { timestamps: [] },
      projectionName: "Test Projection",
      handlers: {},
    }

    const testEntity = await messageStore.project<TestEntityType, Message>(`testStream-${streamId}`, testProjection);

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

    type TestEntityType = {
      timestamps: []
    };

    const testProjection: Projection<TestEntityType, Message> = {
      entity: { timestamps: [] },
      projectionName: "Test Projection",
      handlers: {
        TestEvent: (entity: any, message: any) => {
          entity.timestamps.push(message.time);
          return entity;
        },
      },
    }

    const testEntity = await messageStore.project<TestEntityType, Message>(`testStream-${streamId}`, testProjection);

    expect(testEntity.timestamps.length).toEqual(2);
  });

  test("Projection can be ran against a stream with no message in it", async () => {
    const streamId = uuid();

    type TestEntityType = {
      timestamps: []
    }

    type EventTypes = 'TestEvent'

    const testProjection: Projection<TestEntityType, Message> = {
      entity: { timestamps: [] },
      projectionName: "Test Projection",
      handlers: {
        TestEvent: (entity: any, message: any) => {
          entity.timestamps.push(message.time);
          return entity;
        },
      },
    }

    const testEntity = await messageStore.project<TestEntityType, Message>(`testStream-${streamId}`, testProjection);

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

    type TestEntityType = {
      timestamps: []
    }

    const testProjection: Projection<TestEntityType, Message> = {
      entity: { timestamps: [] },
      projectionName: "Test Projection",
      handlers: {
        TestEvent: (entity: any, message: any) => {
          entity.timestamps.push(message.time);
          return entity;
        },
      },
    }

    const testEntity = await messageStore.project<TestEntityType, Message>(
      `testStream-${streamId}`,
      testProjection,
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

  test("Can write a batch of messages", async () => {
    const uniqueCategory = `uniqueCategory${uuid().replace(/-/g, "")}`;
    const streamName = `${uniqueCategory}-${uuid()}`;
    const results = await messageStore.writeBatch([
      {
        streamName,
        message: {
          id: uuid(),
          type: "TestEvent",
          data: {},
          metadata: {},
        }
      },
      {
        streamName,
        message: {
          id: uuid(),
          type: "TestEvent",
          data: {},
          metadata: {},
        }
      }
    ]);

    expect(results).toEqual([{ streamPosition: "0" }, { streamPosition: "1" }]);
  });
});

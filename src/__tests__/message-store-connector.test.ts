import { v4 as uuid } from "uuid";
import { connect } from "../message-db-client";
import { MessageStoreConfig } from "../types/message-store-config.type";
import { MessageStore } from "../types/message-store.type";
import { Message } from "../types/message.type";

describe("Message Store Connector", () => {
  const messageStoreConfig: MessageStoreConfig = {
    messageStoreHost: "message_store",
    messageStorePassword: "password",
    logger: console,
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
    const message = await messageStore.getLastStreamMessage(
      `testStream-${streamId}`
    );

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

  afterAll(async () => {
    await messageStore.disconnect();
  });
});

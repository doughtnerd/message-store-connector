// import { Client } from "pg";
// import { v4 as uuid } from "uuid";
// import { connect } from "./message-db-client";
// import { EntityProjection } from "./types/entity-projection.type";
// import { MessageStoreConfig } from "./types/message-store-config.type";
// import { MessageStore } from "./types/message-store.type";
// import { Message } from "./types/message.type";

export * from "./message-db-client";

// const messageStoreConfig: MessageStoreConfig = {
//   messageStoreHost: "localhost",
//   messageStorePassword: "password",
//   logger: console,
// };

// async function run() {
//   const store: MessageStore = await connect(messageStoreConfig);

//   await store.subscribeToStream(
//     "asdf123",
//     "someStream-7e22dad9-15d4-4655-b080-8bc7722ed8ac",
//     {
//       SomeEvent: (message: Message, { messageStore, logger }) => {
//         logger.log("Got a message", message, messageStore);
//         return Promise.resolve(true);
//       },
//     },
//     { pollingInterval: 1000 }
//   );

//   const entity = await store.project(
//     "someStream-7e22dad9-15d4-4655-b080-8bc7722ed8ac",
//     {
//       entity: { timestamps: [] },
//       projectionName: "Test Projection",
//       handlers: {
//         SomeEvent: (entity: { timestamps: Date[] }, message: Message) => {
//           entity.timestamps.push(message.time);
//           return entity;
//         },
//       },
//     } as EntityProjection<{ timestamps: Date[] }>
//   );
// }

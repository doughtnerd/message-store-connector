import { Logger } from "../types/logger.type";
import { Message } from "../types/message.type";
import { v4 as uuid } from "uuid";
import {IMessageDBClient} from "./message-db-client.interface";

const SUBSCRIBER_POSITION_STREAM_CATEGORY = "streamSubscriber";

type PositionAdvancedMessage = Message<{ streamPosition: number }, 'PositionAdvanced'>;

export async function loadStreamSubscriberPosition(
  client: IMessageDBClient,
  subscriberId: string,
  logger: Logger,
  defaultPosition: number = 0
): Promise<number> {
  const subscriptionPositionStream = `${SUBSCRIBER_POSITION_STREAM_CATEGORY}-${subscriberId}`;
  const [lastMessage] = (await client.getLastStreamMessage(subscriptionPositionStream)) as Message<{ streamPosition: number }>[];

  if (lastMessage) {
    const position = lastMessage.data.streamPosition;
    logger.log(`Successfully loaded position: ${position} for subscriber: ${subscriberId}`);
    return position;
  } else {
    logger.log(`Failed to load position for subscriber: ${subscriberId}, using default: ${defaultPosition}`);
    return defaultPosition;
  }
}

export async function saveStreamSubscriberPosition(client: IMessageDBClient, subscriberId: string, newPosition: number, logger: Logger) {
  await client.writeMessage<PositionAdvancedMessage>(`${SUBSCRIBER_POSITION_STREAM_CATEGORY}-${subscriberId}`, {
    id: uuid(),
    type: "PositionAdvanced",
    data: {
      streamPosition: newPosition,
    },
    metadata: {}
  });
}

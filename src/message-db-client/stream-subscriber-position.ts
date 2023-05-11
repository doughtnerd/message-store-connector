import { Logger } from "../types/logger.type";
import { Message } from "../types/message.type";
import { v4 as uuid } from "uuid";
import {IMessageDBClient} from "./message-db-client.interface";

type PositionAdvancedMessage = Message<{ streamPosition: number }, 'PositionAdvanced'>;

export async function loadStreamSubscriberPosition(
  client: IMessageDBClient,
  category: string,
  subscriberId: string,
  logger: Logger,
  defaultPosition: number = 0
): Promise<number> {
  const subscriptionPositionStream = `${category}+position-${subscriberId}`;
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

export async function saveStreamSubscriberPosition(
  client: IMessageDBClient,
  category: string,
  subscriberId: string,
  newPosition: number,
  logger: Logger
) {
  await client.writeMessage<PositionAdvancedMessage>(`${category}+position-${subscriberId}`, {
    id: uuid(),
    type: "PositionAdvanced",
    data: {
      streamPosition: newPosition,
    },
    metadata: {}
  });
}

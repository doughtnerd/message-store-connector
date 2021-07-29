import { Client } from "pg";
import { Logger } from "../types/logger.type";
import { Message } from "../types/message.type";
import { getLastStreamMessage } from "./get-last-stream-message";
import { writeMessage } from "./write-message";
import { v4 as uuid } from "uuid";

const SUBSCRIBER_POSITION_STREAM_CATEGORY = "streamSubscriber";

export async function loadStreamSubscriberPosition(
  client: Client,
  subscriberId: string,
  logger: Logger,
  defaultPosition: number = 0
): Promise<number> {
  const subscriptionPositionStream = `${SUBSCRIBER_POSITION_STREAM_CATEGORY}-${subscriberId}`;
  const [lastMessage] = (await getLastStreamMessage(client, subscriptionPositionStream)) as Message<{ streamPosition: number }>[];

  if (lastMessage) {
    const position = lastMessage.data.streamPosition;
    logger.log(`Successfully loaded position: ${position} for subscriber: ${subscriberId}`);
    return position;
  } else {
    logger.log(`Failed to load position for subscriber: ${subscriberId}, using default: ${defaultPosition}`);
    return defaultPosition;
  }
}

export async function saveStreamSubscriberPosition(client: Client, subscriberId: string, newPosition: number, logger: Logger) {
  await writeMessage<{ streamPosition: number }, "PositionAdvanced">(client, `${SUBSCRIBER_POSITION_STREAM_CATEGORY}-${subscriberId}`, {
    id: uuid(),
    type: "PositionAdvanced",
    data: {
      streamPosition: newPosition,
    },
    metadata: {},
  });
}

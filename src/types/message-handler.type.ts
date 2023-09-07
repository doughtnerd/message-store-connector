import { IMessageStore } from "./message-store.interface";
import { Message } from "./message.type";

/** 
* Context passed to a message handler.
* Used to access the message store or logger.
*/
export type MessageHandlerContext = {
  logger: any;
  messageStore: IMessageStore;
};

/**
* A function that handles a particular message.
* Called by the message dispatcher when a message is received during a subscription.
*
* @param message The message being handled.
* @param context The context of the message handler.
* @returns A promise that resolves when the message has been handled.
*
* @example
* const addItemHandler: MessageHandlerFunc = async (message, context) => {
*    // Validate the message body.
*    if (!message.data.item) {
*    return;
*
*    // Calculate current state
*    const currentState = await messageStore.project<ShoppingCart>('cart-123', shoppingCartProjection);
*
*    // Handle the message
*    try {
*       const { item } = message.data;
*       currentState.addItem(item);
*       await context.messageStore.writeMessage('cart-123', {
*           id: uuid(),
*           type: 'ItemAddedToCart',
*           data: { item },
*           metadata: message.metadata,
*        });
*    } catch (error) {
*       await context.messageStore.writeMessage('cart-123', {
*           id: uuid(),
*           type: 'AddItemFailed',
*           data: { error },
*           metadata: message.metadata,
*       });
*    }
* }
*/
export type MessageHandlerFunc<
  T extends Message = Message
> = (message: T, context: MessageHandlerContext) => Promise<void>;

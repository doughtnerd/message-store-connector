import {GetCategoryMessagesOptions, GetStreamMessagesOptions, MessageBatchConfig} from "../message-db-client";
import {Projection} from "./entity-projection.type";
import {Logger} from "./logger.type";
import {MessageHandlerFunc} from "./message-handler.type";
import {IMessageStore, MessageHandlers, ProjectCategoryOptions, ProjectOptions, SubscribeToCategoryOptions, SubscribeToStreamOptions} from "./message-store.interface";
import {Message, MinimalWritableMessage} from "./message.type";
import { Serializeable, SerializeableRecord } from "./serializeable.type";
import { TypePredicate } from "./type-predicate.type";

type DataFieldContract<T extends Serializeable = Serializeable> = {
  type: T;
  description: string;
  example: T;
};

export type MessageContract<T extends SerializeableRecord = SerializeableRecord> = {
  data: {
    [Property in keyof T]: DataFieldContract<T[Property]>;
  };
  description: string;
};

type MessageContracts = Record<string, MessageContract>;

export type Contract<
  Component extends string = string,
  Category extends string = string,
  AggregateRootType = unknown,
  CommandTypes extends MessageContracts = MessageContracts,
  EventTypes extends MessageContracts = MessageContracts> = {
  componentName: Component;
  aggregateRoot: AggregateRootType;
  streamCategoryName: Category;
  commands: CommandTypes;
  events: EventTypes
};

export type ContractCommandValidator<T extends Contract> = {
  [Property in CommandNames<T>]: TypePredicate<MessageContractDataType<T['commands'][Property]>>;
}

export type MessageContractDataType<T extends MessageContract> = {
  [Property in keyof T['data']]: T['data'][Property]['type']
}

export type ContractEventData<T extends Contract, Name extends EventNames<T> = never> = Name extends never ? {
  [Property in EventNames<T>]:  MessageContractDataType<T['events'][Property]>
} : MessageContractDataType<T['events'][Name]>;

export type ContractCommandData<T extends Contract, Name extends CommandNames<T> = never> = Name extends never ? {
  [Property in EventNames<T>]: MessageContractDataType<T['commands'][Property]>
} : MessageContractDataType<T['commands'][Name]>;

export type EventNames<T extends Contract> = Extract<keyof T['events'], string>;
export type CommandNames<T extends Contract> = Extract<keyof T['commands'], string>;
export type MessageNames<T extends Contract> = EventNames<T> | CommandNames<T>;

export type ExtractEvent<T extends Contract, Name extends EventNames<T>> =
  Message<MessageContractDataType<T['events'][Name]>, Name>;

export type ExtractCommand<T extends Contract, Name extends CommandNames<T>> =
  Message<MessageContractDataType<T['commands'][Name]>, Name>;

export type ExtractMessage<T extends Contract, Name extends MessageNames<T>> =
  Name extends EventNames<T> ? ExtractEvent<T, Name> :
  ExtractCommand<T, Name>;

export type ContractEvents<T extends Contract = Contract> = {
  [Property in EventNames<T>]: Message<MessageContractDataType<T['events'][Property]>, Property>
};

export type ContractCommands<T extends Contract = Contract> = {
  [Property in CommandNames<T>]: Message<MessageContractDataType<T['commands'][Property]>, Property>
};

export type ContractMessages<T extends Contract = Contract> = {
  [Property in MessageNames<T>]:
     ExtractMessage<T, Extract<Property, string>>
};

export type ContractMessage<T extends Contract, Name extends MessageNames<T>> = ContractMessages<T>[Name]

export type ContractMessageUnion<T extends Contract> = {
  [P in MessageNames<T>]: ContractMessages<T>[P]
}[MessageNames<T>];

type data =  ContractMessageUnion<AccountContract>;

export type ContractEventsUnion<T extends Contract> = {
  [P in keyof ContractEvents<T>]: ContractEvents<T>[P]
}[EventNames<T>];

type ProjectionWithContract<C extends Contract> =
  Projection<C['aggregateRoot'], ContractEventsUnion<C>>

type MessageHandlerFuncWithContract<C extends Contract> =
  (
    message: ContractMessageUnion<C>,
    context: { messageStore: WithContract<C, IMessageStore>, logger: Logger }
  ) => Promise<boolean>;

type MessageHandlersWithContract<C extends Contract> =
  Record<keyof C['commands'], MessageHandlerFuncWithContract<C>> |
  Record<keyof C['events'], MessageHandlerFuncWithContract<C>>;

type MessageBatchConfigWithContract<C extends Contract> = {
  streamName: StreamName<C['streamCategoryName']>;
  message: ContractMessageUnion<C>;
  expectedVersion?: number;
};

export type StreamName<Category extends string = string> = `${Category}${string}`;

interface IMessageStoreWithContract<C extends Contract> {
  project(
    streamName: StreamName<C['streamCategoryName']> | string,
    entityProjection: WithContract<C, Projection>,
    options?: ProjectOptions
  ): Promise<C['aggregateRoot']>;

  projectCategory(
    categoryName: StreamName<C['streamCategoryName']> | string,
    entityProjection: WithContract<C, Projection>,
    options?: ProjectCategoryOptions
  ): Promise<C['aggregateRoot']>;

  subscribeToCategory(
    subscriberId: string,
    streamName: StreamName<C['streamCategoryName']> | string,
    handlers: WithContract<C, MessageHandlers>,
    options?: SubscribeToCategoryOptions
  ): Promise<{ unsubscribe: () => void }>;

  subscribeToStream(
    subscriberId: string,
    streamName: StreamName<C['streamCategoryName']> | string,
    handlers: WithContract<C, MessageHandlers>,
    options?: SubscribeToStreamOptions
  ): Promise<{ unsubscribe: () => void }>;

  getCategoryMessages(
    categoryName: StreamName<C['streamCategoryName']> | string,
    options?: GetCategoryMessagesOptions
  ): Promise<ContractMessageUnion<C>[]>;

  getLastStreamMessage(streamName: string): Promise<ContractMessageUnion<C>[]>;

  getStreamMessages(
    streamName: StreamName<C['streamCategoryName']> | string,
    options?: GetStreamMessagesOptions
  ): Promise<ContractMessageUnion<C>[]>;

  getStreamVersion(streamName: string): Promise<{ streamVersion: number | null }>;

  writeMessage(
    streamName: StreamName<C['streamCategoryName']> | string,
    message: MinimalWritableMessage<ContractMessageUnion<C>> | ContractMessageUnion<C>,
    expectedVersion?: number
  ): Promise<{ streamPosition: string }>;

  writeBatch(messageBatch: Array<WithContract<C, MessageBatchConfig>>): Promise<Array<{ streamPosition: string }>>;
}

export type WithContract<
  T extends Contract,
  K extends IMessageStore |
    Projection |
    MessageHandlerFunc |
    MessageHandlers |
    MessageBatchConfig |
    IMessageStore = never
  > =
    K extends Projection ? ProjectionWithContract<T> :
    K extends MessageHandlerFunc ? MessageHandlerFuncWithContract<T> :
    K extends MessageHandlers ? MessageHandlersWithContract<T> :
    K extends MessageBatchConfig ? MessageBatchConfigWithContract<T> :
    K extends IMessageStore ? IMessageStoreWithContract<T> :
    unknown;


type AccountAggregate = { balance: number };

type WithdrawContract = MessageContract<{ amount: number }>;

type WithdrawnContract = MessageContract<{ amount: number }>;

type AccountContract = Contract<
  'Account',
  'account',
  AccountAggregate,
  {
    Withdraw: WithdrawContract
  },
  {
    Withdrawn: WithdrawnContract,
    Deposited: MessageContract<{ dAmount: number }>
  }
>;

type MyMessages = ContractMessages<AccountContract>;

const projection: WithContract<AccountContract, Projection> = {
  projectionName: 'Projection',
  entity: { balance: 0 },
  handlers: {
    Withdrawn: (entity, event) => {
      entity.balance -= event.data.amount;
      return entity;
    },
  }
};


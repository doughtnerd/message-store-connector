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
}

export type ContractCommandValidator<T extends Contract> = {
  [Property in keyof T['commands']]: TypePredicate<MessageContractDataType<T['commands'][Property]>>;
}

export type MessageContractDataType<T extends MessageContract> = {
  [Property in keyof T['data']]: T['data'][Property]['type']
}

export type ContractEventData<T extends Contract, Name extends keyof T['events'] = never> = Name extends never ? {
  [Property in keyof T['events']]:  MessageContractDataType<T['events'][Property]>
} : MessageContractDataType<T['events'][Name]>

export type MessageContractAsMessage<T extends MessageContract, Type extends string = string> = Message<MessageContractDataType<T>, Type>;

export type MessageNames<T extends Contract> = Extract<keyof T['events'] | keyof T['commands'], string>;

export type ExtractMessage<T extends Contract, Name extends MessageNames<T>> =
  T['commands'][Name] extends undefined ?
  T['events'][Name] extends undefined ? unknown : MessageContractAsMessage<T['events'][Name], Name> :
  MessageContractAsMessage<T['commands'][Name], Name>;


export type ContractMessages<T extends Contract = Contract> = {
  [Property in keyof (T['commands'] & T['events']) as Extract<Property, string>]:
    T['commands'][Property] extends undefined ?
      MessageContractAsMessage<T['events'][Property], Extract<Property, string>> :
      MessageContractAsMessage<T['commands'][Property], Extract<Property, string>>
};

export type ContractMessage<T extends Contract, Name extends keyof (T['events'] & T['commands'])> = ContractMessages<T>[Extract<Name, string>]

export type ContractMessageUnion<T extends Contract> = {[P in keyof ContractMessages<T>]: ContractMessages<T>[P]}[keyof ContractMessages<T>];

type ProjectionWithContract<C extends Contract> = Projection<C['aggregateRoot'], ContractMessageUnion<C>>

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
    Withdrawn: WithdrawnContract
  }
>

type Test = WithContract<AccountContract,Projection>;

type Test2 = ExtractMessage<AccountContract, 'Withdrawn'>;

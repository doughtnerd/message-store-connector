import {Message} from "./message.type";
import { Serializeable, SerializeableRecord } from "./serializeable.type";
import { TypePredicate } from "./type-predicate.type";

type DataFieldContract<T extends Serializeable = Serializeable> = {
  type: T;
  description: string;
  example: T;
};

type MessageContract<T extends SerializeableRecord = SerializeableRecord> = {
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

export type ContractMessages<T extends Contract> = {
  [Property in keyof (T['commands'] & T['events']) as Extract<Property, string>]:
    T['commands'][Property] extends undefined ?
      MessageContractAsMessage<T['events'][Property], Extract<Property, string>> :
      MessageContractAsMessage<T['commands'][Property], Extract<Property, string>>
};

export type ContractMessage<T extends Contract, Name extends keyof (T['events'] & T['commands'])> = ContractMessages<T>[Extract<Name, string>]

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

class Account {
  private balance = 0;
}

type WithdrawCommandData = {
  amount: number;
}

type DepositCommandData = {
  amount: number;
}

type DepositedEventData = {
  amount: number;
}

type WithdrawnEventData = {
  amount: number;
}

type WithdrawContract = MessageContract<WithdrawCommandData>;
type DepositContract = MessageContract<DepositCommandData>;

type DepositedContract = MessageContract<DepositedEventData>;
type WithdrawnContract = MessageContract<WithdrawnEventData>;

type AccountComponentContract = Contract<
  "Account Component",
  "account",
  Account,
  {
    Deposit: DepositContract,
    Withdraw: WithdrawContract
  },
  {
    Deposited: DepositedContract
    Withdrawn: WithdrawnContract
  }
>;

const MyContractValidators: ContractCommandValidator<AccountComponentContract> = {
  Deposit: (data): data is MessageContractDataType<DepositContract> => true,
  Withdraw: (data): data is MessageContractDataType<WithdrawContract> => true,
}

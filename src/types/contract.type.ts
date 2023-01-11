import {Serializeable} from "./serializeable.type";
import {TypePredicate} from "./type-predicate.type";

type DataFieldContract<T extends Serializeable = Serializeable> = {
  type: T;
  description: string;
  example: T;
};

type EventContract = {
  data: Record<string, DataFieldContract>;
  description: string;
};

type CommandContract = {
  data: Record<string, DataFieldContract>;
  description: string;
  events: Record<string, EventContract>;
};

type CreateCommandContract<T extends Record<string, any>> = {
  data: {
    [Property in keyof T]: {
      type: T[Property];
      description: string;
      example: T[Property];
    }
  };
  description: string;
  events: Record<string, EventContract>;
};

type MessageContract = CommandContract | EventContract;

type ContractCommands = Record<string, CommandContract>;

export type Contract<RootType> = {
  componentName: string;
  aggregateRoot: RootType;
  streamCategoryName: string;
  commands: ContractCommands;
};

export type CreateContract<Component extends string, Category extends string, AggregateRootType, CommandTypes extends ContractCommands> = {
  componentName: Component;
  aggregateRoot: AggregateRootType;
  streamCategoryName: Category;
  commands: CommandTypes;
}

export type ContractCommandValidator<T extends Contract<any>> = {
  [Property in keyof T['commands']]: TypePredicate<MessageContractDataType<T['commands'][Property]>>;
}

export type MessageContractDataType<T extends MessageContract> = {
  [Property in keyof T['data']]: T['data'][Property]['type']
}

class Account {
  private balance = 0;
}

type WithdrawCommandData = {
  amount: number;
}

type DepositCommandData = {
  amount: number;
}

type WithdrawContract = CreateCommandContract<WithdrawCommandData>;

type DepositContract = CreateCommandContract<DepositCommandData>;

type AccountComponentContract = CreateContract<
  "Account Component",
  "account",
  Account,
  {
    Deposit: DepositContract,
    Withdraw: WithdrawContract
  }
>;

const MyContractValidators: ContractCommandValidator<AccountComponentContract> = {
  Deposit: (data): data is MessageContractDataType<DepositContract> => true,
  Withdraw: (data): data is MessageContractDataType<WithdrawContract> => true,
}

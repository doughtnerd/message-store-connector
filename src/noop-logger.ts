import { Logger } from "./types/logger.type";

export const NoopLogger: Logger = {
  log: () => null,
  debug: () => null,
  error: () => null,
  warn: () => null,
  info: () => null,
};

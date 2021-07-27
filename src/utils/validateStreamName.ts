export function validateStreamName(streamName: string) {
  const validator = /^(\w+(:command)?)$|^(\w+(:command)?-[a-zA-Z0-9\-\+]+)$/;
  return validator.test(streamName);
}

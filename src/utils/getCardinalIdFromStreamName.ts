export function getCardinalIdFromStreamName(streamName: string) {
  return streamName.substring(streamName.indexOf("-") + 1, streamName.indexOf("+"));
}

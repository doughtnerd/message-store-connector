export function getCategoryFromStreamName(streamName: string) {
  return streamName.substring(0, streamName.indexOf("-"));
}

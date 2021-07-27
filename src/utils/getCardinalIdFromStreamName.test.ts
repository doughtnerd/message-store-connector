import { getCardinalIdFromStreamName } from "./getCardinalIdFromStreamName";

describe("getCategoryName", () => {
  test.each([
    ["myCategory-ba1ad329-ba4e-4665-bf7e-80770a5a40b2+otherId", "ba1ad329-ba4e-4665-bf7e-80770a5a40b2"],
    ["rickRoll-3fdcaa9e-dde5-40a4-9f96-393ebecd8a17+asdfasd", "3fdcaa9e-dde5-40a4-9f96-393ebecd8a17"],
    ["someStream-123+abc", "123"],
  ])("It should return %s for streamName %s", (streamName: string, cardinalId: string) => {
    const result = getCardinalIdFromStreamName(streamName);
    expect(result).toEqual(cardinalId);
  });
});

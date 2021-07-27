import { getCategoryFromStreamName } from "./getCategoryFromStreamName";

describe("getCategoryName", () => {
  test.each([
    ["myCategory-ba1ad329-ba4e-4665-bf7e-80770a5a40b2", "myCategory"],
    ["rickRoll-3fdcaa9e-dde5-40a4-9f96-393ebecd8a17", "rickRoll"],
    ["someStream-123+abc", "someStream"],
  ])("It should return %s for streamName %s", (streamName: string, expectedCategory: string) => {
    const result = getCategoryFromStreamName(streamName);
    expect(result).toEqual(expectedCategory);
  });
});

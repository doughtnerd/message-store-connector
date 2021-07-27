import { getCategoryFromStreamName } from "./getCategoryFromStreamName";
import { validateStreamName } from "./validateStreamName";

describe("getCategoryName", () => {
  test.each([
    ["myCategory-ba1ad329-ba4e-4665-bf7e-80770a5a40b2", true],
    ["a-ba1ad329-ba4e-4665-bf7e-80770a5a40b2", true],
    ["myCategory:command-ba1ad329-ba4e-4665-bf7e-80770a5a40b2", true],
    ["myCategory:command", true],
    ["-ba1ad329-ba4e-4665-bf7e-80770a5a40b2", false],
    [":command-ba1ad329-ba4e-4665-bf7e-80770a5a40b2", false],
    ["ba1ad329-ba4e-4665-bf7e-80770a5a40b2", true],
    ["someStream-123+abc", true],
    ["rickRoll", true],
    ["", false],
  ])("For %s it returns %s", (streamName: string, isValid: boolean) => {
    const result = validateStreamName(streamName);
    expect(result).toEqual(isValid);
  });
});

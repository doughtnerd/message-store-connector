/**
 * A JSON serializeable value
 */
export type SerializeableValue = boolean | string | number | null;

/**
 * Type alias for any JSON serializeable type.
 */
export type Serializeable = SerializeableValue | SerializeableRecord | SerializeableArray;

/**
 * An array of JSON serializeable data.
 */
export type SerializeableArray = Array<Serializeable>;

/**
 * A serializeable JSON Object
 */
export type SerializeableRecord = {
  [key: string]: Serializeable;
};

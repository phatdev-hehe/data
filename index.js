import { delay, isPlainObject } from "es-toolkit";
import { isArray, mapValues } from "es-toolkit/compat";
import json2md from "json2md";
import fs from "node:fs";

export default {
  fetch: async (
    input,
    { responseType = "text", delayMs = 1000, headers } = {}
  ) => {
    await delay(delayMs);

    return await (await fetch(input, { headers }))[responseType]();
  },
  mkEmptyDirSync: (path) => {
    fs.rmSync(path, {
      recursive: true,
      force: true,
    });

    fs.mkdirSync(path);
  },
  json2md: (data) => {
    const parseValue = (value) => value ?? "";

    const processArray = (data) =>
      isArray(data)
        ? data.map((value) =>
            isArray(value) ? processArray(value) : parseValue(value)
          )
        : data;

    const processObject = (data) =>
      isPlainObject(data)
        ? mapValues(data, (value) =>
            (isPlainObject(value)
              ? processObject
              : isArray(value)
              ? processArray
              : parseValue)(value)
          )
        : data;

    return json2md(data.map(processObject));
  },
};

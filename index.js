import { delay } from "es-toolkit";
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
};

import { delay } from "es-toolkit";

export const $ = {
  fetch: async (
    input,
    { responseType = "json", delayMs = 1000, headers } = {}
  ) => {
    await delay(delayMs);

    return await (await fetch(input, { headers }))[responseType]();
  },
};

import { delay } from "es-toolkit";

export default {
  fetch: async (
    input,
    { responseType = "text", delayMs = 1000, headers } = {}
  ) => {
    await delay(delayMs);

    return await (await fetch(input, { headers }))[responseType]();
  },
};

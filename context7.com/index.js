// https://github.com/upstash/context7/blob/master/src/lib/api.ts
// https://github.com/upstash/context7/blob/master/src/lib/types.ts

import { delay } from "es-toolkit";
import { sort } from "fast-sort";
import { formatNumber } from "intl-number-helper";
import json2md from "json2md";
import fs from "node:fs";

const context7ApiBaseUrl = "https://context7.com/api";
const dataPath = "data";

const fetchData = async (
  input,
  { responseType = "json", delayMs = 3000, headers } = {}
) => {
  await delay(delayMs);

  return await (
    await fetch(`${context7ApiBaseUrl}/${input}`, { headers })
  )[responseType]();
};

const libraries = sort(await fetchData("libraries")).asc((library) => [
  library.settings.title,
  library.settings.project,
]);

fs.writeFileSync(
  "readme.md",
  json2md({
    img: { source: "favicon.ico" },
    table: {
      headers: ["", "NAME", "REPO", "TOKENS", "SNIPPETS", "UPDATE", "STATE"],
      rows: libraries.map((library, index) => {
        index += 1;

        return [
          index,
          `<a href=${dataPath}/${index}.txt>${library.settings.title}</a>`,
          `<a href=${library.settings.docsRepoUrl}>${library.settings.project}</a>`,
          formatNumber(library.version.totalTokens),
          formatNumber(library.version.totalSnippets),
          library.version.lastUpdate ?? "",
          `<img src=${
            {
              finalized: "icons/completed-icon.svg",
              initial: "icons/processing-icon.svg",
              error: "icons/error-icon.svg",
              get parsed() {
                return this.initial;
              },
              get delete() {
                return this.error;
              },
            }[library.version.state]
          }/>`,
        ];
      }),
    },
  })
);

fs.rmSync(dataPath, {
  recursive: true,
  force: true,
});

fs.mkdirSync(dataPath);

for (const [index, library] of libraries.entries()) {
  const pathName = `/v1${library.settings.project}`;
  const url = new URL(`${context7ApiBaseUrl}${pathName}`);

  url.searchParams.set("tokens", library.version.totalTokens);
  url.searchParams.set("type", "txt");

  fs.writeFileSync(
    `${dataPath}/${index + 1}.txt`,
    await fetchData(`${pathName}${url.search}`, {
      responseType: "text",
      delayMs: 20000,
      headers: {
        "X-Context7-Source": "mcp-server",
      },
    })
  );
}

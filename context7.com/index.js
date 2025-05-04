import { sort } from "fast-sort";
import { formatNumber } from "intl-number-helper";
import json2md from "json2md";
import fs from "node:fs";
import { $ } from "../index.js";

const context7ApiBaseUrl = "https://context7.com/api";
const dataPath = "data";

const libraries = sort(await $.fetch(`${context7ApiBaseUrl}/libraries`)).asc(
  (library) => [library.settings.title, library.settings.project]
);

fs.writeFileSync(
  "readme.md",
  json2md({
    img: { source: "assets/favicon.ico" },
    table: {
      headers: ["", "NAME", "REPO", "TOKENS", "SNIPPETS", "UPDATE", ""],
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
              finalized: "assets/completed-icon.svg",
              initial: "assets/processing-icon.svg",
              error: "assets/error-icon.svg",
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
  const url = new URL(`${context7ApiBaseUrl}/v1${library.settings.project}`);

  url.searchParams.set("tokens", library.version.totalTokens);
  url.searchParams.set("type", "txt");

  fs.writeFileSync(
    `${dataPath}/${index + 1}.txt`,
    await $.fetch(url, {
      responseType: "text",
      delayMs: 20000,
      headers: { "X-Context7-Source": "mcp-server" },
    })
  );
}

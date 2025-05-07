import { sort } from "fast-sort";
import { formatNumber } from "intl-number-helper";
import fs from "node:fs";
import _ from "../index.js";

const context7ApiBaseUrl = "https://context7.com/api";

const libraries = sort(
  (
    await _.fetch(`${context7ApiBaseUrl}/libraries`, { responseType: "json" })
  ).filter((library) => library.settings.stars > 100)
).desc((library) => library.settings.stars);

{
  const dataPath = "data";
  const limit = 100;

  // https://github.com/upstash/context7/blob/171b298f7a049f5ebd773d42f18433f61cb567cb/src/lib/api.ts#L33
  const getLibraryApiUrl = (library) => {
    const url = new URL(`${context7ApiBaseUrl}/v1${library.settings.project}`);

    url.searchParams.set("tokens", 999_999_999_999_999);
    url.searchParams.set("type", "txt");

    return url;
  };

  fs.writeFileSync(
    "readme.md",
    _.json2md([
      { img: { source: "assets/favicon.ico" } },
      {
        table: {
          headers: [
            undefined,
            "NAME",
            "REPO",
            "TOKENS",
            "SNIPPETS",
            "UPDATE",
            undefined,
          ],
          rows: libraries.map((library, index) => {
            index += 1;

            const exceedsLimit = index > limit;
            const withinLimit = (content) => !exceedsLimit && content;

            return [
              index,
              `<a href='${
                exceedsLimit
                  ? getLibraryApiUrl(library).href
                  : `${dataPath}/${index}.txt`
              }'>${library.settings.title}</a>`,
              `<a href=${library.settings.docsRepoUrl}>${library.settings.project}</a>`,
              withinLimit(formatNumber(library.version.totalTokens)),
              withinLimit(formatNumber(library.version.totalSnippets)),
              withinLimit(library.version.lastUpdate),
              withinLimit(
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
                }/>`
              ),
            ];
          }),
        },
      },
    ])
  );

  _.mkEmptyDirSync(dataPath);

  for (const [index, library] of libraries.entries())
    if (index < limit)
      fs.writeFileSync(
        `${dataPath}/${index + 1}.txt`,
        await _.fetch(getLibraryApiUrl(library), {
          delayMs: 20000,
          headers: { "X-Context7-Source": "mcp-server" },
        })
      );
}

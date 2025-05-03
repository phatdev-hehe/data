import { uniq } from "es-toolkit";
import { sort } from "fast-sort";
import { JSDOM } from "jsdom";
import json2md from "json2md";
import fs from "node:fs";
import sortKeys from "sort-keys";
import { $ } from "../index.js";

const languageCodes = ["en", "ru"];
const jsonPath = "json";

const getReadMeFileName = (languageCode) =>
  ({ en: "readme.md", ru: "readme-ru.md" }[languageCode]);

fs.mkdirSync(jsonPath, { recursive: true });

for (const languageCode of languageCodes) {
  let result = {};

  const {
    window: { document },
  } = new JSDOM(
    await $.fetch(`https://kaomoji.ru/${{ en: "en", ru: "" }[languageCode]}`, {
      responseType: "text",
    })
  );

  for (const element of document.querySelectorAll("h3 > a[name]")) {
    const list = sort(
      uniq(
        [
          ...element.parentElement.nextElementSibling.nextElementSibling.querySelectorAll(
            ".table_kaomoji td > span"
          ),
        ]
          .map((element) => element.textContent.trim())
          .filter(Boolean)
      )
    ).asc();

    result[element.textContent] = {
      description: element.parentElement.nextElementSibling.textContent,
      count: list.length,
      list,
    };
  }

  result = sortKeys(result, { deep: true });

  await Promise.all([
    fs.promises.writeFile(
      `${jsonPath}/${languageCode}.json`,
      JSON.stringify(result)
    ),
    fs.promises.writeFile(
      getReadMeFileName(languageCode),
      json2md([
        {
          ul: languageCodes
            .filter(
              (currentLanguageCode) => currentLanguageCode !== languageCode
            )
            .map(
              (languageCode) =>
                `<a href=${getReadMeFileName(languageCode)}>${
                  { en: "English", ru: "Русский" }[languageCode]
                }</a>`
            ),
        },
        {
          p: document.querySelector(".updates_table td").childNodes[2]
            .textContent,
        },
        { img: { source: `logo/${languageCode}.jpg` } },
        ...Object.entries(result).map(
          ([title, { count, description, list }]) => [
            { h2: `${title} <sup>${count}</sup>` },
            { p: description },
            { code: { content: list.join("\n\n") } },
          ]
        ),
      ])
    ),
  ]);
}

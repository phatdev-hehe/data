import { uniq } from "es-toolkit";
import { sort } from "fast-sort";
import { JSDOM } from "jsdom";
import fs from "node:fs";
import sortKeys from "sort-keys";
import _ from "../index.js";

const languageCodes = ["en", "ru"];
const jsonPath = "json";

const getReadMeFileName = (languageCode) =>
  ({ en: "readme.md", ru: "readme-ru.md" }[languageCode]);

_.mkEmptyDirSync(jsonPath);

for (const languageCode of languageCodes) {
  let data = {};

  const {
    window: { document },
  } = new JSDOM(
    await _.fetch(`https://kaomoji.ru/${{ en: "en", ru: "" }[languageCode]}`)
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

    data[element.textContent] = {
      description: element.parentElement.nextElementSibling.textContent,
      count: list.length,
      list,
    };
  }

  data = sortKeys(data, { deep: true });

  await Promise.all([
    fs.promises.writeFile(
      `${jsonPath}/${languageCode}.json`,
      JSON.stringify(data)
    ),
    fs.promises.writeFile(
      getReadMeFileName(languageCode),
      _.json2md([
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
        { img: { source: `assets/logo-${languageCode}.jpg` } },
        ...Object.entries(data).map(([title, { count, description, list }]) => [
          { h2: `${title} <sup>${count}</sup>` },
          { p: description },
          { code: { content: list.join("\n\n") } },
        ]),
      ])
    ),
  ]);
}

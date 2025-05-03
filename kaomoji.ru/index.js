import { sort } from "fast-sort";
import { JSDOM } from "jsdom";
import json2md from "json2md";
import fs from "node:fs";
import sortKeys from "sort-keys";

const getReadMeFileName = (languageCode) =>
  ({ en: "readme.md", ru: "readme-ru.md" }[languageCode]);

await Promise.all(
  ["en", "ru"].map(async (languageCode, index, languageCodes) => {
    let result = {};

    const {
      window: { document },
    } = new JSDOM(
      await (
        await fetch(`https://kaomoji.ru/${{ en: "en", ru: "" }[languageCode]}`)
      ).text()
    );

    for (const element of document.querySelectorAll("h3 > a[name]")) {
      const kaomoji = sort([
        ...new Set(
          [
            ...element.parentElement.nextElementSibling.nextElementSibling.querySelectorAll(
              ".table_kaomoji td > span"
            ),
          ]
            .map((element) => element.textContent.trim())
            .filter(Boolean)
        ),
      ]).asc();

      result[element.textContent] = {
        description: element.parentElement.nextElementSibling.textContent,
        count: kaomoji.length,
        kaomoji,
      };
    }

    result = sortKeys(result, { deep: true });

    await Promise.all([
      fs.promises.writeFile(
        `json/${languageCode}.json`,
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
                  `<a href='${getReadMeFileName(languageCode)}'>${
                    { en: "English", ru: "Русский" }[languageCode]
                  }</a>`
              ),
          },
          {
            p: document.querySelector(".updates_table td").childNodes[2]
              .textContent,
          },
          {
            img: {
              title: document.querySelector("title").textContent,
              source: `logo/${languageCode}.jpg`,
            },
          },
          ...Object.entries(result).map(([title, result]) => [
            { h2: `${title} <sup>${result.count}</sup>` },
            { p: result.description },
            { code: { content: result.kaomoji.join("\n\n") } },
          ]),
        ])
      ),
    ]);
  })
);

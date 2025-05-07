import { noCase, split } from "change-case";
import convert from "convert";
import {
  delay,
  identity,
  isFunction,
  isPlainObject,
  isString,
  isUndefined,
  mapValues,
  partial,
  sampleSize,
  sumBy,
} from "es-toolkit";
import { sort } from "fast-sort";
import json2md from "json2md";
import fs from "node:fs";
import normalizePath from "normalize-path";
import percentage from "percentage";
import PokeApi from "pokedex-promise-v2";
import { isValidRoman } from "roman-numbers";
import { titleCase } from "title-case";

const dataPath = "data";

const readme = {
  items: [],
  pokemon: [],
  pokemonAbilities: [],
  pokemonMoves: [],
};

const utils = {
  titleCase: (input) =>
    split(titleCase(noCase(input)))
      .map((value) =>
        isValidRoman(value.toUpperCase()) ? value.toUpperCase() : value
      )
      .join(" "),
  checkbox: (value) => value && "🗸",
  convert: (quantity, from) => {
    const bestConversion = convert(quantity, from).to("best");

    return `${bestConversion.quantity.toFixed()} ${bestConversion.unit}`;
  },
  delay: partial(delay, 1000),
  pickEnglish: (data) => data.find(({ language }) => language.name === "en"),
  transformAssetUrls(data, { repoPath, depth = 1 } = {}) {
    return mapValues(data, (value) => {
      if (isString(value))
        return value.replace(
          `https://raw.githubusercontent.com/PokeAPI/${repoPath}`,
          `${"../".repeat(depth)}${dataPath}`
        );

      if (isPlainObject(value))
        return this.transformAssetUrls(value, { repoPath, depth });

      return "";
    });
  },
  createUlTag(data, fn1, fn2) {
    return `<ul>${sort(data)
      .asc(fn1)
      .map(fn1)
      .map((content) => {
        if (isFunction(fn2)) return fn2(content);

        const displayContent = this.titleCase(content);

        if (isString(fn2))
          return `<a href=${fn2}/${content}.md>${displayContent}</a>`;

        return displayContent;
      })
      .map((content) => `<li>${content}</li>`)
      .join("")}</ul>`;
  },
  md: {
    createNamesTable: (names) =>
      json2md({
        table: {
          headers: ["Language", ""],
          rows: sort(names)
            .asc(({ language }) => language.name)
            .map(({ language, name }) => [language.name, name]),
        },
      }),
  },
};

{
  const PokéAPI = new PokeApi();

  const itemsPath = "items";
  const pokemonPath = "pokemon";
  const pokemonMovesPath = `${pokemonPath}/moves`;
  const pokemonSpeciesPath = `${pokemonPath}/species`;

  for (const path of [pokemonPath, itemsPath])
    fs.rmSync(path, { recursive: true, force: true });

  const fetch = async (apiMethod, { dir, writeFile }) => {
    fs.mkdirSync(dir);

    for (const { name } of sampleSize(
      (await PokéAPI[apiMethod]()).results,
      3
    )) {
      await utils.delay();

      const file = `${dir}/${name}.md`;
      const resourceData = { name, file };

      fs.writeFileSync(
        file,
        (await writeFile(resourceData)) ??
          JSON.stringify(resourceData, undefined, 2)
      );
    }
  };

  await fetch("getPokemonsList", {
    dir: pokemonPath,
    writeFile: async ({ name, file }) => {
      const pokemon = await PokéAPI.getPokemonByName(name);

      await utils.delay();

      const pokemonLocationAreaEncounters = await PokéAPI.getResource(
        pokemon.location_area_encounters
      );

      pokemon.sprites = utils.transformAssetUrls(pokemon.sprites, {
        repoPath: "sprites/master",
      });

      pokemon.cries = utils.transformAssetUrls(pokemon.cries, {
        repoPath: "cries/main",
      });

      pokemon.name = utils.titleCase(pokemon.name);

      const pokemonAvatar = pokemon.sprites.front_default;

      readme.pokemon.push({
        avatar: pokemonAvatar,
        file,
        name: pokemon.name,
      });

      return json2md([
        {
          img: {
            source: pokemonAvatar,
            title: pokemon.name,
          },
        },
        { h1: pokemon.name },
        {
          table: {
            headers: ["", "Value"],
            rows: [
              [
                "Species",
                `<a href=species/${pokemon.species.name}.md>${utils.titleCase(
                  pokemon.species.name
                )}</a>`,
              ],
              ["Height", utils.convert(pokemon.height, "decimeter")],
              ["Weight", utils.convert(pokemon.weight, "hectogram")],
              [
                "The base experience gained for defeating this Pokémon",
                pokemon.base_experience,
              ],
              [
                "Set for exactly one Pokémon used as the default for each species",
                utils.checkbox(pokemon.is_default),
              ],
              [
                "Types",
                utils.createUlTag(pokemon.types, ({ type }) => type.name),
              ],
              [
                "Cries",
                utils.createUlTag(
                  Object.values(pokemon.cries),
                  identity,
                  (href) => `<a href=${href}>${href}<a/>`
                ),
              ],
              [
                "Held items",
                utils.createUlTag(
                  pokemon.held_items,
                  ({ item }) => item.name,
                  `../${itemsPath}`
                ),
              ],
              [
                "Location areas",
                utils.createUlTag(
                  pokemonLocationAreaEncounters,
                  ({ location_area }) => location_area.name
                ),
              ],
              [
                "Moves",
                utils.createUlTag(
                  pokemon.moves,
                  ({ move }) => move.name,
                  `../${pokemonMovesPath}`
                ),
              ],
            ],
          },
        },
        { h2: "Stats" },
        {
          table: {
            headers: ["", "", "Effort values"],
            rows: [
              ...pokemon.stats.map((pokemonStat) => [
                utils.titleCase(pokemonStat.stat.name),
                pokemonStat.base_stat,
                pokemonStat.effort,
              ]),
              [
                "Total",
                sumBy(pokemon.stats, (pokemonStat) => pokemonStat.base_stat),
              ],
            ],
          },
        },
        { h2: "Abilities" },
        {
          table: {
            headers: ["", "", "Hidden"],
            rows: pokemon.abilities.map((pokemonAbility) => [
              pokemonAbility.slot,
              `<a href=abilities/${
                pokemonAbility.ability.name
              }.md>${utils.titleCase(pokemonAbility.ability.name)}</a>`,
              utils.checkbox(pokemonAbility.is_hidden),
            ]),
          },
        },
        { h2: "Game indices" },
        {
          table: {
            headers: ["", "ID"],
            rows: sort(pokemon.game_indices)
              .asc(({ version }) => version.name)
              .map(({ version, game_index }) => [
                utils.titleCase(version.name),
                game_index,
              ]),
          },
        },
        { h2: "Sprites" },
        ...[
          [undefined, pokemon.sprites],
          ["Dream World", pokemon.sprites.other.dream_world],
          ["Home", pokemon.sprites.other.home],
          ["Official artwork", pokemon.sprites.other["official-artwork"]],
          ["Showdown", pokemon.sprites.other.showdown],
          [
            "I. Red & Blue",
            pokemon.sprites.versions["generation-i"]["red-blue"],
          ],
          ["I. Yellow", pokemon.sprites.versions["generation-i"].yellow],
          ["II. Crystal", pokemon.sprites.versions["generation-ii"].crystal],
          ["II. Gold", pokemon.sprites.versions["generation-ii"].gold],
          ["II. Silver", pokemon.sprites.versions["generation-ii"].silver],
          ["III. Emerald", pokemon.sprites.versions["generation-iii"].emerald],
          [
            "III. FireRed & LeafGreen",
            pokemon.sprites.versions["generation-iii"]["firered-leafgreen"],
          ],
          [
            "III. Ruby & Sapphire",
            pokemon.sprites.versions["generation-iii"]["ruby-sapphire"],
          ],
          [
            "IV. Diamond & Pearl",
            pokemon.sprites.versions["generation-iv"]["diamond-pearl"],
          ],
          [
            "IV. HeartGold & SoulSilver",
            pokemon.sprites.versions["generation-iv"]["heartgold-soulsilver"],
          ],
          ["IV. Platinum", pokemon.sprites.versions["generation-iv"].platinum],
          [
            "V. Black & White",
            pokemon.sprites.versions["generation-v"]["black-white"],
          ],
          [
            "VI. Omega Ruby & Alpha Sapphire",
            pokemon.sprites.versions["generation-vi"][
              "omegaruby-alphasapphire"
            ],
          ],
          ["VI. X & Y", pokemon.sprites.versions["generation-vi"]["x-y"]],
          ["VII. Icons", pokemon.sprites.versions["generation-vii"].icons],
          [
            "VII. Ultra Sun & Ultra Moon",
            pokemon.sprites.versions["generation-vii"]["ultra-sun-ultra-moon"],
          ],
          ["VIII. Icons", pokemon.sprites.versions["generation-viii"].icons],
        ].flatMap(([title, pokemonSprite]) => {
          const searchString = "front_";
          const createImgTag = (src) => `<img width=100 src=${src}/>`;

          const table = {
            headers: ["", "Front", "Back"],
            rows: Object.entries(pokemonSprite)
              .filter(([key]) => key.startsWith(searchString))
              .map(([key, value]) => {
                key = key.slice(searchString.length);

                return [
                  utils.titleCase(key),
                  createImgTag(value),
                  createImgTag(pokemonSprite[`back_${key}`]),
                ];
              }),
          };

          return isUndefined(title) ? [{ table }] : [{ h3: title, table }];
        }),
      ]);
    },
  });

  await fetch("getAbilitiesList", {
    dir: `${pokemonPath}/abilities`,
    writeFile: async ({ name, file }) => {
      const pokemonAbility = await PokéAPI.getAbilityByName(name);

      pokemonAbility.name = utils.titleCase(pokemonAbility.name);

      readme.pokemonAbilities.push({ file, name: pokemonAbility.name });

      return json2md([
        { h1: pokemonAbility.name },
        {
          blockquote:
            utils.pickEnglish(pokemonAbility.effect_entries)?.short_effect ??
            "",
        },
        {
          table: {
            headers: ["", "Value"],
            rows: [
              ["", utils.titleCase(pokemonAbility.generation.name)],
              [
                "Whether or not this ability originated in the main series of the video games",
                utils.checkbox(pokemonAbility.is_main_series),
              ],
            ],
          },
        },
        utils.md.createNamesTable(pokemonAbility.names),
        {
          table: {
            headers: ["Pokemon", "Ability slot", "Hidden ability"],
            rows: sort(pokemonAbility.pokemon)
              .asc(({ pokemon }) => pokemon.name)
              .map(({ pokemon, ...pokemonAbility }) => [
                `<a href=../${pokemon.name}.md>${utils.titleCase(
                  pokemon.name
                )}</a>`,
                pokemonAbility.slot,
                utils.checkbox(pokemonAbility.is_hidden),
              ]),
          },
        },
      ]);
    },
  });

  await fetch("getItemsList", {
    dir: itemsPath,
    writeFile: async ({ name, file }) => {
      const item = await PokéAPI.getItemByName(name);

      item.sprites = utils.transformAssetUrls(item.sprites, {
        depth: 2,
        repoPath: "sprites/master",
      });

      item.name = utils.titleCase(item.name);

      readme.items.push({
        avatar: item.sprites.default,
        file,
        name: item.name,
      });

      return JSON.stringify(item);
    },
  });

  await fetch("getMovesList", {
    dir: pokemonMovesPath,
    writeFile: async ({ name, file }) => {
      const pokemonMove = await PokéAPI.getMoveByName(name);

      pokemonMove.name = utils.titleCase(pokemonMove.name);

      readme.pokemonMoves.push({ name: pokemonMove.name, file });

      return JSON.stringify(pokemonMove);
    },
  });

  await fetch("getPokemonSpeciesList", {
    dir: pokemonSpeciesPath,
    writeFile: async ({ name }) => {
      const pokemonSpecies = await PokéAPI.getPokemonSpeciesByName(name);

      pokemonSpecies.habitat ??= { name: "" };
      pokemonSpecies.name = utils.titleCase(pokemonSpecies.name);

      return json2md([
        { h1: pokemonSpecies.name },
        {
          table: {
            headers: ["", "Value"],
            rows: [
              ["", utils.titleCase(pokemonSpecies.generation.name)],
              ["Happiness", percentage(pokemonSpecies.base_happiness / 255)],
              ["Capture rate", percentage(pokemonSpecies.capture_rate / 255)],
              ["Color", utils.titleCase(pokemonSpecies.color.name)],
              [
                "Egg groups",
                utils.createUlTag(
                  pokemonSpecies.egg_groups,
                  ({ name }) => name
                ),
              ],
              [
                "Whether or not this Pokémon has multiple forms and can switch between them",
                utils.checkbox(pokemonSpecies.forms_switchable),
              ],
              ["Genus", utils.pickEnglish(pokemonSpecies.genera).genus],
              ["Growth rate", utils.titleCase(pokemonSpecies.growth_rate.name)],
              ["Habitat", utils.titleCase(pokemonSpecies.habitat.name)],
              [
                "Whether or not this Pokémon has visual gender differences",
                utils.checkbox(pokemonSpecies.has_gender_differences),
              ],
            ],
          },
        },
        utils.md.createNamesTable(pokemonSpecies.names),
      ]);
    },
  });
}

{
  const createTable = (data, { header = "Name", shouldSort = true } = {}) => {
    const hasAvatar = "avatar" in data[0];

    return {
      headers: [...Array(hasAvatar ? 2 : 1).fill(""), header],
      rows: (shouldSort ? sort(data).asc(({ name }) => name) : data).map(
        ({ file, name, avatar }, index) => {
          index += 1;

          const aTag = `<a href=${file}>${name}</a>`;

          return hasAvatar
            ? [index, `<img src=${avatar}/>`, aTag]
            : [index, aTag];
        }
      ),
    };
  };

  const normalizedReadme = (() => {
    const normalizePath2 = (path) => {
      const pathSegments = path.split("/");
      const fileName = pathSegments.pop();

      const folderSegments = pathSegments.filter(
        (value) => !value.includes(".")
      );

      return normalizePath(
        folderSegments.length
          ? [...folderSegments, fileName].join("/")
          : fileName
      );
    };

    return mapValues(readme, (value) =>
      value.map((value) =>
        "avatar" in value
          ? { ...value, avatar: normalizePath2(value.avatar) }
          : value
      )
    );
  })();

  fs.writeFileSync(
    "readme.md",
    json2md([
      { h1: "Pokemon" },
      { table: createTable(normalizedReadme.pokemon, { shouldSort: false }) },
      {
        table: createTable(normalizedReadme.pokemonAbilities, {
          header: "Ability",
        }),
      },
      { table: createTable(normalizedReadme.pokemonMoves, { header: "Move" }) },
      { h1: "Items" },
      { table: createTable(normalizedReadme.items) },
    ])
  );
}

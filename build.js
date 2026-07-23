/**
 * Multi-theme Style Dictionary build.
 *
 * Outputs:
 *   dist/tokens.css  — :root (all default tokens) + [data-theme="X"] blocks for each color theme
 *   dist/tokens.js   — ESM with `tokens` (default values) and `themes` (per-theme color CSS var maps)
 */

import StyleDictionary from 'style-dictionary';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';

// ── Utilities ──────────────────────────────────────────────────────────────

const rawTokens = JSON.parse(readFileSync('tokens.json', 'utf8'));

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] !== null &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

/** Deep-clone and merge named token sets from the raw tokens file. */
function selectSets(...sets) {
  const result = {};
  for (const name of sets) {
    const set = rawTokens[name];
    if (set) deepMerge(result, JSON.parse(JSON.stringify(set)));
  }
  return result;
}

// ── Semantic color filter ──────────────────────────────────────────────────

/**
 * Palette color keys that live in Primitives/Color.
 * These do NOT change across color themes — they are the raw swatches.
 */
const PRIMITIVE_COLOR_KEYS = new Set([
  'Green', 'Orange', 'Yellow', 'Red', 'Blue',
  'Neutral', 'Transparent Dark', 'Transparent Light',
]);

/**
 * Returns true for tokens that are semantic color tokens (from Color Modes).
 * These are the ones that change per theme and belong in [data-theme="X"] blocks.
 */
const isSemanticColor = (token) =>
  (token.path[0] === 'Color' && !PRIMITIVE_COLOR_KEYS.has(token.path[1])) ||
  token.path[0] === 'Component Colors';

// ── Custom formats ─────────────────────────────────────────────────────────

/**
 * Flat JSON map of CSS variable names → resolved values.
 * Used as an intermediate format for building the JS `themes` export.
 */
StyleDictionary.registerFormat({
  name: 'json/css-vars',
  format: ({ dictionary }) => {
    const vars = {};
    for (const token of dictionary.allTokens) {
      vars[`--${token.name}`] = token.value;
    }
    return JSON.stringify(vars, null, 2);
  },
});

/**
 * ESM module with two exports:
 *   `tokens`  — nested camelCase object of all default token values
 *   `themes`  — CSS custom property maps per color theme, ready for inline styles
 *
 * options.themes  { [themeName]: { '--var-name': value } }
 */
StyleDictionary.registerFormat({
  name: 'javascript/esm-themes',
  format: ({ dictionary, options }) => {
    // Build a nested camelCase object from all tokens
    const root = {};
    for (const token of dictionary.allTokens) {
      let curr = root;
      for (let i = 0; i < token.path.length - 1; i++) {
        const key = toCamel(token.path[i]);
        if (typeof curr[key] !== 'object' || curr[key] === null) curr[key] = {};
        curr = curr[key];
      }
      curr[toCamel(token.path[token.path.length - 1])] = token.value;
    }

    const themes = options?.themes ?? {};

    return [
      '/**',
      ' * Do not edit directly, this file was auto-generated.',
      ' */',
      '',
      '/**',
      ' * All design tokens with default (light) color theme values.',
      ' */',
      `export const tokens = ${JSON.stringify(root, null, 2)};`,
      '',
      '/**',
      ' * Color theme overrides as CSS custom property maps.',
      ' *',
      ' * Apply via a data-theme attribute (recommended — uses CSS cascade):',
      ' *   <div data-theme="dark">…</div>',
      ' *',
      ' * Or apply as React inline styles (JS-only, no CSS cascade):',
      ' *   <div style={themes.dark}>…</div>',
      ' *',
      ` * Available themes: ${Object.keys(themes).join(', ')}`,
      ' */',
      `export const themes = ${JSON.stringify(themes, null, 2)};`,
      '',
    ].join('\n');
  },
});

function toCamel(str) {
  // "On Primary Var" → "onPrimaryVar", "Component Colors" → "componentColors"
  return str
    .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toLowerCase());
}

// ── Build config ───────────────────────────────────────────────────────────

const BASE_SETS = [
  'Primitives/Default',
  'Primitives/Color',
  'Primitives/Design',
  'Scale/Default',
  'Font/Default',
];

const COLOR_THEMES = [
  {
    name: 'default',
    selector: ':root',
    // Default uses all base sets + default color mode
    sets: [...BASE_SETS, 'Color Modes / Default'],
  },
  {
    name: 'inverted',
    selector: '[data-theme="inverted"]',
    // Alternate themes only need primitives for reference resolution
    sets: ['Primitives/Default', 'Primitives/Color', 'Color Modes / Inverted'],
  },
  {
    name: 'dark',
    selector: '[data-theme="dark"]',
    sets: ['Primitives/Default', 'Primitives/Color', 'Color Modes / Dark'],
  },
  {
    name: 'bw',
    selector: '[data-theme="bw"]',
    // BW theme only uses Primitives/Color (matches $themes metadata)
    sets: ['Primitives/Color', 'Color Modes / BW'],
  },
];

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync('dist', { recursive: true });
  mkdirSync('dist/tmp', { recursive: true });

  // ── Step 1: Full default build → dist/tokens.css (:root) ────────────────
  {
    const tokens = selectSets(...COLOR_THEMES[0].sets);
    const sd = new StyleDictionary({
      tokens,
      platforms: {
        css: {
          transformGroup: 'scss',
          transforms: ['typography/css/shorthand'],
          buildPath: 'dist/',
          files: [{
            destination: 'tokens.css',
            format: 'css/variables',
            options: { outputReferences: true, selector: ':root' },
          }],
        },
        // Also capture default theme's semantic color vars as JSON (for JS export)
        'theme-json': {
          transformGroup: 'css',
          buildPath: 'dist/tmp/',
          files: [{
            destination: 'default.json',
            format: 'json/css-vars',
            filter: isSemanticColor,
          }],
        },
      },
    });
    await sd.buildAllPlatforms();
    console.log('scss ✔︎ dist/tokens.css\n');
  }

  // ── Step 2: Alternate color theme builds ────────────────────────────────
  for (const theme of COLOR_THEMES.slice(1)) {
    const tokens = selectSets(...theme.sets);
    const sd = new StyleDictionary({
      tokens,
      platforms: {
        // CSS block for [data-theme="X"]
        css: {
          transformGroup: 'css',
          buildPath: 'dist/tmp/',
          files: [{
            destination: `${theme.name}.css`,
            format: 'css/variables',
            filter: isSemanticColor,
            options: {
              selector: theme.selector,
              // Fully resolve references — theme overrides must be self-contained
              outputReferences: false,
            },
          }],
        },
        // JSON for JS themes export
        'theme-json': {
          transformGroup: 'css',
          buildPath: 'dist/tmp/',
          files: [{
            destination: `${theme.name}.json`,
            format: 'json/css-vars',
            filter: isSemanticColor,
          }],
        },
      },
    });
    await sd.buildAllPlatforms();
  }

  // ── Step 3: Append theme CSS blocks to dist/tokens.css ──────────────────
  let mainCSS = readFileSync('dist/tokens.css', 'utf8');
  for (const theme of COLOR_THEMES.slice(1)) {
    mainCSS += '\n' + readFileSync(`dist/tmp/${theme.name}.css`, 'utf8');
  }
  writeFileSync('dist/tokens.css', mainCSS);

  // ── Step 4: Build dist/tokens.js with tokens + themes ───────────────────
  const allThemeVars = {};
  for (const theme of COLOR_THEMES) {
    allThemeVars[theme.name] = JSON.parse(
      readFileSync(`dist/tmp/${theme.name}.json`, 'utf8')
    );
  }

  {
    const tokens = selectSets(...COLOR_THEMES[0].sets);
    const sd = new StyleDictionary({
      tokens,
      platforms: {
        js: {
          // camelCase names + hex colors; sizes stay as numeric values
          transforms: ['attribute/cti', 'name/camel', 'color/hex'],
          buildPath: 'dist/',
          files: [{
            destination: 'tokens.js',
            format: 'javascript/esm-themes',
            options: { themes: allThemeVars },
          }],
        },
      },
    });
    await sd.buildAllPlatforms();
  }

  console.log('js ✔︎ dist/tokens.js\n');

  // ── Step 5: Remove tmp directory ────────────────────────────────────────
  rmSync('dist/tmp', { recursive: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

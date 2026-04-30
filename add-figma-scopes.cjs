// add-figma-scopes.js
// Run with: node add-figma-scopes.js
// Adds com.figma.scopes and com.figma.hiddenFromPublishing to all tokens
// that are missing them, based on their type and section.

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "tokens.json");
const tokens = JSON.parse(fs.readFileSync(FILE, "utf8"));

let changed = 0;

function scope(scopes, hidden = false) {
  return {
    "com.figma.scopes": scopes,
    "com.figma.hiddenFromPublishing": hidden,
  };
}

// Merge figma extensions into a token's $extensions block (non-destructive)
function addScope(token, scopes, hidden = false) {
  if (!token.$extensions) token.$extensions = {};
  // Only add if not already set
  if (!token.$extensions["com.figma.scopes"]) {
    token.$extensions["com.figma.scopes"] = scopes;
    token.$extensions["com.figma.hiddenFromPublishing"] = hidden;
    changed++;
  }
}

// Walk all tokens in a section object, calling visitor(token, key, parentKeys)
function walk(obj, visitor, parents = []) {
  for (const [key, val] of Object.entries(obj)) {
    if (val && typeof val === "object") {
      if ("value" in val && "type" in val) {
        // It's a token
        visitor(val, key, parents);
      } else {
        // It's a group — recurse
        walk(val, visitor, [...parents, key]);
      }
    }
  }
}

// ── Primitives/Default ────────────────────────────────────────────────────────

const prim = tokens["Primitives/Default"];

// Scale → NONE, hidden
walk(prim.Scale, (token) => addScope(token, ["NONE"], true));

// TypeScale → NONE, hidden
walk(prim.TypeScale, (token) => addScope(token, ["NONE"], true));

// toSet → NONE, hidden
walk(prim.toSet, (token) => addScope(token, ["NONE"], true));

// Color primitives → COLOR_FILLS, not hidden
// (includes studio.tokens-only tokens — we just add the figma keys)
walk(prim.Color, (token) => {
  if (token.type === "color") addScope(token, ["COLOR_FILLS"], false);
});

// ── Design Tokens/Default ─────────────────────────────────────────────────────

const dt = tokens["Design Tokens/Default"];

// sizes → GAP
walk(dt.sizes, (token) => {
  if (token.type === "number") addScope(token, ["GAP"], false);
});

// fontSize → FONT_SIZE
walk(dt.fontSize, (token) => {
  if (token.type === "number") addScope(token, ["FONT_SIZE"], false);
});

// lineHeights → LINE_HEIGHT
walk(dt.lineHeights, (token) => {
  if (token.type === "lineHeights") addScope(token, ["LINE_HEIGHT"], false);
});

// letterSpacing → LETTER_SPACING
walk(dt.letterSpacing, (token) => {
  if (token.type === "letterSpacing") addScope(token, ["LETTER_SPACING"], false);
});

// borderRadius → CORNER_RADIUS
walk(dt.borderRadius, (token) => {
  if (token.type === "borderRadius") addScope(token, ["CORNER_RADIUS"], false);
});

// fontWeights → FONT_STYLE (Figma uses FONT_STYLE for weight text values)
walk(dt.fontWeights, (token) => {
  if (token.type === "text") addScope(token, ["FONT_STYLE"], false);
});

// Component Tokens (annotation stroke width) → NONE, hidden
if (dt["Component Tokens"]) {
  walk(dt["Component Tokens"], (token) => {
    if (token.type === "number") addScope(token, ["NONE"], true);
  });
}

// Typography, shadows, textCase, textDecoration, paragraphIndent, fontFamilies
// → no Figma variable scope — skip

// ── Color Modes (all 4 themes) ────────────────────────────────────────────────

const colorModes = [
  "Color Modes / Default",
  "Color Modes / Inverted",
  "Color Modes / BW",
  "Color Modes / Dark",
];

for (const modeName of colorModes) {
  const mode = tokens[modeName];
  if (!mode) continue;
  walk(mode, (token) => {
    if (token.type === "color") addScope(token, ["ALL_SCOPES"], false);
  });
}

// ── Media sections → NONE, hidden ────────────────────────────────────────────

const mediaSections = [
  "Media/Desktop",
  "Media/Mobile",
  "Media/Document",
  "Media/Slide",
];

for (const section of mediaSections) {
  const media = tokens[section];
  if (!media) continue;
  walk(media, (token) => {
    if (token.type === "number") addScope(token, ["NONE"], true);
  });
}

// ── Write output ──────────────────────────────────────────────────────────────

fs.writeFileSync(FILE, JSON.stringify(tokens, null, 2));
console.log(`Done — added com.figma.scopes to ${changed} tokens.`);

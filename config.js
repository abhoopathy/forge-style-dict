import StyleDictionary from 'style-dictionary';

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

StyleDictionary.registerParser({
  name: 'figma-json-fixer',
  pattern: /\.json$/,
  parser: ({ filePath, contents }) => {
    const tokens = JSON.parse(contents);

    // Get all top-level keys that don't start with $
    const keysToFlatten = Object.keys(tokens).filter(key => !key.startsWith('$'));

    // Deep-merge each non-$ object's children into the main tokens object
    keysToFlatten.forEach(key => {
      const childTokens = tokens[key];
      Object.entries(childTokens).forEach(([childKey, value]) => {
        if (
          tokens[childKey] !== undefined &&
          typeof tokens[childKey] === 'object' &&
          !Array.isArray(tokens[childKey]) &&
          typeof value === 'object' &&
          !Array.isArray(value)
        ) {
          deepMerge(tokens[childKey], value);
        } else {
          tokens[childKey] = value;
        }
      });
      // Remove the original parent key
      delete tokens[key];
    });

    return tokens;
  },
});

export default {
  source: ['tokens.json'],
  parsers: ["figma-json-fixer"],
  platforms: {
    scss: {
      transformGroup: 'scss',
      buildPath: 'dist/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          options: {
            outputReferences: true
          },
        }
      ],
      transforms: ['typography/css/shorthand']
    },
    js: {
      buildPath: 'dist/',
      files: [
        {
          destination: 'tokens.js',
          format: 'javascript/module'
        },
      ],
      transforms: ['attribute/cti', 'content/quote', 'name/kebab', 'size/rem', 'color/hex'],
    }
  }
}
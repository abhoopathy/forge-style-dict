import StyleDictionary from 'style-dictionary';



StyleDictionary.registerParser({
  name: 'figma-json-fixer',
  pattern: /\.json$/,
  parser: ({ filePath, contents }) => {
    const tokens = JSON.parse(contents);

    // Get all top-level keys that don't start with $
    const keysToFlatten = Object.keys(tokens).filter(key => !key.startsWith('$'));

    // Flatten each non-$ object's children into the main tokens object
    keysToFlatten.forEach(key => {
      const childTokens = tokens[key];
      // Copy all children to the top level
      Object.entries(childTokens).forEach(([childKey, value]) => {
        tokens[childKey] = value;
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
      files: [{
        destination: 'tokens.scss',
        format: 'scss/variables',
        options: {
          outputReferences: true
        }
      },
      {
        destination: 'color.css',
        format: 'css/variables',
        options: {
          outputReferences: true
        },
        filter: (token) => token.type === 'color'
      },
      {
        destination: 'tokens.css',
        format: 'css/variables',
        options: {
          outputReferences: true
        },
        transforms: ['typography/css/shorthand'],
        filter: (token) => token.type !== 'color'
      },
      {
        destination: 'all.css',
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
      files: [{
        destination: 'colors.js',
        format: 'javascript/module-flat',
        filter: (token) => token.type === 'color'
      },
      {
        destination: 'tokens.js',
        format: 'javascript/module',
        filter: (token) => token.type === 'color'
      },
      ],
      transforms: ['attribute/cti', 'content/quote', 'name/kebab', 'size/rem', 'color/hex'],
    }
  }
}
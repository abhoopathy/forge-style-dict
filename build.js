import StyleDictionary from 'style-dictionary';

// Register the custom parser
StyleDictionary.registerParser({
  name: 'figma-json-fixer',
  pattern: /\.json$/,
  parser: function({ filePath, contents }) {
    try {
      const tokens = JSON.parse(contents);
      
      // Handle case where tokens might be an array or not an object
      if (typeof tokens !== 'object' || tokens === null) {
        return tokens;
      }

      // Get all top-level keys that don't start with $
      const keysToFlatten = Object.keys(tokens).filter(key => !key.startsWith('$'));

      // Flatten each non-$ object's children into the main tokens object
      keysToFlatten.forEach(key => {
        const childTokens = tokens[key];
        // Only process if childTokens is an object
        if (typeof childTokens === 'object' && childTokens !== null) {
          Object.entries(childTokens).forEach(([childKey, value]) => {
            tokens[childKey] = value;
          });
        }
        // Remove the original parent key
        delete tokens[key];
      });

      return tokens;
    } catch (error) {
      console.error('Error parsing tokens.json:', error);
      return {};
    }
  }
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
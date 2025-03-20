import StyleDictionary from 'style-dictionary';

StyleDictionary.registerTransform({
  type: `name`,
  transitive: true,
  name: `cleanName`,
  transform: (token) => {
    console.log(token);
    return token.name.replace(/^design-tokens-/, '').replace(/^primitives-/, '');
  },
});

export default {
  source: ['tokens.json'],
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
      }],
      transforms: ['name/kebab', 'cleanName']
    }
  }
} 
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
      }]
    }
  }
} 
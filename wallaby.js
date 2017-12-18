module.exports = function (wallaby) {
  return {
    files: [
      'src/**/*.js',
      'test/_data/**/*.js',
      'test/_utils/**/*.js'
    ],

    tests: [
      'test/**/*.test.js'
    ],

    compilers: {
      '**/*.js': wallaby.compilers.babel()
    },

    debug: true,
    env: {
      type: 'node'
    }
  }
}
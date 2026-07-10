module.exports = function(aGrunt) {
  aGrunt.registerTask('eslint', 'Run the CRA ESLint checks.', function() {
    const done = this.async();
    aGrunt.util.spawn({
      cmd: process.platform === 'win32' ? 'node_modules/.bin/eslint.cmd' : 'node_modules/.bin/eslint',
      args: ['src', '--ext', '.ts,.tsx'],
      opts: {stdio: 'inherit'},
    }, function(aError) {
      done(!aError);
    });
  });

  aGrunt.registerTask('jest', 'Run Jest once through react-scripts.', function() {
    const done = this.async();
    aGrunt.util.spawn({
      cmd: process.platform === 'win32' ? 'node_modules/.bin/react-scripts.cmd' : 'node_modules/.bin/react-scripts',
      args: ['test', '--watchAll=false'],
      opts: {
        stdio: 'inherit',
        env: {...process.env, CI: 'true'},
      },
    }, function(aError) {
      done(!aError);
    });
  });
};

const { execFileSync } = require('child_process');

const explicitVariables = [
  'BRAUHAUS_APP_VERSION',
  'REACT_APP_VERSION',
  'APP_VERSION',
  'BUILD_BUILDNUMBER',
];

function cleanVersion(aVersion) {
  if (!aVersion || typeof aVersion !== 'string') return undefined;
  const trimmedVersion = aVersion.trim();
  return trimmedVersion.length > 0 ? trimmedVersion : undefined;
}

function getAzureTagVersion(aEnv) {
  const sourceBranch = cleanVersion(aEnv.BUILD_SOURCEBRANCH);
  if (sourceBranch && sourceBranch.startsWith('refs/tags/')) {
    return sourceBranch.substring('refs/tags/'.length);
  }
  return undefined;
}

function getExplicitVersion(aEnv) {
  for (const variableName of explicitVariables) {
    const value = cleanVersion(aEnv[variableName]);
    if (value) return value;
  }
  return getAzureTagVersion(aEnv);
}

function getGitVersion() {
  try {
    return cleanVersion(execFileSync('git', ['describe', '--tags', '--always', '--dirty'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }));
  } catch (error) {
    return undefined;
  }
}

function resolveAppVersion(aEnv = process.env) {
  return getExplicitVersion(aEnv) || getGitVersion() || 'unknown';
}

module.exports = { resolveAppVersion };

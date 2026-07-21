const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withAndroidMonorepoRoot(config) {
  return withAppBuildGradle(config, (androidConfig) => {
    const marker = 'react {\n';
    const rootSetting = '    root = file("${projectRoot}/../..")\n';

    if (/^    root = file\(.*\)$/m.test(androidConfig.modResults.contents)) {
      androidConfig.modResults.contents = androidConfig.modResults.contents.replace(
        /^    root = file\(.*\)$/m,
        rootSetting.trimEnd(),
      );
    } else {
      androidConfig.modResults.contents = androidConfig.modResults.contents.replace(
        marker,
        `${marker}${rootSetting}`,
      );
    }

    androidConfig.modResults.contents = androidConfig.modResults.contents.replace(
      /^    entryFile = .*$/m,
      '    entryFile = file("${projectRoot}/index.js")',
    );
    androidConfig.modResults.contents = androidConfig.modResults.contents.replace(
      /^    hermesCommand = .*$/m,
      '    hermesCommand = "${projectRoot}/../../node_modules/react-native/sdks/hermesc/%OS-BIN%/hermesc"',
    );
    androidConfig.modResults.contents = androidConfig.modResults.contents.replace(
      /^    cliFile = .*$/m,
      '    cliFile = new File("${projectRoot}/../../node_modules/@expo/cli/build/bin/cli")',
    );

    return androidConfig;
  });
};

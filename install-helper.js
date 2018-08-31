const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// What do we need to do:
(async () => {
  try {
    switch (process.argv[2]) {
    case '--install':
      await install();
      break;
    case '--prepack':
      await prepack();
      break;
    default:
      throw new Error(`Unmatched install-helper request: '${process.argv[2]}'`);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
})();

async function install() {
  const fs = require('fs');
  // See if we have an existing build for the current version/platform/arch:
  const { arch, platform, version } = process;
  // We only care about major version:
  const [ majorVersion ] = version.split('.');

  try {
    // Move folder to build location so that `bindings` can find it:
    const binaryFolder = `builds/${majorVersion}/${platform}/${arch}`;
    await promisify(fs.rename)(binaryFolder, 'build');

  } catch (error) {
    // Couldn't find the prebuilt binary for this platform, need to build it:
    console.error(error.message);
    await exec('node-gyp rebuild');
  }
}

async function prepack() {
  const fs = require('fs-extra');
  // Prebuild the binary for different targets
  const targets = [
    { arch: 'x64', version: 'v8.11.4' },
    { arch: 'x64', version: 'v10.9.0' },
  ];
  // Can only target the platform we're currently on, unfortunately
  const { platform } = process;

  // Clean the current build directory, if it exists:
  await exec('node-gyp clean');
  await fs.emptyDir('builds');

  for (const { arch, version } of targets) {
    console.log('building', platform, arch, version);
    await exec(`node-gyp configure --target=${version} --arch=${arch}`);
    await exec('node-gyp build');
    // Move build files to directory:
    const [ majorVersion ] = version.split('.');
    const binaryFolder = `builds/${majorVersion}/${platform}/${arch}`;
    await fs.move('build', binaryFolder);
  }
}

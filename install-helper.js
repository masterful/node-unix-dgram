const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

(async () => {
  try {
    // What do we need to do:
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
    // Catch any errors so we can then exit the process with an error code:
    console.error(error.message);
    process.exit(1);
  }
})();

async function install() {
  const fs = require('fs');
  // See if we have an existing build for the current version/platform/arch:
  const { version, platform, arch } = process;

  try {
    // Move the folder to the build location so that `bindings` can find it:
    await promisify(fs.rename)(`builds/${version}/${platform}/${arch}`, 'build');

  } catch (error) {
    // If the build directory exists, we don't need to do anything:
    if (error.code === 'ENOTEMPTY') { return; } 
    // Couldn't find the prebuilt binary for this platform, need to build it:
    console.error(error.message);
    await exec('node-gyp rebuild');
  }
}

function getTargets() {
  // See if we specified targets in the environment:
  try {
    return JSON.parse(process.env.NODE_TARGETS);
  } catch (error) {}
  // Otherwise, return the default:
  const { arch, version } = process;
  return [{ arch, version }];
}

async function prepack() {
  const fs = require('fs-extra');
  // Prebuild the binary for different targets
  const targets = getTargets();
  // Can only target the platform we're currently on, unfortunately
  const { platform } = process;

  // Clean the current build directory, if it exists:
  await exec('node-gyp clean');
  await fs.emptyDir('builds');

  for (const { arch, version } of targets) {
    console.log('building', platform, arch, version);
    await exec(`node-gyp configure --target=${version} --arch=${arch}`);
    await exec('node-gyp build');
    // Move build files to a target-based directory:
    await fs.move('build', `builds/${version}/${platform}/${arch}`);
  }
}

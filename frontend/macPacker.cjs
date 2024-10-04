exports.default = async function (context) {
  console.log(`\n- [INFO] building for ${context.electronPlatformName} \n`);
  if (context.electronPlatformName !== "darwin") {
    return;
  }
  const { readFileSync, writeFileSync, copyFileSync } = await import("fs");
  const path = (await import("path")).default;

  const appOutDir = context.appOutDir;
  const appName = context.packager.appInfo.productFilename;
  // const { readFileSync, writeFileSync, copyFileSync} = require('fs');
  // const path = require('path');

  // Path to the Info.plist file
  const plistPath = path.join(
    appOutDir,
    `${appName}.app`,
    "Contents",
    "Info.plist",
  );

  // // Modify Info.plist
  const plist = readFileSync(plistPath, "utf8");
  const modifiedPlist = plist.replace(
    /<key>CFBundleExecutable<\/key>\s*<string>[^<]*<\/string>/,
    "<key>CFBundleExecutable</key><string>launch.command</string>",
  );
  writeFileSync(plistPath, modifiedPlist, "utf8");

  // // Copy launch.sh to the .app bundle
  const scriptSourcePath = path.join(__dirname, "launch.command");
  const scriptDestinationPath = path.join(
    appOutDir,
    `${appName}.app`,
    "Contents",
    "MacOS",
    "launch.command",
  );
  copyFileSync(scriptSourcePath, scriptDestinationPath);

  // // Make sure the script is executable
  // chmodSync(scriptDestinationPath, '0755');
  console.log("\n- [INFO] Testing afterPack functionality\n");
};

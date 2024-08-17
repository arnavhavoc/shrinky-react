const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const glob = require("glob");

const projectDir = process.cwd();
const packageJsonPath = path.join(projectDir, "package.json");
const nodeModulesPath = path.join(projectDir, "node_modules");

function getPackageJson() {
  return JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
}

function getDependencies() {
  const pkg = getPackageJson();
  return {
    dependencies: Object.keys(pkg.dependencies || {}),
    devDependencies: Object.keys(pkg.devDependencies || {}),
  };
}

function findUsedPackages() {
  const usedPackages = new Set();
  const files = glob.sync("**/*.{js,jsx,ts,tsx}", {
    ignore: ["node_modules/**"],
  });

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      usedPackages.add(match[1].split("/")[0]);
    }

    while ((match = requireRegex.exec(content)) !== null) {
      usedPackages.add(match[1].split("/")[0]);
    }
  });

  return usedPackages;
}

function removeUnusedPackages(usedPackages) {
  const pkg = getPackageJson();
  const dependencies = Object.keys(pkg.dependencies || {});
  const devDependencies = Object.keys(pkg.devDependencies || {});

  dependencies.forEach((dep) => {
    if (!usedPackages.has(dep)) {
      console.log(`Removing unused dependency: ${dep}`);
      delete pkg.dependencies[dep];
    }
  });

  devDependencies.forEach((dep) => {
    if (!usedPackages.has(dep)) {
      console.log(`Removing unused devDependency: ${dep}`);
      delete pkg.devDependencies[dep];
    }
  });

  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
}

function clean() {
  const usedPackages = findUsedPackages();

  console.log("Found used packages:", usedPackages);

  removeUnusedPackages(usedPackages);

  console.log("Removing node_modules and reinstalling packages...");

  // Cross-platform command for deleting node_modules
  if (process.platform === "win32") {
    execSync("rmdir /s /q node_modules");
  } else {
    execSync("rm -rf node_modules");
  }

  execSync("npm install", { stdio: "inherit" });
}

clean();

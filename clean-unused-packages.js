const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Constants for mandatory dependencies
const MANDATORY_DEPENDENCIES = [
  "react",
  "react-dom",
  "react-scripts",
  "vite",
  "parcel",
  "@babel/core",
];

// Read package.json and return dependencies
function getDependencies() {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  const dependencies = Object.keys(packageJson.dependencies || {});
  return dependencies.filter((dep) => !MANDATORY_DEPENDENCIES.includes(dep));
}

// Search files for imports
function searchFilesForImports(dependencyList) {
  const extensions = [".js", ".jsx", ".ts", ".tsx"];
  const filePaths = findFiles(process.cwd(), extensions);

  const usedDependencies = new Set();

  filePaths.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    dependencyList.forEach((dep) => {
      if (content.includes(dep)) {
        usedDependencies.add(dep);
      }
    });
  });

  // Filter out the used dependencies from the original list
  return dependencyList.filter((dep) => !usedDependencies.has(dep));
}

// Find all files with given extensions
function findFiles(dir, extensions) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(filePath, extensions));
    } else if (extensions.includes(path.extname(file))) {
      results.push(filePath);
    }
  });

  return results;
}

// Update package.json
function updatePackageJson(dependencyList) {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  // Filter out dependencies that should be removed
  packageJson.dependencies = Object.keys(packageJson.dependencies || {}).reduce(
    (deps, dep) => {
      if (
        MANDATORY_DEPENDENCIES.includes(dep) ||
        !dependencyList.includes(dep)
      ) {
        deps[dep] = packageJson.dependencies[dep];
      }
      return deps;
    },
    {}
  );

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

// Delete node_modules and reinstall
function cleanAndReinstall() {
  const nodeModulesPath = path.join(process.cwd(), "node_modules");

  // Delete node_modules
  if (process.platform === "win32") {
    execSync(`rmdir /s /q ${nodeModulesPath}`);
  } else {
    execSync(`rm -rf ${nodeModulesPath}`);
  }

  // Install dependencies
  execSync("npm install", { stdio: "inherit" });
}

function main() {
  try {
    // Step 1: Delete package-lock.json
    const packageLockPath = path.join(process.cwd(), "package-lock.json");
    if (fs.existsSync(packageLockPath)) {
      fs.unlinkSync(packageLockPath);
    }

    // Step 2: Get initial dependencies list
    let dependencyList = getDependencies();
    console.log("Initial DEPENDENCY_LIST:");
    console.log(dependencyList);

    // Step 3: Search files and filter dependencies
    dependencyList = searchFilesForImports(dependencyList);
    console.log("Filtered DEPENDENCY_LIST (unused):");
    console.log(dependencyList);

    // Step 4: Update package.json
    updatePackageJson(dependencyList);

    // Step 5: Clean and reinstall
    cleanAndReinstall();

    console.log("Dependencies updated and reinstalled successfully.");
  } catch (error) {
    console.error("Error:", error);
  }
}

main();

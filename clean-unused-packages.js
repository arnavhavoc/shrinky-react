const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const glob = require("glob");
const babelParser = require("@babel/parser");

const projectDir = process.cwd();
const packageJsonPath = path.join(projectDir, "package.json");

const essentialPackages = new Set([
  "react",
  "react-dom",
  "react-scripts", // For Create React App
  "vite",
  "parcel",
  "@babel/core",
  "@babel/preset-react",
  "@emotion/react",
  "@emotion/styled",
  "@mui/material",
]);

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

function analyzeFile(content) {
  const usedPackages = new Set();

  // Parsing with babel-parser to handle modern syntax
  const ast = babelParser.parse(content, {
    sourceType: "module",
    plugins: ["jsx", "typescript"], // Enable plugins for JSX and TypeScript support
  });

  const traverse = (node) => {
    if (node.type === "ImportDeclaration" || node.type === "CallExpression") {
      const moduleName =
        node.source?.value || node.arguments?.[0]?.value || null;

      if (moduleName && typeof moduleName === "string") {
        usedPackages.add(moduleName.split("/")[0]);
      }
    }

    for (const key in node) {
      if (node[key] && typeof node[key] === "object") {
        traverse(node[key]);
      }
    }
  };

  traverse(ast);

  return usedPackages;
}

function findUsedPackages() {
  const usedPackages = new Set();
  const files = glob.sync("**/*.{js,jsx,ts,tsx}", {
    ignore: ["node_modules/**", "**/test/**", "**/tests/**"],
  });

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    const packagesInFile = analyzeFile(content);
    packagesInFile.forEach((pkg) => usedPackages.add(pkg));
  });

  return usedPackages;
}

function removeUnusedPackages(usedPackages) {
  const pkg = getPackageJson();
  const dependencies = Object.keys(pkg.dependencies || {});

  dependencies.forEach((dep) => {
    if (!usedPackages.has(dep) && !essentialPackages.has(dep)) {
      console.log(`Removing unused dependency: ${dep}`);
      delete pkg.dependencies[dep];
    }
  });

  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
}

function clean() {
  const usedPackages = findUsedPackages();

  console.log("Found used packages:", usedPackages);

  removeUnusedPackages(usedPackages);

  console.log("Removing node_modules and reinstalling packages...");

  if (process.platform === "win32") {
    execSync("rmdir /s /q node_modules", { stdio: "inherit" });
  } else {
    execSync("rm -rf node_modules", { stdio: "inherit" });
  }

  execSync("npm install", { stdio: "inherit" });
}

clean();

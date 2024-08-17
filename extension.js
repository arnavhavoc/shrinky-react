const vscode = require("vscode");
const path = require("path");

function activate(context) {
  let disposable = vscode.commands.registerCommand(
    "shrink-react.cleanUnusedPackages",
    function () {
      const terminal = vscode.window.createTerminal("Shrink React");
      terminal.show();
      const scriptPath = path.join(
        context.extensionPath,
        "clean-unused-packages.js"
      );
      terminal.sendText(`node ${scriptPath}`);
    }
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};

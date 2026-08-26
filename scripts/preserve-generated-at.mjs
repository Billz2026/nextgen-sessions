import fs from "node:fs";

const [previousPath, currentPath] = process.argv.slice(2);
if (!previousPath || !currentPath) throw new Error("Usage: preserve-generated-at.mjs <previous.json> <current.json>");
if (!fs.existsSync(previousPath) || !fs.existsSync(currentPath)) process.exit(0);

const previous = JSON.parse(fs.readFileSync(previousPath, "utf8"));
const current = JSON.parse(fs.readFileSync(currentPath, "utf8"));
const previousCore = { ...previous };
const currentCore = { ...current };
delete previousCore.generatedAt;
delete currentCore.generatedAt;

if (JSON.stringify(previousCore) === JSON.stringify(currentCore) && previous.generatedAt) {
  current.generatedAt = previous.generatedAt;
  fs.writeFileSync(currentPath, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  console.log(`Preserved generatedAt in ${currentPath}; content is unchanged.`);
} else {
  console.log(`${currentPath} contains substantive changes; generatedAt remains current.`);
}

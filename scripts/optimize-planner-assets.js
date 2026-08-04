const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const plannerPath = path.join(root, "quotation-planner", "index.html");
const mediaDir = path.join(root, "assets", "planner-media");
const mappings = [
  ["planner-seemax-logo.png", null], ["planner-aifil-logo.png", null],
  [null, "catalog/p19.png"], [null, "catalog/p25.png"], [null, "catalog/p3.jpg"],
  [null, "catalog/p391-50100.png"], [null, "catalog/p391-5050.jpg"], [null, "catalog/p4-9696.jpg"],
  ["ledlab-logo.png", null], ["cdc-seemax-logo.png", null], ["ce-rohs.png", null],
  ["ce-rohs-big.png", null], ["footer-logos.png", null]
];

fs.mkdirSync(mediaDir, { recursive: true });
let source = fs.readFileSync(plannerPath, "utf8");
if (!/data:image\/(png|jpeg|jpg);base64,/.test(source) && source.includes("const ASSET_ROOT")) {
  console.log("Planner già ottimizzato: nessuna modifica necessaria.");
  process.exit(0);
}
let index = 0;
source = source.replace(/(['"])data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=]+)\1/g, (_match, _quote, format, base64) => {
  const mapping = mappings[index++];
  if (!mapping) throw new Error(`Immagine Planner inattesa in posizione ${index}.`);
  const [filename, existingPath] = mapping;
  const assetPath = existingPath || `planner-media/${filename}`;
  if (filename) fs.writeFileSync(path.join(mediaDir, filename), Buffer.from(base64, "base64"));
  return `ASSET_ROOT + '${assetPath}'`;
});
if (index !== mappings.length) throw new Error(`Trovate ${index} immagini su ${mappings.length} attese.`);
source = source.replace("    const BRAND_ASSETS = {", "    const ASSET_ROOT = location.search.includes('integrated=1') ? 'assets/' : '../assets/';\n    const BRAND_ASSETS = {");
fs.writeFileSync(plannerPath, source);
console.log(`Planner ottimizzato: ${index} immagini esternalizzate o riutilizzate.`);

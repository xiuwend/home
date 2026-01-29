const { promises: fs } = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const pngToIco = require('png-to-ico');

const dir = __dirname;

async function main() {
  const svgPath = path.join(dir, 'icon.svg');
  const pngPath = path.join(dir, 'icon.png');
  const icoPath = path.join(dir, 'icon.ico');

  const svg = await fs.readFile(svgPath, 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 512 },
    font: { loadSystemFonts: true, defaultFontFamily: 'Microsoft YaHei' },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  await fs.writeFile(pngPath, pngBuffer);

  const icoBuffer = await pngToIco(pngPath);
  await fs.writeFile(icoPath, icoBuffer);

  console.log('已生成 build/icon.png (512x512) 与 build/icon.ico');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


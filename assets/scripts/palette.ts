{
  const src = "config/palette.json";
  const dest = "tmp/palette.css";
  console.log(`Generate palette from ${src}...`);
  const output = [":root {"];
  const data = await Deno.readTextFile(src);
  const palette = JSON.parse(data);
  for (const { hue, level, hex } of palette) {
    const name = hue.toLowerCase();
    output.push(`\t--${name}-hex-${level}: ${hex};`);
    if (level === "800") output.push("");
  }
  for (const { level, hue, oklch } of palette) {
    const name = hue.toLowerCase();
    output.push(`\t--${name}-${level}: ${oklch};`);
  }
  output.push("}");
  Deno.writeTextFile(dest, output.join("\n"));
  console.log(`Created file at ${dest}`);
}

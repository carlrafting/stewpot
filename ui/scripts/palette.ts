{
  const src = "config/palette.json";
  const dest = "tmp/palette.css";
  console.log(`Generate palette from ${src}...`);
  const output = [":root {"];
  const data = await Deno.readTextFile(src);
  const palette = JSON.parse(data);
  for (const { hue, level, hex } of palette) {
    const name = hue.toLowerCase();
    output.push(`  --${name}-hex-${level}: ${hex};`);
    if (level === "800") output.push("");
  }
  for (const { level, hue, oklch } of palette) {
    const name = hue.toLowerCase();
    output.push(`  --${name}-${level}: ${oklch};`);
    if (level === "800") output.push("");
  }
  // No blank line before the closing brace, to match `deno fmt`.
  if (output.at(-1) === "") output.pop();
  output.push("}", "");
  await Deno.writeTextFile(dest, output.join("\n"));
  console.log(`Created file at ${dest}`);
}

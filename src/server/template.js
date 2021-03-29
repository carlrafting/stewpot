export function render(template, data={}, layout='default.html') {
  if (!template || typeof template !== 'string') {
    throw Error(`Template Render Error!`);
  }
  // TODO: detect if template is path or template string... 
}

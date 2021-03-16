export function render(template, data={}, layout) {
  if (!template || typeof template !== 'string') {
    throw Error(`template has to be string, was ${template}`);
  }
  // TODO: detect if template is path or template string... 
}

// making a change
// 123...
// 456...
// 789
// 101112
// 131415

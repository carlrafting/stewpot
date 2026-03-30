# @stewpot/html

Library of functions for working with HTML in various ways.

```ts
import { assertEquals } from "jsr:@std/assert/equals";
import { html, template } from "jsr:@stewpot/html";

// create html elements with attributes and children (optional)
const header = html(
  "header",
  { "class": "banner" },
  ["This is a header element"],
);
assertEquals(
  header,
  `<header class="banner">
This is a header element
</header>`,
);

// map data to a template literal string
const [data, t] = template({ src: "/img.jpg", alt: "" });
const img = t`<img src="${data.src}" alt="${data.alt}">`;
assertEquals(
  img,
  `<img src="/img.jpg" alt="">`,
);
```

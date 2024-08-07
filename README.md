# just-mime

A simple way to retrieve a mime-type from an extension.

## Usage

Either install this module via `npm i -g just-mime` and then use `just-mime` as it is or:

```sh
# prints out `text/javascript`
# because it uses "iana" as default db
# unless not specified differently
bunx just-mime --for js

# prints out `application/javascript`
# because it uses the apache db as reference
bunx just-mime --db apache --for js

# prints out an ECMAScript module to
# eventually store and use somewhere
bunx just-mime --db apache > mime.js

# prints out an ESM with only some
# extension recognized
bunx just-mime --db=apache,iana --include=png,html,css,jpg,js,svg

# prints out an ESM with all possible results
# except those mime types that are not desired
# (include is for extensions, exclude is for mime types)
bunx just-mime --exclude ^vnd.,^x-,others
# exclude supports ^ and $ for prefix/suffix cases

# it shows an informative help message
bunx just-mime --help
```

### Output Example

```js
const APPLICATION = "application";
const IMAGE = "image";
const TEXT = "text";

const types = {
  [APPLICATION]: ["javascript"],
  [IMAGE]: ["jpeg", "png", "svg+xml"],
  [TEXT]: ["css", "html", "javascript"]
};

const extensions = {
  "js": [APPLICATION, 0],
  "jpeg": [IMAGE, 0],
  "jpg": [IMAGE, 0],
  "jpe": [IMAGE, 0],
  "png": [IMAGE, 1],
  "svg": [IMAGE, 2],
  "svgz": [IMAGE, 2],
  "css": [TEXT, 0],
  "html": [TEXT, 1],
  "htm": [TEXT, 1],
  "shtml": [TEXT, 1],
  "mjs": [TEXT, 2]
};

const noDot = type => type.startsWith('.') ? type.slice(1) : type;

export default new Proxy(
  extensions,
  {
    has: ($, type) => $.hasOwnProperty(noDot(type)),
    get: ($, type) => {
      const value = $[noDot(type)];
      return value && `${value[0]}/${types[value[0]][value[1]]}`;
    },
  }
);
```

The created module is highly optimized to avoid repetition, it plays extremely well with minifiers, and it's really fast to return results.

```js
import mime from 'just-mime.js';

console.log('js' in mime);
// true

console.log(mime.js);
// "application/javascript"

console.log(mime.shenanigans);
// undefined
```

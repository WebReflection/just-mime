#!/usr/bin/env node
import db from 'mime-db';

const { create, entries, is } = Object;
const { stringify } = JSON;

const types = create(null);
const values = create(null);
const constants = new Map;
const include = new Set;
const sources = new Set;
const valid = new Set;
const exclude = [];

const findKey = $ => {
  for (const [key, value] of constants) {
    if (is(value, $)) return key;
  }
};

const noDot = type => type.startsWith('.') ? type.slice(1) : type;

const args = [];

for (const arg of process.argv.slice(2)) {
  if (arg.includes('=')) {
    const [name, ...value] = arg.split('=');
    args.push(name, value.join('='));
  }
  else
    args.push(arg);
}

let oneOff = '';

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--db': {
      for (const source of (args.at(++i) || '').split(','))
        sources.add(source);
      break;
    }
    case '--exclude': {
      const types = (args.at(++i) || '').split(',');
      for (let mime of types) {
        if (mime.startsWith('^')) {
          mime = mime.slice(1);
          exclude.push(s => s.startsWith(mime));
        }
        else if (mime.endsWith('$')) {
          mime = mime.slice(0, -1);
          exclude.push(s => s.endsWith(mime));
        }
        else
          exclude.push(s => s.includes(mime));
      }
      break;
    }
    case '--include': {
      const exts = (args.at(++i) || '').split(',').map(noDot);
      if (exts.length) {
        for (const ext of exts)
          include.add(ext);
      }
      else {
        console.error(`Unknown extension in ${exts.join(',')} list`);
        process.exit(1);
      }
      break;
    }
    case '--for': {
      oneOff = noDot(args.at(++i) || '');
      if (!oneOff) {
        console.error(`Undefined --for extension`);
        process.exit(1);
      }
      break;
    }
    case '--help': {
      console.log(`
\x1b[1mjust-mime\x1b[0m [options]

\x1b[2m# convert an extension to its mime-type or
# produce an optimized ESM file to do the same\x1b[0m

    --help                    \x1b[2m# this message\x1b[0m
    --db apache,iana,nginx    \x1b[2m# the optional db source to consider\x1b[0m
    --for ext                 \x1b[2m# convert an extension to its mime-type\x1b[0m
    --include png,svg,txt     \x1b[2m# extensions (only) to include\x1b[0m
    --exclude ^vnd.,^x-,woff  \x1b[2m# mime types (only) to exclude\x1b[0m

\x1b[2m# (c) Andrea Giammarchi - MIT\x1b[0m
\x1b[2m# https://github.com/WebReflection/just-mime\x1b[0m
`);
      process.exit(0);
      break;
    }
  }
}

for (const [key, details] of entries(db)) {
  const { extensions, source } = details;
  if (source) valid.add(source);
  if (!extensions || (sources.size && !sources.has(source))) continue;
  if (include.size) {
    let consider = false;
    for (const value of extensions) {
      if (include.has(value)) {
        consider = true;
        break;
      }
    }
    if (!consider) continue;
  }
  const [prefix, ...rest] = key.split('/');
  const pre = prefix.toUpperCase().replace(/-/g, '_');
  if (!constants.has(pre))
    constants.set(pre, prefix);
  if (!(prefix in types))
    types[prefix] = [];
  const mime = rest.join('/');
  if (exclude.some(fn => fn(mime))) {
    if (!types[prefix].length) {
      constants.delete(pre);
      delete types[prefix];
    }
    continue;
  }

  // better safe than sorr ... ehm, duplicated!
  let i = types[prefix].indexOf(mime);
  if (i < 0) i = types[prefix].push(mime) - 1;
  for (const value of extensions) {
    if (!(value in values))
      values[value] = [prefix, i];
  }
}

for (const source of sources) {
  if (!valid.has(source)) {
    console.error(`Unknown db source ${source}`);
    process.exit(1);
  }
}

if (oneOff) {
  if (oneOff in values) {
    const [prefix, i] = values[oneOff];
    process.stdout.write(`${prefix}/${types[prefix][i]}`);
    process.exit(0);
  }
  else {
    console.error(`Unknown extension ${oneOff}`);
    process.exit(1);
  }
}

let content = '';

for (const [key, value] of constants)
  content += `const ${key} = ${stringify(value)};\n`;

const replacements = `"(${[...constants.values()].join('|')})"`;

content += `
const types = ${stringify(types, null, '  ').replace(
  new RegExp(`${replacements}:`, 'g'),
  (_, $1) => `[${findKey($1)}]:`,
)};

const extensions = ${stringify(values, null, '  ').replace(
  new RegExp(`${replacements},`, 'g'),
  (_, $1) => `${findKey($1)},`,
)};

const noDot = ${noDot};

export default new Proxy(
  extensions,
  {
    has: ($, type) => $.hasOwnProperty(noDot(type)),
    get: ($, type) => {
      const value = $[noDot(type)];
      return value && \`\${value[0]}/\${types[value[0]][value[1]]}\`;
    },
  }
);
`;

process.stdout.write(content);

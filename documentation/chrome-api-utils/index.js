'use strict';

const shell = require('./shell.js');
const glob = require('glob').sync;
const fs = require('fs');

try {
    fs.accessSync('chromium', fs.constants.F_OK);
}
catch (ex) {
    console.log(shell(`
    mkdir chromium
    cd chromium
    git init
    git remote add -t master --no-tags origin https://github.com/chromium/chromium.git
    git fetch --depth=1 --recurse-submodules=no
    git config core.sparsecheckout true
    echo chrome/common/extensions/api>.git/info/sparse-checkout
    echo extensions/common/api>>.git/info/sparse-checkout
    git checkout master
    `) || 'checkout ok');
}

const HEAD = `
<!DOCTYPE html>
<html>
<head>
<title></title>
</head>
<body>
<h1>Google Chrome Extension API Support</h1>
<p>API as documented at <a href="https://developer.chrome.com/extensions/api_index">Chrome APIs</a>.</p>
<style>
.collapsible-list li {
  list-style-type: none;
}
.collapsible-list li:before {
  content: "\\000BB";
  padding-right: 0.5em;
}

.not-done:after {
    content: "\\2718";
    color: red;
}
.all-done:after {
    content: "\\2713";
    font-weight: bolder;
    color: green;
}
.some-done:after {
    content: "\\2713";
    font-weight: bolder;
    color: orange;
}

.collapsible-list li ul {
  display: none;
}
.collapsible-list li:target ul {
  display: initial;
}

.collapsible-list li:target.not-done:after {
    content: "";
}
.collapsible-list li:target.all-done:after {
    content: "";
}
.collapsible-list li:target.some-done:after {
    content: "";
}  


.collapsible-list li .unfold {
  display: initial;
}
.collapsible-list li:target .unfold {
  display: none;
}
.collapsible-list li .collapse {
  display: none;
}
.collapsible-list li:target .collapse {
  display: initial;
}

.collapsible-list li ul li {
  margin-left: 2em;
}
.collapsible-list li ul li:before {
  content: "";
}

#hide-not-done:checked ~ ul .not-done {
    display: none;
}
</style>
<input type="checkbox" id="hide-not-done" /><span>What's done?</span>
<ul class="collapsible-list">
`;
const TAIL = `
</ul>
</body>
</html>
`;

const progress = require('./progress.json');
let commonApi = glob('**/*.json',
    {
        cwd: 'chromium/chrome/common/extensions/api',
        ignore: [
            '**/_*.json',
            '**/*_private.json',
            '**/*_internal.json',
            '**/*_tag.json',
            '**/action.json',
            '**/app.json',
            '**/data_reduction_proxy.json',
            '**/manifest_types.json'
        ]
    }
).map(fname => { return { fileName: fname, namespace: namespaceName(fname) }; });
commonApi.splice(commonApi.findIndex(f => f.namespace === 'sessions'), 0, { fileName: '../../../../extensions/common/api/runtime.json', namespace: 'runtime' });

const body = commonApi.map(f => { return { namespace: f.namespace, properties: propertyNames(f.fileName) }; })
 .reduce(( html, ns) => html + toHTML(ns), '');

fs.writeFileSync('../../api.html', HEAD + body + TAIL);

function namespaceName(fname) {
    const namespaces = fname.split('/');
    if (namespaces[namespaces.length - 1] === 'input_ime.json') {
        return 'input.ime';
    }
    const parts = namespaces.pop().split('.json')[0].split('_');
    const camelCase = parts.shift() + parts.map(p => p.substr(0, 1).toUpperCase() + p.substr(1)).join('');
    return namespaces.concat(camelCase).join('.');
}

function propertyNames(fname) {
    const buf = fs.readFileSync('./chromium/chrome/common/extensions/api/' + fname, 'utf-8');
    const noComment = buf.split(/[\r\n]+/g)
        .filter(ln => !ln.trimLeft().startsWith('//'))
        .map(ln => {
            const c = ln.match(/(.*)[/][/][^"']+$/);
            return c ? c[1] : ln;
        })
        .join('\n');
    try {
        const defs = JSON.parse(noComment)[0];
        return [ ...(defs.properties ? Object.keys(defs.properties) : []),
        ...(defs.functions ? defs.functions.map(f => f.name) : []),
        ...(defs.events ? defs.events.map(f => f.name) : [])
   ];
}
    catch (ex) {
        debugger;
        return [];
    }
}

function toHTML(ns) {
    const nsStatus = (!progress.done[ns.namespace] && !progress.partly[ns.namespace]) ? 'not-done' : (progress.done[ns.namespace].length >= ns.properties.length ? 'all-done' : 'some-done');
    return `
    <li id="${ns.namespace}" class="${nsStatus}"><a href="#${ns.namespace}" class="unfold">${ns.namespace}</a><a href="#" class="collapse">${ns.namespace}</a>
    <ul>
` +
    ns.properties.map(p => `      <li class="${(progress.done[ns.namespace] || []).indexOf(p) != -1 ? 'all-done' : ((progress.partly[ns.namespace] || []).indexOf(p) != -1 ? 'some-done' : 'not-done')}">${p}${bugs(ns.namespace, p)}</li>`).join(`
`) +
`    </ul>
  </li>
`;
}

function bugs(namespace, property) {
    if (!progress.bugs || !progress.bugs[namespace] || !progress.bugs[namespace][property] || !Array.isArray(progress.bugs[namespace][property])) {
        return '';
    }
    return ' ' + progress.bugs[namespace][property].reduce(function (str, bug) { return str + `<a href="${bug}">${bug}</a>`; }, '');
}

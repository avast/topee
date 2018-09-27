'use strict';

const shell = require('./shell.js');
const glob = require('glob').sync;
const fs = require('fs');

try {
    fs.accessSync('chromium', fs.constants.F_OK);
}
catch (ex) {
    console.log(shell(`
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
<title>Google Chrome Extension API Support</title>
<link href="https://fonts.googleapis.com/css?family=Roboto:400,600,700" rel="stylesheet">
<style>
body {
    font-family: 'Roboto', sans-serif;
    background-color: #f7f7f7;
}
li { line-height: 1.5em; }
p {
    margin-bottom: 3em;
}
p, .content > span { color: #aaa; }
p a {
    color: white;
    background-color: #668de5;
    border-radius: 3px;
    padding: 0.5rem;
}
p a:hover {
    background-color: #356be5;
}
h1 {
    padding-top: 3rem;
    font-size: 3rem;
}
.container {
    max-width: 80em;
    margin-top: 3em;
    margin-left: auto;
    margin-right: auto;
    background-color: #fff;
    position: relative;
}
.content {
    padding: 3rem 8rem;
}
.buttongrouplabel {
    margin-right: 3em;
}
input[name="categories"] {
    margin-left: 1em;
}
input[name="categories"]:checked + span {
    color: black;
}
</style>
</head>
<body>
<div class="container">
{{progressIndicator}}
<div class="content">
<h1>Google Chrome Extension API Support</h1>
<p>API as documented at <a href="https://developer.chrome.com/extensions/api_index">Chrome APIs.</a></p>
<style>
.collapsible-list li a, .collapsible-list li a:hover, .collapsible-list li  a:focus {
    color: #333;
    text-decoration: none;
}

.collapsible-list {
    margin-top: 4rem;
    padding: 0 1rem;
    border: 1px solid #e1e1e1;
}

.collapsible-list li {
    list-style-type: none;
    padding: 1rem 0;
    border-bottom: 1px solid #e1e1e1;
}

.collapsible-list li:last-child {
    border: 0;
}

.collapsible-list li a {
    padding-left: 1rem;
}

.collapsible-list li a:after {
    content: "\\203A";
    display: inline-block;
    transform: rotate(90deg) translateX(0.3rem);
    font-size: 2rem;
    margin-left: 1rem;
    color: rgba(0,0,0,0.3);
}

.status:before {
    margin: 0 1rem;
    color: #fff;
    border-radius: 20px;
    display: inline-block;
    width: 30px;
    height: 30px;
    text-align: center;
    line-height: 32px;
}
.status.not-done:before {
    content: "\\2718";
    background-color: #e64251;
}
.status.all-done:before {
    content: "\\2713";
    font-weight: bolder;
    background-color: #2bb95a;
}
.status.some-done:before {
    content: "\\2713";
    font-weight: bolder;
    background-color: #f37d32;
}

.collapsible-list li ul {
  display: none;
}

.collapsible-list li:target {
    background-color: #f3f3f3;
}

.collapsible-list li:target a:after {
    transform: rotate(270deg) translateX(-0.3rem);
}

.collapsible-list li:target ul {
  display: initial;
}

.collapsible-list li:target ul {
    background-color: #fafafa;
    display: block;
    margin: 1rem 0 -1rem 0;
    padding: 0;
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
    padding: 1rem 2rem 1rem 4rem;
}

#hide-not-done:checked ~ ul .not-done {
    display: none !important;
}
#hide-not-done:checked ~ * .all-done:last-child {
    border: 0;
}

.filter {
    display: flex;
    color: #aaa;
    margin-bottom: 2rem;
    align-items: center;
}

input[type="text"] {
    background-color: #fafafa;
    border-radius: 30px;
    color: #aaa;
    width: calc(100% - 2rem);
    border: 0;
    padding: 1.2rem;
    font-size: 0.9rem;
}

</style>

<div class="filter">
    <span class="buttongrouplabel">Search</span><input type="text" value="" id="search">
</div>

<span class="buttongrouplabel">Show</span><input type="radio" name="categories" checked /> <span>All</span> <input type="radio" name="categories" id="hide-not-done" /> <span>Done</span>


<script>
    var list = () => document.getElementsByClassName('collapsible-list')[0];
    document.getElementById('search').addEventListener('keyup', function() {
        var searchTerm = this.value;

        for (let li of list().getElementsByTagName('li')) {
            if(li.id) {
                li.getElementsByTagName('a')[0].click();
            }
            if(li.innerText.match(new RegExp(searchTerm, 'gi'))) {
                li.style.display = 'block';
            } else {
                li.style.display = 'none';
            }
            this.focus();
        };
    });
</script>


<ul class="collapsible-list">
`;
const LIST_END = `
</ul>
</div>
</div>
`;
const TAIL = `
</body>
</html>
`;

let apiCount = 0;
let doneCount = 0;
let partlyCount = 0;

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

const replace = (...replacements) => (component) => replacements.reduce((result, [placeholder, content]) => {
    result = result.replace(new RegExp('{{' + placeholder + '}}'), content);
    return result;
}, component);

const concatParts = (...parts) => new String(parts.join(''));

const body = commonApi.map(f => { return { namespace: f.namespace, properties: propertyNames(f.fileName) }; })
 .reduce(( html, ns) => html + toHTML(ns), '');


fs.writeFileSync(
    '../../api.html',
    concatParts(
        replace(
            ['progressIndicator', progressIndicator(doneCount, partlyCount, apiCount)],
            )(HEAD),
        body,
        LIST_END,
        TAIL,
    ),
);

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
    apiCount += ns.properties.length;
    if (progress.done[ns.namespace]) {
        doneCount += progress.done[ns.namespace].length;
    }
    if (progress.partly[ns.namespace]) {
        partlyCount += progress.partly[ns.namespace].length;
    }

    const nsStatus = (!progress.done[ns.namespace] && !progress.partly[ns.namespace]) ? 'not-done' : (progress.done[ns.namespace].length >= ns.properties.length ? 'all-done' : 'some-done');
    return `
    <li id="${ns.namespace}" class="status ${nsStatus}"><a href="#${ns.namespace}" class="unfold">${ns.namespace}</a><a href="#" class="collapse">${ns.namespace}</a>
    <ul>
` +
    ns.properties.map(p => `      <li class="status ${(progress.done[ns.namespace] || []).indexOf(p) != -1 ? 'all-done' : ((progress.partly[ns.namespace] || []).indexOf(p) != -1 ? 'some-done' : 'not-done')}">${p}${bugs(ns.namespace, p)}</li>`).join(`
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

function progressIndicator(done, partly, total) {
    return `

<style>
#progressIndicator {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    display: flex;
}

#progressIndicator.opened {
    border-bottom: 1px solid #eaeaea;
}

#progressIndicator .progress {
    display: inline-block;
    line-height: 100%;
    overflow: hidden;
    white-space: nowrap;
    color: #fff;
    width: 100%;
    padding: 0.8rem 0;
    text-align: center;
    font-weight: 600;
    font-size: 0.9rem;
    transition: 0.6s all;
    overflow-x: hidden;
}

#progressIndicator.opened .progress {
    width: 100% !important;
    background-color: transparent !important;
}

#progressIndicator.opened .progress span {
    display: block;
}

#progressIndicator .progress span {
    display: none;
}

</style>

<div id="progressIndicator">
  <div class="progress" style="width: ${100*done/total}%; background-color: #30c165; color: #30c165;"><span>${Math.round(100*done/total)}% - Done</span></div>
  <div class="progress" style="width: ${100*partly/total}%; background-color: #f48939; color: #f48939;"><span>${Math.round(100*partly/total)}% - In progress</span></div>
  <div class="progress" style="background-color: #e94c5b; color: #e94c5b;"><span>${Math.floor(100*(total-done-partly)/total)}% - Unfinished</span></div>
</div>

<script>
    document.getElementById('progressIndicator').addEventListener('click', function() {
        this.classList.toggle("opened");
    })
</script>
`;
}

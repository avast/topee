const express = require('express');
const app = express();

const PORT = 8008;
const ORIGIN = 'http://localhost:' + PORT;
function url(path) { return ORIGIN + path; }

app.get('/end.html', (req, res) => res.send(htmlWithLink(url('/'))));
app.get('/httpredirect.html', (req, res) => res.redirect(303, url('/end.html')));
app.get('/httpredirectchain.html', (req, res) => res.redirect(303, url('/httpredirect.html')));
app.get('/allredirectschain.html', (req, res) => res.redirect(303, url('/metatoscriptredirect.html')));
app.get('/metaredirect.html', (req, res) => res.send(`
<!DOCTYPE html>
<html>
<head><meta http-equiv="refresh" content="0;url=/end.html" />
</head>
<body></body>
</html>
`));
app.get('/metatoscriptredirect.html', (req, res) => res.send(`
<!DOCTYPE html>
<html>
<head><meta http-equiv="refresh" content="0;url=/scriptredirect.html" />
</head>
<body></body>
</html>
`));
app.get('/scriptredirect.html', (req, res) => res.send(`
<!DOCTYPE html>
<html>
<head><script>location='/end.html'</script>
</head>
<body></body>
</html>
`));
app.get('/historyback.html', (req, res) => res.send(`
<!DOCTYPE html>
<html>
<head><script>console.log(document.referrer); var doGoBack = !history.state; history.replaceState(true, document.title, location.href); if (doGoBack) history.back();</script>
</head>
<body>
back supressed, <a href="/">start over</a>
</body>
</html>
`));

// go forward, if there is no forward, go to historyback so that it's possible to go forward on the next visit
app.get('/historyforward.html', (req, res) => res.send(`
<!DOCTYPE html>
<html>
<head><script>setTimeout(function () { console.log('fwd'); history.forward(); }, 100); setTimeout(function () { console.log('reloc'); location = '/historyback.html'; },300);</script>
</head>
<body></body>
</html>
`));

app.get('/', (req, res) => res.send(htmlWithLink([
    url('/'),
    url('/httpredirect.html'),
    url('/httpredirectchain.html'),
    url('/metaredirect.html'),
    url('/scriptredirect.html'),
    url('/allredirectschain.html'),
    url('/historyback.html'),
    url('/historyforward.html')
])));


app.listen(PORT, () => console.log('redirecting server listening on ' + url('/')));

function htmlWithLink(url) {
    if (!Array.isArray(url))
        url = [ url ];

    return `
<!DOCTYPE html>
<html>
<head><title>navigate</title></head>
<body>`
+ url.reduce((markup, u) => markup + `<a href="${u}">${u}</a>\r\n<br/>\r\n`, '') +
`</body>
</html>
`;
}

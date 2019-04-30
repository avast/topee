setTimeout(function () {
    console.log('all scripts ok');
    if (typeof process !== 'undefined' && process.exit) {
        process.exit(0);
    }
}, 3000);

const express = require('express');

const app = express();

app.get('/', (_, res) => {
    res.send('OK');
});

console.log('starting server...');
const server = app.listen(3000, (err) => {
    if (err) {
        console.error('error starting server on 3000', err);
        process.exit(1);
    }
    console.log('started server on 3000');
});

const stop = () => {
    console.log('received stop signal, stopping...');
    server.close((err) => {
        if (err) {
            console.error('error stopping server', err);
            process.exit(1);
        }
        console.log('successfully stopped server');
        process.exit(0);
    });
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);

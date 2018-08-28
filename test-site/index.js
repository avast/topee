const fs = require('fs');
const express = require('express');
const app = express();

const index = express.static('static');

app.use('/', index);
app.use('/a', index);
app.use('/b', index);
app.use('/c', index);

app.listen(3000, () => {
  console.log('Put following records into /etc/hosts:');
  console.log('');
  console.log('127.0.0.1       host1');
  console.log('127.0.0.1       host2');
  console.log('127.0.0.1       host3');
  console.log('');
  console.log('');
  console.log('Open http://host1:3000');
});

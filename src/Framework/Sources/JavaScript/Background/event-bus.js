'use strict';

var EventEmitter = require('events');

var eventBus = new EventEmitter();

// We are adding quite a few listeners so let's increase listeners limit. Otherwise we get following warning:
// (node) warning: possible EventEmitter memory leak detected. 11 listeners added. Use emitter.setMaxListeners() to increase limit.
eventBus.setMaxListeners(1024);

module.exports = eventBus;

'use strict';

const amqp = require('amqplib');
let libR = {};
libR.conn = null;
libR.channel = {};

module.exports = {
    __init,
    __addToQueue,
    __fetchFromQueue,
    __confirmAck
}

function __init(config) {
    return new Promise((resolve, reject) => {
        if(!libR.conn) {
            amqp.connect(config.host)
            .then(conn => {
                libR.conn = conn;
                return conn.createChannel();
            }).then(ch => {
                libR.channel[config.queueName] = ch;
                resolve(libR.conn);
            }).catch(err => {
                console.error('connection failed with rabbbitmq:', err.message);
                reject(err);
            });
        } else {
            resolve(libR.conn);
        }
    });
}

function __addToQueue(config, message) {
    return new Promise((resolve, reject) => {
        if(libR.conn && libR.channel[config.queueName]) {
            libR.channel[config.queueName].assertQueue(config.queueName, config.options).then(function(ok) {
                return libR.channel[config.queueName].sendToQueue(config.queueName, new Buffer(JSON.stringify(message)), {persistent: true});
            }).then(ok => {
                resolve('success');
            }).catch(err => {
                console.log('Sending to queue failed', err);
                reject(err);
            });
        } else {
            reject(new Error('Rabbitmq connection or channel not found'));
        }
    });
}

function __fetchFromQueue(config, callback) {
    if(libR.conn && libR.channel[config.queueName]) {
        libR.channel[config.queueName].assertQueue(config.queueName, config.options)
        .then(function(ok) {
            return ok;
        }).then(ok => {
            return libR.channel[config.queueName].consume(config.queueName, (message) => {
                callback(null, message);
            }, {noAck: false});
        })
        .catch(err => {
            console.log('Receiving from queue failed', err);
            callback(err);
        });
    } else {
        callback(new Error('Rabbitmq connection or channel not found'));
    }
}

function __confirmAck(queueName, message) {
    if(libR.conn && libR.channel[queueName]) {
        libR.channel[queueName].ack(message);
    } else {
        throw new Error('Rabbitmq connection or channel not found');
    }
}

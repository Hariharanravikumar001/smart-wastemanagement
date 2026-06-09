"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const data = JSON.stringify({
    email: 'auth2@test.com',
    password: 'password123'
});
const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};
console.log('⏳ Sending login request to:', `${options.hostname}:${options.port}${options.path}`);
const req = http_1.default.request(options, res => {
    console.log(`📋 Status Code: ${res.statusCode}`);
    res.on('data', d => {
        process.stdout.write(d);
    });
});
req.on('error', error => {
    console.error('❌ Error:', error.message);
});
req.write(data);
req.end();

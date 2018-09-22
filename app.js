'use strict';

const express = require('express');
const childProcess = require('child_process');
const nodeimu = require('nodeimu');


const PORT = 5000;
let IMU = new nodeimu.IMU();
let app = express();

function cToF(tempC) {
	return 32 + (tempC * 1.8);
}

function getCPUTemp() {
	return new Promise(resolve => {
		let temp = childProcess.spawn('cat', ['/sys/class/thermal/thermal_zone0/temp']);
		temp.stdout.on('data', data => {
			let tempC = data / 1000;
			resolve(cToF(tempC));
		});
	});
}



getCPUTemp().then(console.log);


app.listen(PORT);
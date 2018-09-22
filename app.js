'use strict';

const express = require('express');
const childProcess = require('child_process');
const BB = require('bluebird');
const nodeimu = require('node-sense-hat').Imu;
const GPIO = require('onoff').Gpio;



const PORT = 6000;
const PIN = 21;
const HIGH = 1;
const LOW = 0;


let IMU = new nodeimu.IMU();
let light = new GPIO(PIN, 'out');
let app = express();

function cToF(tempC) {
	return 32 + (tempC * 1.8);
}

function getCPUTemp() {
	return new BB(resolve => {
		let temp = childProcess.spawn('cat', ['/sys/class/thermal/thermal_zone0/temp']);
		temp.stdout.on('data', data => {
			resolve(data / 1000);
		});
	});
}

function getIMUData() {
	return new BB((resolve, reject) => {
		IMU.getValue((err, data) => {
			if(err !== null) {
				console.error(err);
				return reject(err);
			}
			resolve(data);
		});
	});
}

function lightsOn() {
	return light.writeSync(HIGH);
}

function lightsOff() {
	return light.writeSync(LOW);
}

function lightsToggle() {
	if(light.readSync() === LOW) {
		return lightsOn();
	} else {
		return lightsOff();
	}
}

function getIMUTemp() {
	return getIMUData().then(res => res.temperature);
}

function getIMUHumidity() {
	return getIMUData().then(res => res.humidity);
}

function getAmbientHumidity() {
	return getIMUHumidity();
}

function getAmbientTemp() {
	return BB.all([getIMUTemp(), getCPUTemp()]).spread((ambientTemp, cpuTemp) => {
		let modifier = (cpuTemp - ambientTemp) / 1.886;
		let tempCalibrated = ambientTemp - modifier;
		return cToF(tempCalibrated);
	});
}

app.get('/temperature', (req, res) => {
	getAmbientTemp().then(temp => res.json(temp));
});

app.get('/humidity', (req, res) => {
	getAmbientHumidity().then(hum => res.json(hum));
});

app.get('/on', (req, res) => {
	lightsOn();
	res.json('ON');
});

app.get('/off', (req, res) => {
	lightsOff();
	res.json('OFF');
});

app.get('/toggle', (req, res) => {
	lightsToggle();
	light.readSync() === 0
		? res.json('OFF')
		: res.json('ON');
});



setTimeout(() => {
	process.exit(1);
},60000);


app.listen(PORT, '127.0.0.1');

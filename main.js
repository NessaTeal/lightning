var minLength = 3;
var maxLength = 8;
var timestep = 1000 / 60;
var lightningSpawnPerPeriod = 5;
var lightningConstantLifetime = 100;
var lightningVariableLifetime = 50;
var lightningSegmentsPerUpdate = 10;
var standardDeviation = Math.PI / 7;
var branchingChance = 0.1;
var branchingAngleMean = Math.PI / 6;
var branchingSurvivabilityModifier = 0.5;

function getGaussianRandom(mean, standardDeviation) {
	var v1, v2, s;
	do {
		v1 = 2 * Math.random() - 1;
		v2 = 2 * Math.random() - 1;
		s = v1 * v1 + v2 * v2;
	} while (s >= 1 || s == 0);

	s = Math.sqrt((-2 * Math.log(s)) / s);

	return mean + (v1 * s * standardDeviation);
}

class Point {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	rotate(rotationPoint, angle) {
		var newX = rotationPoint.x + (this.x - rotationPoint.x) * Math.cos(angle) + (this.y - rotationPoint.y) * Math.sin(angle);
		var newY = rotationPoint.y - (this.x - rotationPoint.x) * Math.sin(angle) + (this.y - rotationPoint.y) * Math.cos(angle);
		this.x = newX;
		this.y = newY;
	}

	add(dx, dy) {
		return new Point(this.x + dx, this.y + dy);
	}

	findAngle(endPoint) {
		return Math.atan2(endPoint.y - this.y, endPoint.x - this.x);
	}

	distanceTo(anotherPoint) {
		return Math.sqrt((this.x - anotherPoint.x) ** 2 + (this.y - anotherPoint.y) ** 2);
	}
}

class Segment {
	constructor(from, to) {
		this.from = from;
		this.to = to;
	}

	draw(ctx) {
		ctx.moveTo(this.from.x, this.from.y);
		ctx.lineTo(this.to.x, this.to.y);
	}
}

class Lightning {
	constructor(startPoint, meanAngle, surviveProbability) {
		this.branches = [];
		this.segments = [];
		this.meanAngle = meanAngle;
		this.previousPoint = startPoint;
		this.surviveProbability = surviveProbability;
		this.alive = true;
	}

	update() {
		this.branches.forEach(branch => branch.update());

		if (!this.alive) {
			return;
		}

		if (Math.random() > this.surviveProbability) {
			this.alive = false;
			return;
		}

		for (var i = 0; i < lightningSegmentsPerUpdate; i++) {
			var randomAngle = getGaussianRandom(this.meanAngle, standardDeviation);
			var nextPoint = this.previousPoint.add(minLength + Math.random() * (maxLength - minLength), 0);
			nextPoint.rotate(this.previousPoint, randomAngle);
			this.segments.push(new Segment(this.previousPoint, nextPoint));

			if (Math.random() <= branchingChance) {
				this.branches.push(new Lightning(this.previousPoint, this.meanAngle - branchingAngleMean, this.surviveProbability * branchingSurvivabilityModifier));
			}

			if (Math.random() <= branchingChance) {
				this.branches.push(new Lightning(this.previousPoint, this.meanAngle + branchingAngleMean, this.surviveProbability * branchingSurvivabilityModifier));
			}

			this.previousPoint = nextPoint;
		}
	}

	drawBranch(ctx) {
		this.segments.forEach(segment => segment.draw(ctx));
	}

	draw(ctx) {
		ctx.beginPath();

		this.branches.forEach(branch => branch.drawBranch(ctx));

		this.drawBranch(ctx);

		ctx.stroke();
	}
}

function start() {
	var realCanvas = $("#realCanvas")[0];
	var realCtx = realCanvas.getContext("2d");

	var bufferCanvas = $("#bufferCanvas")[0];
	var bufferCtx = bufferCanvas.getContext("2d");
	bufferCtx.strokeStyle = "#FFFFFF";
	bufferCtx.lineWidth = 1;
	var startPoint = new Point(500, 500);
	var lightnings = [];

	function update(delta) {
		lightnings.forEach(lightning => lightning.update());
	}

	function draw() {
		bufferCtx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);
		lightnings.forEach(function(lightning) {
			lightning.draw(bufferCtx);
		})

		realCtx.clearRect(0, 0, realCanvas.width, realCanvas.height);
		realCtx.drawImage(bufferCanvas, 0, 0);
	}

	var delta = 0;
	var lastFrameTimeMs = 0;
	var despawnTimes = [];

	function spawnLightning(timestamp) {
		var distantPoint = startPoint.add(25, 0);
		var angle = Math.PI * Math.random() * 2;
		distantPoint.rotate(startPoint, angle);
		var lightning = new Lightning(distantPoint, angle, 1);
		lightnings.push(lightning);
		despawnTimes.push(timestamp + lightningConstantLifetime + lightningVariableLifetime * Math.random());
	}

	function mainLoop(timestamp) {
		delta += timestamp - lastFrameTimeMs;
		lastFrameTimeMs = timestamp;

		if (delta / timestep >= 25) {
			delta = 25;
		}

		var despawns = despawnTimes.filter(time => time <= timestamp);
		despawnTimes = despawnTimes.splice(despawns.length)
		despawns.forEach(() => lightnings.shift());

		while (delta >= timestep) {
			for (var i = 0; i < lightningSpawnPerPeriod; i++) {
				spawnLightning(timestamp);
			}
			update(timestep);
			delta -= timestep;
		}
		draw();
		requestAnimationFrame(mainLoop);
	}

	requestAnimationFrame(mainLoop);
}

$(document).ready(start);

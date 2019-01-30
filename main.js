var width = 1;
var minLength = 3;
var maxLength = 8;
var velocity = 50;
var timestep = 1000 / 60;
var lightningSpawnPeriod = 62.5;
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
		this.x = rotationPoint.x + (this.x - rotationPoint.x) * Math.cos(angle) - (this.y - rotationPoint.y) * Math.sin(angle);
		this.y = rotationPoint.y + (this.x - rotationPoint.x) * Math.sin(angle) + (this.y - rotationPoint.y) * Math.cos(angle);
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

class Rectangle {
	constructor(startingPoint, width, length) {
		this.p1 = startingPoint.add(0, width / 2);
		this.p2 = startingPoint.add(length, width / 2);
		this.p3 = startingPoint.add(length, -width / 2);
		this.p4 = startingPoint.add(0, -width / 2);
	}

	rotate(rotationPoint, angle) {
		this.p1.rotate(rotationPoint, angle);
		this.p2.rotate(rotationPoint, angle);
		this.p3.rotate(rotationPoint, angle);
		this.p4.rotate(rotationPoint, angle);
	}

	draw(ctx) {
		ctx.beginPath();
		ctx.moveTo(this.p1.x, this.p1.y);
		ctx.lineTo(this.p2.x, this.p2.y);
		ctx.lineTo(this.p3.x, this.p3.y);
		ctx.lineTo(this.p4.x, this.p4.y);
		ctx.lineTo(this.p1.x, this.p1.y);
		ctx.fill();
	}

	getNewStartingPoint() {
		return new Point((this.p2.x + this.p3.x) / 2, (this.p2.y + this.p3.y) / 2);
	}
}

class Lightning {
	constructor(startPoint, meanAngle, surviveProbability) {
		this.pieces = [];
		this.branches = [];
		this.meanAngle = meanAngle;
		this.previousPoint = startPoint;
		this.surviveProbability = surviveProbability;
		this.alive = true;
	}

	update() {
		this.branches.forEach(function(branch) {
			branch.update();
		});
		
		if (!this.alive) {
			return;
		}
		
		if (Math.random() > this.surviveProbability) {
			this.alive = false;
			return;
		}
		
		for (var i = 0; i < lightningSegmentsPerUpdate; i++) {
			var randomAngle = getGaussianRandom(this.meanAngle, standardDeviation);
			var newRectangle = new Rectangle(this.previousPoint, width, minLength + Math.random() * (maxLength - minLength));
			newRectangle.rotate(this.previousPoint, randomAngle);
			this.pieces.push(newRectangle);

			if (Math.random() <= branchingChance) {
				this.branches.push(new Lightning(this.previousPoint, this.meanAngle - branchingAngleMean, this.surviveProbability * branchingSurvivabilityModifier));
			}

			if (Math.random() <= branchingChance) {
				this.branches.push(new Lightning(this.previousPoint, this.meanAngle + branchingAngleMean, this.surviveProbability * branchingSurvivabilityModifier));
			}

			this.previousPoint = newRectangle.getNewStartingPoint();
		}
	}

	draw(ctx) {
		this.branches.forEach(function(branch) {
			branch.draw(ctx);
		});
		
		this.pieces.forEach(function(piece) {
			piece.draw(ctx)
		});
	}
}

function start() {
	var realCanvas = $("#realCanvas")[0];
	var realCtx = realCanvas.getContext("2d");

	var bufferCanvas = $("#bufferCanvas")[0];
	var bufferCtx = bufferCanvas.getContext("2d");
	bufferCtx.fillStyle = "#FFFFFF"
	var startPoint = new Point(0, 250);
	var endPoint = new Point(1000, 250);
	var lightnings = [];

	function update(delta) {
		lightnings.forEach(function(lightning) {
			lightning.update();
		})
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

	function mainLoop(timestamp) {
		delta += timestamp - lastFrameTimeMs;
		lastFrameTimeMs = timestamp;
		while (delta >= timestep) {
			update(timestep);
			delta -= timestep;
		}
		draw();
		requestAnimationFrame(mainLoop);
	}

	function lightningDespawn() {
		lightnings.shift();
	}

	function lightningSpawnFunction() {
		lightnings.push(new Lightning(startPoint, 0, 1));
		setTimeout(lightningDespawn, lightningVariableLifetime * Math.random() + lightningConstantLifetime);
	}

	setInterval(lightningSpawnFunction, lightningSpawnPeriod);
	requestAnimationFrame(mainLoop);
}

$(document).ready(start);

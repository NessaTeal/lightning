var minLength = 3;
var maxLength = 5;
var timestep = 1000 / 60;
var lightningSpawnPerPeriod = 1;
var segmentConstantLifetime = 100;
var lightningSegmentsPerUpdate = 2;
var standardDeviation = Math.PI / 7;
var branchingChance = 0.1;
var branchingAngleMean = Math.PI / 6;
var branchingLengthModifier = 0.2;
var particleConstantSpeed = 5;
var particleVariableSpeed = 1;
var particleAcceleration = 0.1;
var particleConstantLifetime = 100;
var particleVariableLifetime = 300;
var particleChance = 0.25;

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
		this.alive = true;
		this.time = segmentConstantLifetime;
	}
	
	update() {
		if (!this.alive) {
			return;
		}
		
		this.time -= timestep;
		
		if (this.time <= 0) {
			this.alive = false;
		}
	}

	draw(ctx) {
		ctx.moveTo(this.from.x, this.from.y);
		ctx.lineTo(this.to.x, this.to.y);
	}
}

class Particle {
	constructor(position, angle) {
		this.position = position;
		this.angle = angle;
		this.speed = particleConstantSpeed + Math.random() * particleVariableSpeed;
		this.time = particleConstantLifetime + particleVariableLifetime * Math.random();
		this.alive = true;
	}

	draw(ctx) {
		ctx.fillStyle = "#FFFFFF";
		ctx.beginPath();
		ctx.arc(this.position.x, this.position.y, 1, 0, Math.PI * 2);
		ctx.fill();
	}

	update() {
		if (!this.alive) {
			return;
		}
		
		this.time -= timestep;
		
		if (this.time <= 0) {
			this.alive = false;
			return;
		}
		
		this.position = this.position.add(this.speed * Math.cos(this.angle), - this.speed * Math.sin(this.angle));
		this.speed -= particleAcceleration;
	}
}

class Lightning {
	constructor(startPoint, targetPoint) {
		this.branches = [];
		this.segments = [];
		this.previousPoint = startPoint;
		this.targetPoint = targetPoint;
		this.reachedTarget = false;
		this.segmentSpawnBuffer = 0;
		this.alive = true;
	}

	update() {
		if (!this.alive) {
			return;
		}
		
		if (this.reachedTarget &&
			this.segments.length === 0 &&
			this.branches.length === 0) {
			this.alive = false;
			return;
		}
			
		this.branches = this.branches.filter(branch => branch.alive);
		this.branches.forEach(branch => branch.update());
		this.segments = this.segments.filter(segment => segment.alive);
		this.segments.forEach(segment => segment.update());
		
		if (this.reachedTarget) {
			return;
		}

		this.segmentSpawnBuffer += lightningSegmentsPerUpdate;

		while (this.segmentSpawnBuffer >= 1) {
			this.segmentSpawnBuffer -= 1;
			var distanceToTarget = Math.sqrt((this.targetPoint.y - this.previousPoint.y) ** 2 + (this.targetPoint.x - this.previousPoint.x) ** 2);
			
			if (distanceToTarget <= maxLength) {
				this.segments.push(new Segment(this.previousPoint, this.targetPoint));
				this.reachedTarget = true;
				break;
			}
			
			var angleToTarget = -Math.atan2(this.targetPoint.y - this.previousPoint.y, this.targetPoint.x - this.previousPoint.x);
			var randomAngle = getGaussianRandom(angleToTarget, standardDeviation);
			var nextPoint = this.previousPoint.add(minLength + Math.random() * (maxLength - minLength), 0);
			nextPoint.rotate(this.previousPoint, randomAngle);
			this.segments.push(new Segment(this.previousPoint, nextPoint));

			if (Math.random() <= particleChance) {
				objects.push(new Particle(nextPoint, randomAngle));
			}
			
			if (Math.random() <= branchingChance) {
				var branchingTargetPoint = this.previousPoint.add(distanceToTarget * branchingLengthModifier, 0);
				branchingTargetPoint.rotate(this.previousPoint, angleToTarget + branchingAngleMean);
				this.branches.push(new Lightning(this.previousPoint, branchingTargetPoint));
			}

			if (Math.random() <= branchingChance) {
				var branchingTargetPoint = this.previousPoint.add(distanceToTarget * branchingLengthModifier, 0);
				branchingTargetPoint.rotate(this.previousPoint, angleToTarget - branchingAngleMean);
				this.branches.push(new Lightning(this.previousPoint, branchingTargetPoint));
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

var objects = [];
var delta = 0;
var lastFrameTimeMs = 0;
var spawnBuffer = 0;
var timeForLastFrame = 0;

function start() {
	var realCanvas = $("#realCanvas")[0];
	var realCtx = realCanvas.getContext("2d");

	var bufferCanvas = $("#bufferCanvas")[0];
	var bufferCtx = bufferCanvas.getContext("2d");
	bufferCtx.strokeStyle = "#FFFFFF";
	bufferCtx.lineWidth = 1;
	var startPoint = new Point(500, 500);
	var lightnings = [];

	function update() {
		objects.forEach(object => object.update());
	}

	function draw() {
		bufferCtx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);
		objects.forEach(function(object) {
			object.draw(bufferCtx);
		})
		bufferCtx.fillText(Math.round(1000 / timeForLastFrame), 2, 10);
		realCtx.clearRect(0, 0, realCanvas.width, realCanvas.height);
		realCtx.drawImage(bufferCanvas, 0, 0);
	}
	
	realCanvas.onclick = function(event) {
		var x = event.pageX - this.offsetLeft;
		var y = event.pageY - this.offsetTop;
		var targetPoint = new Point(x, y);
		var lightning = new Lightning(startPoint, targetPoint);
		objects.push(lightning);
	}

	function spawnLightning() {
		var targetPoint = startPoint.add(300, 0);
		var angle = Math.PI * Math.random() * 2;
		targetPoint.rotate(startPoint, angle);
		var lightning = new Lightning(startPoint, targetPoint);
		objects.push(lightning);
	}

	function mainLoop(timestamp) {
		timeForLastFrame = timestamp - lastFrameTimeMs;
		delta += timestamp - lastFrameTimeMs;
		lastFrameTimeMs = timestamp;

		if (delta / timestep >= 25) {
			delta = 0;
		}

		objects = objects.filter(object => object.alive);

		while (delta >= timestep) {
			spawnBuffer += lightningSpawnPerPeriod;

			while (spawnBuffer >= 1) {
				spawnBuffer -= 1;
				spawnLightning();
			}

			update();
			delta -= timestep;
		}
		draw();
		requestAnimationFrame(mainLoop);
	}

	requestAnimationFrame(mainLoop);
}

$(document).ready(start);

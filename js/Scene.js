export default class Scene {
	mpos = []; // Move object position
	objArr = Array(); // Scene objects array
	collidedObjectsIdList = []; // Collisions list
	#workerThreads = []; // Threads workers
	objIdToOrbit = 0; // The ID of the object around which the new object will orbit

	constructor() {
		this.gpu = new GPU();
		// The distance between two points
		this.gpu.addFunction(dist);
		// Gravitation function
		this.gpu.addFunction(gravity_func);
		// Gipotenuse
		this.gpu.addFunction(function gipot(a,b){return Math.sqrt(a*a + b*b) });
		// Collision function
		// this.gpu.addFunction(gpuCollision);

		// Compute function
		this.computeVelocities = this.gpu.createKernel(function(arr, len, timeSpeed, g, gravitMode) {
			const obj1Id = this.thread.x;
			const obj1Pos = [arr[obj1Id * this.constants.objLen], arr[obj1Id * this.constants.objLen + 1]];
			const obj1Vel = [0.0, 0.0];
			const obj1Mass = arr[obj1Id * this.constants.objLen + 2];
			const obj1Lock = arr[obj1Id * this.constants.objLen + 3];

			for(let obj2Id = 0; obj2Id < len; obj2Id++){
				if (obj2Id !== obj1Id) {
					const obj2Pos = [arr[obj2Id * this.constants.objLen], arr[obj2Id * this.constants.objLen + 1]];
					// const obj2Vel = [0.0, 0.0];
					const obj2Mass = arr[obj2Id * this.constants.objLen + 2];
					// const obj2Lock = arr[obj2Id * this.constants.objLen + 3];

					// const radiusSum = Math.sqrt(Math.abs(obj1Mass)) + Math.sqrt(Math.abs(obj2Mass));
					const D = dist(obj1Pos[0],obj1Pos[1], obj2Pos[0],obj2Pos[1]);
					const sin = (obj2Pos[1] - obj1Pos[1])/D; // Sin
					const cos = (obj2Pos[0] - obj1Pos[0])/D; // Cos
					const velocity = gravity_func(sin, cos, D, gravitMode, obj2Mass, obj1Mass, timeSpeed, g);
					if (obj1Lock === 0){
						obj1Vel[0] += velocity[0];
						obj1Vel[1] += velocity[1];	
					}
					// if (obj2Lock === 0){
					// 	obj2Vel[0] += velocity[2];
					// 	obj2Vel[1] += velocity[3];	
					// }

					// const newD = dist(obj1Pos[0] + obj1Vel[0],obj1Pos[1] + obj1Vel[1], obj2Pos[0] + obj2Vel[0],obj2Pos[1] + obj2Vel[1]);
					// if (newD - radiusSum <= 0) {
					// 	collided = true;
					// }
				}
			}

			return [obj1Vel[0], obj1Vel[1]];
		}, {dynamicOutput: true, dynamicArguments: true, constants: {objLen: 4}})
			.setLoopMaxIterations(10000000);

	}
	gpuComputeVelocities = function(
		objectsArray = this.objArr, 
		callback = this.gpuAfterPhysics,
		interactMode = +ui.interactMode.state, 
		timeSpeed = ui.timeSpeed.state, 
		g = ui.g.state, 
		gravitMode = +ui.gravitationMode.state, 
		collisionType = +ui.collisionMode.state
	){
		if (objectsArray.length > 1){
			if (ui.collisionMode.state != 2){
				const collidedPairs = this.collisionCeilAlgorithm(objectsArray);

				for (let collidedPair of collidedPairs){
					const [object1Id, object2Id] = collidedPair;
					const obj1 = objectsArray[object1Id];
					const obj2 = objectsArray[object2Id];

					if (obj2.lock === true && obj1.lock === true) continue;

					// Collision
					const radiusSum = obj1.r + obj2.r;

					if (Math.abs(obj1.x - obj2.x) <= radiusSum && Math.abs(obj1.y - obj2.y) <= radiusSum){
						const D = dist(obj1.x, obj1.y, obj2.x, obj2.y); // The distance between objects
						if (D - radiusSum <= 0){
							let cos = (obj2.x - obj1.x)/D;
							let sin = (obj2.y - obj1.y)/D;
							// Colliding
							const mS = obj1.m + obj2.m; // Both objects mass sum
							const rD = radiusSum - D; // Total move
							const objAMov = obj1.lock ? 0 : obj2.lock ? rD : rD * (obj1.m / mS); // Object A move
							const objBMov = obj2.lock ? 0 : rD - objAMov; // Object B move
							obj1.x -= objAMov * cos; obj1.y -= objAMov * sin;
							obj2.x += objBMov * cos; obj2.y += objBMov * sin;
						}
					}	
				}
			}

			const prepairedArr = objectsArray.map(obj => [obj.x, obj.y, obj.m, obj.lock]);
			this.computeVelocities.setOutput([objectsArray.length]);
			const newVelosities = this.computeVelocities(prepairedArr, objectsArray.length, timeSpeed, g, gravitMode);
			// After physics
			let collidedObjectsIDs = [];
			for (let obj1Id = objectsArray.length; obj1Id--;){
				const obj1 = objectsArray[obj1Id];
				obj1.vx += newVelosities[obj1Id][0];
				obj1.vy += newVelosities[obj1Id][1];
			}
			
			let deleteObjectList = []; // Array of objects will be deleted after collision "merge"

			this.addSelfVectors(objectsArray, timeSpeed);
			if (ui.collisionMode.state != 2){
				deleteObjectList = this.collisionHandler(objectsArray, collisionType, timeSpeed);

			}

			this.deleteObject(deleteObjectList, objectsArray); // Delete objects by deleteObjectsList

		}
		callback && callback(objectsArray, this.collidedObjectsIdList, interactMode, collisionType, timeSpeed, 'singleThread');
		this.collidedObjectsIdList = [];

	}
	physicsCalculate = function (
		objectsArray = this.objArr, 
		callback = this.afterPhysics,
		interactMode = +ui.interactMode.state, 
		timeSpeed = ui.timeSpeed.state, 
		g = ui.g.state, 
		gravitMode = ui.gravitationMode.state, 
		collisionType = +ui.collisionMode.state
	){
		// console.log('Calculate begin:');
		// console.log(objectsArray.reduce((vel2, obj) => [vel2[0] + obj.vx, vel2[1] + obj.vy], [0, 0]));
		(function colliding(){
			for (let i = 1; i--;){
				for (let object1Id in objectsArray){
					const obj1 = objectsArray[object1Id];
					for (let object2Id = object1Id; object2Id--;){
						const obj2 = objectsArray[object2Id];

						if (obj2.lock === true && obj1.lock === true) continue;

						// Collision
						const radiusSum = obj1.r + obj2.r;

						if (Math.abs(obj1.x - obj2.x) <= radiusSum && Math.abs(obj1.y - obj2.y) <= radiusSum){
							const D = dist(obj1.x, obj1.y, obj2.x, obj2.y); // The distance between objects
							if (D - radiusSum <= 0){
								let cos = (obj2.x - obj1.x)/D;
								let sin = (obj2.y - obj1.y)/D;
								// Colliding
								const mS = obj1.m + obj2.m; // Both objects mass sum
								const rD = radiusSum - D; // Total move
								const objAMov = obj1.lock ? 0 : obj2.lock ? rD : rD * (obj1.m / mS); // Object A move
								const objBMov = obj2.lock ? 0 : rD - objAMov; // Object B move
								obj1.x -= objAMov * cos; obj1.y -= objAMov * sin;
								obj2.x += objBMov * cos; obj2.y += objBMov * sin;
							}
						}
					}
				}
			}
		})();
		// Physics calculating
		for (let object1Id = objectsArray.length; object1Id--;){
			calculate({
				objectsArray: objectsArray,
				object1Id: +object1Id,
				interactMode: interactMode,
				gravitMode: +gravitMode,
				g: g,
				timeSpeed: timeSpeed,
				collisionType: collisionType,
				collidedObjectsIdList: this.collidedObjectsIdList
			});
		}
		callback && callback(objectsArray, this.collidedObjectsIdList, interactMode, collisionType, timeSpeed, 'singleThread');
		this.collidedObjectsIdList = [];
	}

	// Runs after finish computing physics
	afterPhysics = (objArr, collidedObjectsIdList, interactMode, collisionType, timeSpeed) => {
		// After physics
		// Add velocities
		this.addSelfVectors(objArr, timeSpeed);
		// Set values after collisions
		let deleteObjectList = [];
		deleteObjectList = this.collisionHandler(objArr, collisionType);
		// for (let collidedObjectsId of collidedObjectsIdList){ // collidedObjectsId max length is 2
		// 	deleteObjectList.push(...this.collision(objArr, collisionType, ...collidedObjectsId));
		// }
		this.deleteObject(deleteObjectList, objArr);

	}

	makeObjPosMatrix(objectsArray){
		const positionMatrix = {};
		const seilSize = 31.6227766016*2;
		for (let objId = objectsArray.length; objId --;){
			let obj = objectsArray[objId];
			const posX = Math.floor(obj.x / seilSize);
			const posY = Math.floor(obj.y / seilSize);
			const strPos = posX.toString() + '|' + posY.toString();

			if (positionMatrix[strPos] === undefined) positionMatrix[strPos] = [];
			positionMatrix[strPos].push(objId);
		}
		return positionMatrix;
	}


	collisionCeilAlgorithm(objectsArray){
		const collidedPairs = [];
		let posMatrix = this.makeObjPosMatrix(objectsArray);
		for (let cellPos in posMatrix){
			const [x, y] = cellPos.split("|").map(n => +n);
			const iterObjs = posMatrix[cellPos];
			const enumObjs = [];

			const cl1 = (x + 1) + "|" + y; // Right ceil
			const cl2 = x + "|" + (y + 1); // Bottom ceil
			const cl3 = (x + 1) + "|" + (y + 1); // Right bottom ceil
			const cl4 = (x - 1) + "|" + (y + 1); // Left bottom ceil

			if (posMatrix[cl1]) enumObjs.push(...posMatrix[cl1]); // ░░░░░░
			if (posMatrix[cl2]) enumObjs.push(...posMatrix[cl2]); // ░░██▓▓
			if (posMatrix[cl3]) enumObjs.push(...posMatrix[cl3]); // ▓▓▓▓▓▓ 
			if (posMatrix[cl4]) enumObjs.push(...posMatrix[cl4]);

			for (let i = iterObjs.length; i--;){
				const obj1Id = iterObjs[i];
				const obj1 = objectsArray[obj1Id];
				for (let j = enumObjs.length; j--;){
					const obj2Id = enumObjs[j];
					checkCollision(obj1Id, obj2Id);
				}
				for (let j = i; j--;){
					const obj2Id = iterObjs[j];
					checkCollision(obj1Id, obj2Id);
				}
			}
		}
		// Check collision function
		function checkCollision(obj1Id, obj2Id){
			const obj1 = objectsArray[obj1Id];
			const obj2 = objectsArray[obj2Id];
			if (!(obj2.lock === true && obj1.lock === true)) {
				// Collision
				const radiusSum = obj1.r + obj2.r;

				if (Math.abs(obj1.x - obj2.x) <= radiusSum && Math.abs(obj1.y - obj2.y) <= radiusSum){
					const D = dist(obj1.x, obj1.y, obj2.x, obj2.y); // The distance between objects
					if (D - radiusSum <= 0){
						collidedPairs.push([obj1Id, obj2Id]);
					}
				}
			}
		}
		return collidedPairs;
	}

	collisionHandler(objectsArray, collisionType){
		const objectsToDelete = [];
		const collidedPairs = this.collisionCeilAlgorithm(objectsArray);

		for (let collidedPairId = collidedPairs.length; collidedPairId--;){
			const collidedPair = collidedPairs[collidedPairId];
			objectsToDelete.push(...this.collision(objectsArray, collisionType, ...collidedPair));
		}
		for (let objId = objectsArray.length; objId--;){
			let objA = objectsArray[objId];
			if (objA.collided){
				if (objA.lock){ // If object locked
					objA.vx = 0;
					objA.vy = 0;
				} else {// If object not locked
					objA.x += objA.vx*ui.timeSpeed.state;
					objA.y += objA.vy*ui.timeSpeed.state;
				}
				delete objA.collided;			
			}
		}
		return objectsToDelete;
	}
	// Collision handler
	collision(objArr, collisionType, obj1Id, obj2Id){
		let [objA, objB] = [ objArr[obj1Id], objArr[obj2Id] ];
		let deleteObjectList = [];

		if (collisionType === 0){ // Merge
			if (objB.m + objA.m === 0){ // Anigilate
				deleteObjectList.push(obj1Id, obj2Id);
				if ( [obj1Id, obj2Id].includes(+this.camera.Target) && objArr === this.objArr ) this.camera.setTarget();
				return deleteObjectList;
			}

			let mixedColor = this.mixColors(objA.color, objB.color, objA.m, objB.m);

			let obj = objB, delObj = objA;
			let objToDelId = obj1Id;
			let alivedObjId = obj2Id;

			// Swap objects if
			if ((delObj.m > obj.m && objA.lock === objB.lock) || (objA.lock !== objB.lock && objA.lock)) {
				obj = objA; delObj = objB;
				objToDelId = obj2Id;
				alivedObjId = obj1Id;
			}
			// Center of mass point
			const movKff = obj.lock !== delObj.lock ? 0 : delObj.m / (objA.m + objB.m);
			obj.x += (delObj.x - obj.x) * movKff;
			obj.y += (delObj.y - obj.y) * movKff;
			// New velocity
			obj.vx = (objA.m*objA.vx+objB.m*objB.vx)/(objA.m+objB.m);// Формула абсолютно-неупругого столкновения
			obj.vy = (objA.m*objA.vy+objB.m*objB.vy)/(objA.m+objB.m);// Формула абсолютно-неупругого столкновения

			obj.m = objA.m + objB.m; // Set new mass to obj
			obj.r = Math.sqrt(Math.abs(obj.m));
			obj.color = mixedColor;
			// Change camera target
			if (objToDelId === this.camera.Target && objArr === this.objArr) this.camera.setTarget(alivedObjId);
			// Add collided object to deleteObjectList
			deleteObjectList.push(objToDelId);
		} else if (collisionType === 1){ // Repulsion
			let D = dist(objA.x, objA.y, objB.x, objB.y); // The distance between objects
			let cos = (objB.x - objA.x)/D;
			let sin = (objB.y - objA.y)/D;
			const radiusSum = objA.r + objB.r;

			D = dist(objA.x, objA.y, objB.x, objB.y); // The distance between objects
			let v1 = this.gipot(objA.vx, objA.vy); // Scallar velocity
			let v2 = this.gipot(objB.vx, objB.vy); // Scallar velocity
			let vcos1 = v1 == 0?0:objA.vx/v1; // cos vx 1
			let vsin1 = v1 == 0?0:objA.vy/v1; // sin vy 1
			let vcos2 = v2 == 0?0:objB.vx/v2; // cos vx 2
			let vsin2 = v2 == 0?0:objB.vy/v2; // sin vy 2
			let ag1 = Math.atan2(vsin1, vcos1);
			let ag2 = Math.atan2(vsin2, vcos2);

			cos = (objB.x - objA.x)/D;
			sin = (objB.y - objA.y)/D;
			let fi = Math.atan2(sin, cos);
			// Object A new velocity
			if (!objA.lock){
				const m1 = objB.lock ? 0 : objA.m;
				const m2 = objB.m;
				objA.vx = (( v1*Math.cos(ag1 - fi)*(m1-m2) + 2*m2*v2*Math.cos(ag2 - fi) ) / (m2+m1) ) * Math.cos(fi) + v1*Math.sin(ag1 - fi)*Math.cos(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
				objA.vy = (( v1*Math.cos(ag1 - fi)*(m1-m2) + 2*m2*v2*Math.cos(ag2 - fi) ) / (m2+m1) ) * Math.sin(fi) + v1*Math.sin(ag1 - fi)*Math.sin(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
			}
			// Object B new velocity
			if (!objB.lock){
				const m1 = objA.m;
				const m2 = objA.lock ? 0 : objB.m;
				objB.vx = (( v2*Math.cos(ag2 - fi)*(m2-m1) + 2*m1*v1*Math.cos(ag1 - fi) ) / (m1+m2) ) * Math.cos(fi) + v2*Math.sin(ag2 - fi)*Math.cos(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
				objB.vy = (( v2*Math.cos(ag2 - fi)*(m2-m1) + 2*m1*v1*Math.cos(ag1 - fi) ) / (m1+m2) ) * Math.sin(fi) + v2*Math.sin(ag2 - fi)*Math.sin(fi+Math.PI/2);// Формула абсолютно-упругого столкновения
			}

			objA.collided = objB.collided = true;

			// let cam = this.activCam;
			// cam.ctx2.globalAlpha = 1;
			// cam.ctx2.beginPath();
			// cam.ctx2.arc(...cam.crd2(objA.x, objA.y), 2, 0, 7);
			// cam.ctx2.fill();	

			// cam.ctx2.lineWidth = 2;
			// cam.ctx2.beginPath();
			// cam.ctx2.moveTo(...cam.crd2(objA.x, objA.y));
			// cam.ctx2.lineTo(...cam.crd2(objA.x - objA.vx * ui.timeSpeed.state, objA.y - objA.vy * ui.timeSpeed.state));
			// cam.ctx2.stroke();

			// Adding velocity
			// if (objA.lock){ // If object locked
			// 	objA.vx = 0;
			// 	objA.vy = 0;
			// } else {// If object not locked
			// 	objA.x += objA.vx*ui.timeSpeed.state;
			// 	objA.y += objA.vy*ui.timeSpeed.state;
			// }
			// if (objB.lock){ // If object locked
			// 	objB.vx = 0;
			// 	objB.vy = 0;
			// } else {// If object not locked
			// 	objB.x += objB.vx*ui.timeSpeed.state;
			// 	objB.y += objB.vy*ui.timeSpeed.state;
			// }

			// Colliding
			// let newD = dist(objA.x, objA.y, objB.x, objB.y); // The distance between objects
			// if (newD - radiusSum < 0){
			// 	const mS = objA.m + objB.m; // Both objects mass sum
			// 	const rD = radiusSum - newD; // Total move
			// 	const objAMov = objA.lock ? 0 : objB.lock ? rD : rD * (objB.m / mS); // Object A move
			// 	const objBMov = objB.lock ? 0 : rD - objAMov; // Object B move
			// 	objA.x -= objAMov * cos; objA.y -= objAMov * sin;
			// 	objB.x += objBMov * cos; objB.y += objBMov * sin;
			// 	// D = dist(objA.x, objA.y, objB.x, objB.y); // The distance between objects
			// 	// sin = (objB.y - objA.y)/D; // Sin
			// 	// cos = (objB.x - objA.x)/D; // Cos
			// 	// debugger;
			// }


			// // Colliding
			// const objARadius = Math.sqrt(Math.abs(objA.m)); // Object A radius
			// const objBRadius = objA.m === objB.m ? objARadius : Math.sqrt(Math.abs(objB.m)); // Object B radius
			// const rS = objARadius + objBRadius; // Both objects radiuses sum
			// const mS = objA.m + objB.m; // Both objects mass sum
			// let newD = dist(objA.x + objA.vx*ui.timeSpeed.state, objA.y + objA.vy*ui.timeSpeed.state, objB.x + objB.vx*ui.timeSpeed.state, objB.y + objB.vy*ui.timeSpeed.state); // The distance between objects with new position
			// if (newD - rS <= 0){
			// 	const rD = rS - D; // Total move
			// 	const objAMov = objA.lock ? 0 : objB.lock ? rD : rD * (objA.m / mS); // Object A move
			// 	const objBMov = objB.lock ? 0 : rD - objAMov; // Object B move
			// 	objA.x -= objAMov * cos; objA.y -= objAMov * sin;
			// 	objB.x += objBMov * cos; objB.y += objBMov * sin;
			// }
		} else if (collisionType === 2){ // None

		}
		return deleteObjectList;
	}
	// Add objects vectors to objects
	addSelfVectors(objArr, timeSpeed){
		// Add the vectors
		for (let objId = objArr.length; objId--;){
			let object = objArr[objId];
			// let can = this.activCam.ctx3;
			// can.beginPath();
			// can.fillStyle = object.color;
			// can.arc(...this.activCam.crd2(object.x, object.y), 2, 0, 7);
			// can.fill();	
			if (mov_obj !== objId){
				// Add vectors
				if (object.lock){ // If object locked
					object.vx = 0;
					object.vy = 0;
				} else {// If object not locked
					object.x += object.vx*timeSpeed;
					object.y += object.vy*timeSpeed;
					if (objArr === this.objArr && (object.vx || object.vy)) this.activCam.allowFrameRender = true;
				}
			} else {
				object.vx = object.vy = 0;
			}
		}
	}
	//Создание нового объекта
	addNewObject({
		x,
		y,
		screenX,
		screenY,
		vx,
		vy,
		mass,
		objLck = false,
		color,
		main_obj,
		objArr = this.objArr,
		circularOrbit = false,
		callback
	}){
		const newObjId = objArr.length; // The ID of a new object

		// If received a screen coordinates convert it to a world coordinates
		if (screenX !== undefined && screenY !== undefined){
			[x, y] = this.activCam.screenPix2(screenX, screenY);
		}

		if (circularOrbit && objArr[this.objIdToOrbit]) {
			[vx, vy] = this.forceToCircularOrbit(x, y, this.objIdToOrbit);
			if (!objArr[this.objIdToOrbit].lock){
				vx += objArr[this.objIdToOrbit].vx;
				vy += objArr[this.objIdToOrbit].vy;
			}
			// Circular orbit correction
			x += vx/2 * ui.timeSpeed.state;
			y += vy/2 * ui.timeSpeed.state;
		}

		// Add new object to objArr with parameters
		objArr[newObjId] = {
			x: x, // Position X
			y: y, // Position Y
			vx: vx, // Velocity X 
			vy: vy, // Velocity Y 
			m: mass, // Object mass
			r: Math.sqrt(Math.abs(mass)), // Object radius
			color: color, // Object color
			lock: objLck, // Object locked (boolean)
			trace: [], // Array of trace points (traces mode 2-3)
			main_obj: main_obj // Affects in interaction mode 1 (interact with only main objecgt)
		};
		// Run callback after an object have been created
		callback && callback(newObjId);
		// If object created return its ID, else return false
		return objArr[newObjId] ? newObjId : false;
	}
	//Удаление объекта
	deleteObject(objects, objArr = this.objArr, eachObjectCallback = this.delObjectCallback.bind(this)){
		let objectsToDelete;
		if (Array.isArray(objects)){
			objectsToDelete = objects; // Given objects ID's to delete
		} else {
			objectsToDelete = [objects]; // If given not an array
		}
		let deletedObjectsList = [];
		for (let objectId of objectsToDelete){
			// Change main object in child objects before delete
			for (let obj of objArr){
				if (obj.main_obj == objectId){
					obj.main_obj = objArr[objectId].main_obj;
				}
			}
			deletedObjectsList = deletedObjectsList.concat(objArr.splice(objectId, 1));
			eachObjectCallback && eachObjectCallback(objectId);
		}
		return deletedObjectsList;
	}
	delObjectCallback(objectId){
		this.camera.Target = getIdAfterArrChange([objectId], this.camera.Target);
		if (this.camera.Target === null) this.camera.setTarget();
		this.objIdToOrbit = getIdAfterArrChange([objectId], this.objIdToOrbit, this.objectSelect('biggest'));
		mov_obj = getIdAfterArrChange([objectId], mov_obj);

		this.activCam.allowFrameRender = true;
		this.show_obj_count(); // Set objects counter indicator
	}
	// Show number of objects
	show_obj_count(){
		document.querySelector('#object_count_value').innerHTML = this.objArr.length;
	}
	//Необходимая скорость для круговой орбиты
	forceToCircularOrbit(px, py, obj1Id){
		if (this.objArr[obj1Id]){
			const objToOrbMass = Math.abs(this.objArr[obj1Id].m);
			let R = dist(this.camera.screenPix(px, 'x'), this.camera.screenPix(py, 'y'), this.camera.screenPix(this.objArr[obj1Id].x, 'x'), this.camera.screenPix(this.objArr[obj1Id].y, 'y'))*this.camera.animZoom;
			let V = Math.sqrt((objToOrbMass*5)*(R)/ui.g.state);
			let a = this.objArr[obj1Id].x - px;
			let b = this.objArr[obj1Id].y - py;
			let sin = b/R, cos = a/R;
			let svx = -(sin/V)*objToOrbMass*5;
			let svy = (cos/V)*objToOrbMass*5;
			//if (this.objArr[obj1Id].main_obj){
			//	let object = this.objArr[obj1Id].main_obj;
			//	while (this.objArr[object].main_obj){
			//		svx -= this.objArr[object].vx;
			//		svx -= this.objArr[object].vy;
			//		object = this.objArr[object].main_obj;
			//	}
			//}
			if (ui.newObjCreateReverseOrbit.state){
				svx = -svx;
				svy = -svy;
			}
			return [svx, svy];		
		} else {
			return [0, 0];
		}
	}
	//Выбор объекта по функции
	objectSelect(mode = 'nearest', not){
		let sel = [Infinity, null, 0];
		// Last object in array
		if (mode == 'last_created'){
			sel[1] = this.objArr.length - 1;
		}
		// The nearest or the furthest object
		if (mode == 'nearest' || mode == 'furthest'){
			for (let i in this.objArr){
				if (i == not) continue;
				let r = dist(mouse.x, mouse.y, this.camera.crd(this.objArr[i].x, 'x'), this.camera.crd(this.objArr[i].y, 'y'));
				if (r < sel[0] && mode == 'nearest'){
					sel[0] = r;
					sel[1] = +i;
				} else 
				if (r > sel[2] && mode == 'furthest'){
					sel[2] = r;
					sel[1] = +i;
				}
			}
		}
		// The most bigger object
		if (mode == 'biggest'){
			for(let i in this.objArr){
				if (this.objArr[i].m > sel[2]){
					sel[2] = this.objArr[i].m;
					sel[1] = +i;
				}
			}
		}
		return sel[1];
	}
	// Get logariphmic value if value bigger than 1
	powerFunc(F){
		if (F > 1){ return Math.round(Math.pow(F, Math.pow(F, 3))*100)/100 } else { return F }
	}
	// Pythagorean theorem
	gipot(a,b){return Math.sqrt(a*a + b*b) }
	// Get random range
	getRandomArbitrary(min, max) {
		return Math.random() * (max - min) + min;
	}

	//Cмешивение Цветов===================================
	toHexInt(i){
		return parseInt(i, 16);
	}
	_mixColors(color1, color2, m1, m2){

		let color = "";
		/*
		 * Сначала считаем среднее по красному цвету - xx---- + yy----
		 * Затем по зеленому --xx-- + --yy--
		 * И по синему ----xx + ----yy
		 */
		for(let i = 0; i < color1.length; i += 2){
		    let partColor = Math.round((this.toHexInt(color1.slice(i, i+2))*m1 + this.toHexInt(color2.slice(i, i+2))*m2)/(m1+m2)).toString(16);

		    color += (partColor.length === 1 ? "0" + partColor : partColor);
		}
		return color;
	}

	mixColors(color1, color2, m1 = 50, m2 = 50){
		let c1 = color1[0] === "#" ? color1.slice(1) : color1;
		let c2 = color2[0] === "#" ? color2.slice(1) : color2;

		return "#" + this._mixColors(c1, c2, m1, m2);
	}

	randomColor() {
		let r = Math.floor(this.getRandomArbitrary(40, 255)),
			g = Math.floor(this.getRandomArbitrary(40, 255)),
			b = Math.floor(this.getRandomArbitrary(40, 255));

		r = r.toString(16); g = g.toString(16); b = b.toString(16);

		r = r.length < 2 ? '0'+r.toString(16) : r.toString(16);
		g = g.length < 2 ? '0'+g.toString(16) : g.toString(16);
		b = b.length < 2 ? '0'+b.toString(16) : b.toString(16);
		let color = '#' + r + g + b;
		return color;
	}
}
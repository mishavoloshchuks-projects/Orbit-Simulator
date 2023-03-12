export default class Scene {
	objArr = Array(); // Scene objects array
	objIdToOrbit = 0; // The ID of the object around which the new object will orbit

	constructor() {
		//
	}
	//Создание нового объекта
	addNewObject({
		x,
		y,
		screenX,
		screenY,
		vx,
		vy,
		mass = ui.newObjMass.state,
		objLck = ui.newObjLock.state,
		color = ui.newObjColor.state,
		main_obj = this.objIdToOrbit,
		circularOrbit = false,
		callback
	}){
		const objArr = this.objArr;
		const newObjId = objArr.length; // The ID of a new object

		// If received a screen coordinates convert it to a world coordinates
		if (screenX !== undefined && screenY !== undefined){
			[x, y] = camera.screenPix2(screenX, screenY);
		}

		if (circularOrbit && objArr[main_obj]) {
			[vx, vy] = this.forceToCircularOrbit(x, y, main_obj);
			if (!objArr[main_obj].lock){
				vx += objArr[main_obj].vx;
				vy += objArr[main_obj].vy;
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
		physics.pullOutFromEachOther(objArr);
		// Run callback after an object have been created
		callback && callback(newObjId);
		// If object created return its ID, else return false
		return objArr[newObjId] ? newObjId : false;
	}
	//Удаление объекта
	deleteObject(objects, eachObjectCallback = this.delObjectCallback.bind(this)){
		const objArr = this.objArr;
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
		camera.Target = getIdAfterArrChange([objectId], camera.Target);
		if (camera.Target === null) camera.setTarget();
		this.objIdToOrbit = getIdAfterArrChange([objectId], this.objIdToOrbit, this.objectSelect('biggest'));
		mov_obj = getIdAfterArrChange([objectId], mov_obj);

		renderer.allowFrameRender = true;
		this.show_obj_count(); // Set objects counter indicator
	}
	// Show number of objects
	show_obj_count(){
		document.querySelector('#object_count_value').innerHTML = this.objArr.length;
	}

	makeCopy (){
		const newScn = new Scene();
		for (let key in this){
			const prop = this[key];
			if (typeof prop !== 'function'){
				newScn[key] = JSON.parse(JSON.stringify(prop));
			}

		}
		return newScn;
	}
	//Необходимая скорость для круговой орбиты
	forceToCircularOrbit(px, py, obj1Id){
		if (this.objArr[obj1Id]){
			const objToOrbMass = Math.abs(this.objArr[obj1Id].m);
			let R = dist(camera.screenPix(px, 'x'), camera.screenPix(py, 'y'), camera.screenPix(this.objArr[obj1Id].x, 'x'), camera.screenPix(this.objArr[obj1Id].y, 'y'))*camera.animZoom;
			let V = Math.sqrt((objToOrbMass*5)*(R)/ui.g.state);
			let a = this.objArr[obj1Id].x - px;
			let b = this.objArr[obj1Id].y - py;
			let sin = b/R, cos = a/R;
			let svx = -(sin/V)*objToOrbMass*5;
			let svy = (cos/V)*objToOrbMass*5;

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
				let r = dist(mouse.x, mouse.y, ...renderer.crd2(this.objArr[i].x, this.objArr[i].y));
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
	// Get exponential value if value bigger than 1
	expVal(F, round = 1000){
		let val = F > 1 ? Math.pow(F, 8) : F;
		return Math.round(val * round) / round;
	}
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
$('document').ready(function(){
	var canv = document.getElementById('canvas');
	var ctx = canv.getContext('2d');
	var canv2 = document.getElementById('canvas2');
	var ctx2 = canv2.getContext('2d');
	canv.width = window.innerWidth;
	canv.height = window.innerHeight;
	canv2.width = window.innerWidth;
	canv2.height = window.innerHeight;
	layers_id = ['canvas', 'canvas2'];
	//Mouse
	mouse_coords = [canv.width/2, canv.height/2];
	mouse = [];
	mpos = [];
	mbut = 'create';
	menu_state = true;
	if (sessionStorage['mbut'] && sessionStorage['menu_state']){
		mbut = sessionStorage['mbut'];
		menu_state = sessionStorage['menu_state'] == 'true' ? true : false;
	}
	//Buttons
	cbut = '';
	chck = '';
	pfb = mbut;
	swt = false;
	traj = true;
	
	mov_obj = '';
	new_obj_param = [0,0,0,0];
	trace_resolution = [0, 2, false];
	multiTouches = [];
	paus = false;
	bodyEmpty = false;
	traj_ref = true;
	dis_zone = 5;
	visual_sel_ref = false;
	spawn = false;
	num = 0;
	del = false;
	body_prev = {};
	G = 1;

	//Camera
	cam_x = 0;
	cam_y = 0;
	mcamX = 0;
	mcamY = 0;
	prev_cam_x = 0;
	prev_cam_y = 0;
	mov = [0, 0, 0, 0];
	movAnim = [0, 0, 0, 0, true];
	anim_cam = [0, 0, true];
	zm_prev = 1;
	zm_cff = NaN;
	zm = 1/1;
	glob_scale = 1;

	//Debug
	ref_sped = 1;
	show_center = false;
	usr_orb_obj = NaN;
	show_fps = false;

	fps_count = 0;
	fps_interval = 0;
	if (show_fps){fps_interval = setInterval(fps, 1000)};
	function fps(){
		$('.fps').html('FPS: '+fps_count);
		if (fps_count >= 45){
			$('.fps').css({color: '#0f0'});
		} else if (fps_count >= 20){
			$('.fps').css({color: '#ff0'});
		} else {
			$('.fps').css({color: '#f04'});
		}
		fps_count = 0;
	}


	function crd(coord, axis, mode){
		if (mode == 0){
			if (axis == 'x'){
				return (coord + cam_x)*zm + mcamX + mov[0];
			}
			if (axis == 'y'){
				return (coord + cam_y)*zm + mcamY + mov[1];
			}		
		}
		if (mode == 1){
			if (axis == 'x'){
				return ((coord - mcamX - mov[0])/zm-cam_x);
			}
			if (axis == 'y'){
				return ((coord - mcamY - mov[1])/zm-cam_y);
			}			
		}
	}

	body = {
		'sun': {x:window.innerWidth/2, y: window.innerHeight/2, vx: 0, vy: 0, m: 1000, color: '#ffff00', lck: true, trace: [], main_obj: false},
		//'ast': {x:window.innerWidth/2 - 100, y: window.innerHeight/2, vx: 0, vy: 10, m: 10, color: randColor(), lck: false, trace: [], main_obj: 'sun'},
		//'sun2': {'x':0, 'y': window.innerHeight/2, 'vx': 1, 'vy': 3, m: 100, 'color': '#ffff00', 'lck': false, trace: [], main_obj: 'sun'},
	};
	//View=================
	//ctx.scale(cam_scale, cam_scale);
	//ctx.translate(mov[0], mov[1]);
	//myImageData = ctx.createImageData(0, 0, window.innerWidth, window.innerHeight);
	//ctx.putImageData(myImageData, 0, 0);

	obj_count = 0;
	function show_obj_count(){
		obj_count = 0;
		for (let i in body){
			obj_count ++;
		}

		if (obj_count != switcher.obj_count){
			$('.object_count h2').html('Количество обьектов: '+obj_count);
			switcher.obj_count = obj_count;
		}
	}

	switcher = {del_radio: 0, del_pulse: 10, del_pulse_state: false, pause: false,
		pause2: false, trajectory_ref: false, music: false,
		obj_count: obj_count, device: 'desktop',
		gravit_mode: 1, r_gm: 1, interact: 0, ref_interact: 0,
		traj_mode: 1, traj_mode2: 1, traj_prev_on: true,
		zoomToScreenCenter: false, vis_distance: false, sel_orb_obj: false, launch_pwr: 1};

	swch = {s_track: false, t_object: false, prev_t_obj: false, vis_traj: false,
		s_edit: false, edit_obj: false, orb_obj: 'sun', equilib_orb: false};

	names = {create: 'menu_options', delete: 'del_menu_options', edit: 'edit_menu',
		help: 'help_menu', settings: 'settings_menu', camera: 'camera_menu', trajectory: 'traj_menu'}

	choise_restore('gravit_mode', 'gravit_mode', 'radio');
	choise_restore('interact', 'interact', 'radio');
	choise_restore('traj_mode', 'traj_mode2', 'radio');
	choise_restore('traj_prev_on', 'traj_prev_on', 'checkbox');
	choise_restore('chck_zoomToScreenCenter', 'zoomToScreenCenter', 'checkbox');
	choise_restore('vis_distance_check', 'vis_distance', 'checkbox');

	obj_color = sessionStorage['obj_color'] ? sessionStorage['obj_color'] : '#FFFFFF';
	obj_rand_color = sessionStorage['obj_rand_color'] ? (sessionStorage['obj_rand_color'] == 'true' ? true : false) : true;
	obj_radius = sessionStorage['obj_radius'] ? +sessionStorage['obj_radius'] : Math.round(getRandomArbitrary(0.1, 10)*10)/10;
	obj_reverse = sessionStorage['obj_reverse'] ? (sessionStorage['obj_reverse'] == 'true' ? true : false) : false;
	obj_cirle_orbit = sessionStorage['obj_cirle_orbit'] ? (sessionStorage['obj_cirle_orbit'] == 'true' ? true : false) : true;
	obj_lck = false;

	traj_calc_smpls = sessionStorage['traj_calc_samples'] ? +sessionStorage['traj_calc_samples'] : 100;
	switcher.launch_pwr = sessionStorage['launch_pwr'] ? +sessionStorage['launch_pwr'] : 1;

	$('.col_select').attr('value', obj_color);
	$('#create_mass').attr('value', obj_radius);
	$('#traj_calc_samples').attr('value', traj_calc_smpls);
	$('#launch_power').attr('value', switcher.launch_pwr);
	$('#G_value').attr('value', G);
	if (obj_reverse){$('.direction_reverse_select').attr('checked', 'on');};
	if (obj_cirle_orbit){$('.orbit_select').attr('checked', 'on');};
	if (obj_rand_color){$('.rand_col_select').attr('checked', 'on');};

	radio_select('traj_radio', switcher.traj_mode2);
	check_select('traj_prev_check', switcher.traj_prev_on);
	check_select('chck_zoomToScreenCenter', switcher.zoomToScreenCenter);
	check_select('vis_distance_check', switcher.vis_distance);

	sel_and_rest();
	function sel_and_rest(){
		radio_select('gravit_mode_radio', switcher.gravit_mode);
		radio_select('interact_radio', switcher.interact);
		show_obj_count();
	}

	change_state(mbut);

	function radio_select(radio_id_prefix, numb){
		$('#'+radio_id_prefix+'_'+numb).click();	
	}
	function check_select(check_id, state){
		if (state){
			$('#'+check_id).attr('checked', '');
		}
	}
	function choise_restore(name_session, var_name, cr = 'c'){
		if (sessionStorage[name_session]){
			if (cr == 'checkbox'){
				switcher[var_name] = sessionStorage[name_session] != 'true' ? false : true;	
			}
			if (cr == 'radio'){
				switcher[var_name] = sessionStorage[name_session];
			}			
		}
	}
	function menu_open_restore(){
		if (menu_state){
			$('#'+names[mbut]).css({display: 'block'});
		}
	}
	menu_open_restore();
	//====time====
	times = 1;
	t = times;
	tsw = false;
	t_wrap = false;
	pretime = 1;
	$('.time_speed h2').html('T - X'+t);
	//======

	//speed = 16;
	//let simulation_refresh = setInterval(frame, speed);
	window.requestAnimationFrame(frame);	
	//Mouse and touches
	leftMouseDown = false;
	rightMouseDown = false;
	middleMouseDown = false;
	mouseMove = false;
	multiTouch = 0;
	avTouchPoint = {x: NaN, y: NaN, xd: NaN, yd: NaN};
	mscam = true;

	function clear(col = '#00000004'){
		if (switcher.traj_mode == 0){col = '#000';}
		ctx.fillStyle = col;
		ctx.fillRect(0, 0, canv.width, canv.height);

		//ctx.clearRect(0, 0, canvas.width, canvas.height);
	}
	function clear2(){
		//myImageData = ctx2.createImageData(window.innerWidth, window.innerHeight, 0, 0);
		//ctx2.putImageData(myImageData, 0, 0);
		ctx2.clearRect(0, 0, window.innerWidth, window.innerHeight);
	}

	wind_width = window.innerWidth;
	wind_height = window.innerHeight;
	window.onresize = function(){
		if (!(wind_width == window.innerWidth)){
			if (confirm('Для корректного отображения, нужно перезагрузить страницу.')){
				location.href = location;
			}					
		}
	}
	//Touch events ======================================
	$('.canvas').on('touchstart', function(event){
		event.preventDefault();
		$('#canvas2').trigger('mousedown', event);
	});

	$('.canvas').on('touchend', function(event){
		$('#canvas2').trigger('mouseup', event);
		zm_prev = zm;
	});

	$('.canvas').on('touchmove', function(event){
		event.preventDefault();
		mouseMove = true;
		event.clientX = event.targetTouches[0].clientX;// Touch X
		event.clientY = event.targetTouches[0].clientY;// Touch Y
		switcher.move = false;
		av_touch_x = [];// Averrage point of touchs
		av_touch_y = [];// Averrage point of touchs
		if (leftMouseDown && mbut == 'move' && mov_obj){ // Moving object
			if (body[mov_obj]){
				ctx.strokeStyle = body[mov_obj].color;
				ctx.fillStyle = body[mov_obj].color;
				ctx.lineWidth = Math.sqrt(body[mov_obj].m)*2*zm < 0.5 ? 0.5 : Math.sqrt(body[mov_obj].m)*2*zm;
				ctx.beginPath();
				ctx.arc(crd(body[mov_obj].x, 'x', 0), crd(body[mov_obj].y, 'y', 0), Math.sqrt(body[mov_obj].m)*zm, 0, 7);
				ctx.fill();
				ctx.beginPath();
				ctx.moveTo(crd(body[mov_obj].x, 'x', 0), crd(body[mov_obj].y, 'y', 0));

				body[mov_obj].x = (event.clientX - mpos[0])/zm + mpos[2]; // New position X
				body[mov_obj].y = (event.clientY - mpos[1])/zm + mpos[3]; // New position Y

				ctx.lineTo(crd(body[mov_obj].x, 'x', 0), crd(body[mov_obj].y, 'y', 0));
				ctx.stroke();
			}
		}
		if (event.changedTouches.length == 2){
			for (let i = 0; i < event.changedTouches.length; i++){ //All touch points array
				av_touch_x.push(event.changedTouches[i].clientX);
				av_touch_y.push(event.changedTouches[i].clientY);
			}
			avTouchPoint.x = sumArray(av_touch_x)/av_touch_x.length; // Averrage point of touchs
			avTouchPoint.y = sumArray(av_touch_y)/av_touch_x.length; // Averrage point of touchs
			touchZoom = rad(event.changedTouches[0].clientX, event.changedTouches[0].clientY, event.changedTouches[1].clientX, event.changedTouches[1].clientY); // Distance between touchs
			$('.power').css({display: 'none'}); // Clear power number
			leftMouseDown = false; 
			mscam = false;

			if (!avTouchPoint.xd){ // Mouse down
				avTouchPoint.xd = avTouchPoint.x - cam_x*zm;
				avTouchPoint.yd = avTouchPoint.y - cam_y*zm;
				zm_cff = touchZoom;
			}

			zm = zm_prev / Math.pow(zm_cff / touchZoom, 2); // Zoom
			if (!switcher.zoomToScreenCenter){ // If no zoom to center
				mov[0] = avTouchPoint.x - avTouchPoint.xd + mov[2]*Math.pow(touchZoom/zm_cff, 2);
				mov[1] = avTouchPoint.y - avTouchPoint.yd + mov[3]*Math.pow(touchZoom/zm_cff, 2);
				// + ((wind_width/2 - avTouchPoint.x)*Math.pow(touchZoom/zm_cff, 2) - (wind_width/2 - avTouchPoint.x))
 				// + ((wind_height/2 - avTouchPoint.y)*Math.pow(touchZoom/zm_cff, 2) - (wind_height/2 - avTouchPoint.y))

				//mov[0] = mov[0] / (touchZoom/zm_cff) - (avTouchPoint.x - wind_width/2) / ((zm_cff/touchZoom)/((touchZoom/zm_cff)-1));
				//mov[1] = mov[1] / (touchZoom/zm_cff) - (avTouchPoint.y - wind_height/2) / ((zm_cff/touchZoom)/((touchZoom/zm_cff)-1));
			}
			swch.t_object = false; // Track object disable
			swch.prev_t_obj = false; // Track object disable
			clear('#000000');
		}
		mouse_coords[0] = event.clientX;
		mouse_coords[1] = event.clientY;
	})
	//Mouse events =========================================================
	$('.canvas').mousedown(function(event, touch){
		usr_multi_touch = false;
		if (touch){
			usr_touch = touch.targetTouches[1] ? true : false;
			mouse_coords[0] = touch.targetTouches[0].clientX;
			mouse_coords[1] = touch.targetTouches[0].clientY;
			multiTouch ++;
		} else {
			mouse_coords[0] = event.clientX;
			mouse_coords[1] = event.clientY;			
		}

		if (touch){
			event.clientX = touch.targetTouches[0].clientX;
			event.clientY = touch.targetTouches[0].clientY;
			console.log('touchstart');
		}
		mpos[0] = event.clientX; mpos[1] = event.clientY;
		mouse[0] = event.clientX; mouse[1] = event.clientY;
		if (event.which == 1 || touch){
			leftMouseDown = true;

			if (mbut == 'create'){
				if (obj_rand_color){
					obj_color = randColor();
				};
			};
			//Перемещение ближайшео объекта
			if (mbut == 'move'){
				mov_obj = select_object();
			}

			if (body[mov_obj]){
				mpos[2] = body[mov_obj].x; mpos[3] = body[mov_obj].y; //Координаты перемещяемого объекта
				mpos[4] = body[mov_obj].vx; mpos[5] = body[mov_obj].vy;	// Вектор перемещяемого объекта
				body[mov_obj].vx = 0; body[mov_obj].vy = 0;
			}
			//Выбор объекта для редактирования
			if (mbut == 'edit' && swch.s_edit){
				swch.edit_obj = select_object(0);
				swch.s_edit = false;
				if (body[swch.edit_obj]){
					document.getElementById('col_edit').value = body[swch.edit_obj].color;
					document.getElementById('mass_edit').value = body[swch.edit_obj].m;
					document.getElementById('check_edit_lck').checked = body[swch.edit_obj].lck;
				}
				delete edit_radius;
			}		
		}
		if (event.which == 2 || usr_multi_touch){
			middleMouseDown = true;
			mpos[0] = event.clientX - cam_x*zm; mpos[1] = event.clientY - cam_y*zm;

			mov[0] = cam_x*zm+mov[2]; mov[1] = cam_y*zm+mov[3];

			swch.t_object = false;
			swch.prev_t_obj = false;
		}
		if (event.which == 3){
			rightMouseDown = true;
			if (mbut == 'create' && leftMouseDown){
				clear2();
				$('.power').css({display: 'none'});				
			}
		}
	});

	$('.canvas').mouseup(function(e, touch){
		if (touch){
			console.log('touchend');
			event.clientX = mouse_coords[0];
			event.clientY = mouse_coords[1];
		}
		avTouchPoint.xd = avTouchPoint.yd = NaN;
		if (event.which == 1 || touch){
			leftMouseDown = false;
			mouse[2] = event.clientX; mouse[3] = event.clientY;
			$('.power').css({display: 'none'});

			if (mbut == 'delete' && !bodyEmpty){
				delete_obj = select_object(switcher.del_radio);

				ctx.beginPath();
				ctx.fillStyle = '#000';
				ctx.arc(body[delete_obj].x, body[delete_obj].y, Math.sqrt(body[delete_obj].m)+1, 0, 7);
				ctx.fill();

				del_obj(delete_obj);

				deleted();
			}
			if (mbut == 'move' && body[mov_obj]){
				body[mov_obj].vx = mpos[4];
				body[mov_obj].vy = mpos[5];
				mov_obj = '';
			}


			if (mbut == 'create' && mscam && !rightMouseDown){
				spawn = true;
				swch.vis_traj = false;
				switcher.trajectory_ref = false;
				ctx.beginPath();
				ctx.fillStyle = obj_color;
				ctx.arc(mpos[0], mpos[1], Math.sqrt(obj_radius)*zm, 0, 7);
				ctx.fill();
				if (!paus){
					obj_sp(new_obj_param[0], new_obj_param[1], obj_color, new_obj_param[2], new_obj_param[3]);
				}
				//obj_sp(false, false, obj_color);
			}
			if (mbut == 'camera' && swch.s_track){
				paus = switcher.pause ? true : false; //Пауза уже включена
				swch.t_object = select_object();
				clear('#000000');

				if (mov[0] != 0 || mov[1] != 0){
					movAnim[4] = false;
				}
				mov[0] = 0;
				mov[1] = 0;
				mov[2] = 0;
				mov[3] = 0;

				swch.s_track = false;
			}
			if (mbut == 'sel_orb_obj'){
				usr_orb_obj = select_object();
				switcher.sel_orb_obj = false;
				mbut = 'create';
			}
		};
		if (event.which == 2 || !mscam){
			middleMouseDown = false;
			mov[2] = mov[0];
			mov[3] = mov[1];
		}
		if (touch){
			multiTouch --;
			mscam = multiTouch != 0 ? false : true;
		}
		if (e.which == 3){
			rightMouseDown = false;
			if (leftMouseDown){
				$('.power').css({display: 'block'});
				$('.power').html('0');
			}
		}
	});	

	document.onmousemove = function(e){
		switcher.move = false;
		mouseMove = true;
		if (leftMouseDown && mbut == 'move' && mov_obj){
			//switcher.move = true;
			if (body[mov_obj]){
				ctx.strokeStyle = body[mov_obj].color;
				ctx.fillStyle = body[mov_obj].color;
				ctx.lineWidth = Math.sqrt(body[mov_obj].m)*2*zm < 0.5 ? 0.5 : Math.sqrt(body[mov_obj].m)*2*zm;
				ctx.beginPath();
				ctx.arc(crd(body[mov_obj].x, 'x', 0), crd(body[mov_obj].y, 'y', 0), Math.sqrt(body[mov_obj].m)*zm, 0, 7);
				ctx.fill();
				ctx.beginPath();
				ctx.moveTo(crd(body[mov_obj].x, 'x', 0), crd(body[mov_obj].y, 'y', 0));

				body[mov_obj].x = (event.clientX - mpos[0])/zm + mpos[2]; // New position X
				body[mov_obj].y = (event.clientY - mpos[1])/zm + mpos[3]; // New position Y

				ctx.lineTo(crd(body[mov_obj].x, 'x', 0), crd(body[mov_obj].y, 'y', 0));
				ctx.stroke();
			}
		}
		if (middleMouseDown){
			mov[0] = event.clientX - mpos[0] + mov[2];
			mov[1] = event.clientY - mpos[1] + mov[3];
			clear('#000000');
		}
		mouse_coords[0] = event.clientX;
		mouse_coords[1] = event.clientY;
		if (e.ctrlKey){
			if (!mouse_coords[2]){
				mouse_coords[2] = mouse_coords[0];
				mouse_coords[3] = mouse_coords[1];			
			}
		} else {
			mouse_coords[2] = mouse_coords [3] = false;
		}
	};
	$('*').bind('contextmenu', function(e) {
		return false;
	});
	//End mouse events ============
	$('input').on('change', function(e){
		//alert($(this).attr('id'));
		chck = $(this).attr('id');
		inp_name = $(this).attr('name');

		if (chck == 'check_edit_lck' && body[swch.edit_obj]){
			if (document.getElementById(chck).checked){
				body[swch.edit_obj].lck = true;
			} else {
				body[swch.edit_obj].lck = false;
			}
		}
		if (chck == 'mass_edit' && body[swch.edit_obj]){		
			if (+document.getElementById(chck).value > 0 && +document.getElementById(chck).value){
				body[swch.edit_obj].m = +document.getElementById(chck).value;
			}
			//clear('#000');
		}
		if (chck == 'col_edit' && body[swch.edit_obj]){
			body[swch.edit_obj].color = document.getElementById(chck).value;
		}
		if (inp_name == 'traj'){
			switcher.traj_mode2 = sessionStorage['traj_mode'] = +$(this).attr('value');
			for (let object in body){
				res = 20;
				trace_length = body[object].trace.length;
				while (trace_length > res){
					body[object].trace.pop();
					trace_length --;
				}							
			}
		}
		if (chck == 'traj_calc_samples'){
			traj_calc_smpls = +this.value;
			sessionStorage['traj_calc_samples'] = +this.value;
		}
		if (chck == 'traj_prev_check'){
			sessionStorage['traj_prev_on'] = switcher.traj_prev_on = (this.checked == false) ? false : true;
		}
		if (chck == 'chck_zoomToScreenCenter'){
			sessionStorage['chck_zoomToScreenCenter'] = switcher.zoomToScreenCenter = (this.checked == false) ? false : true;
		}
		if (chck == 'vis_distance_check'){
			sessionStorage['vis_distance_check'] = switcher.vis_distance = (this.checked == false) ? false : true;
			$('.power').css({display: 'none'});
		}
		if (chck == 'select_file'){
			var selectedFile = $('#select_file')[0].files[0];
			if (selectedFile !== undefined){
				readFile(document.getElementById('select_file'));
			}
		}
		if (chck == 'launch_power'){
			switcher.launch_pwr = sessionStorage['launch_pwr'] = +this.value;
		}
		if (chck == 'G_value'){
			e.preventDefault();
			G = +this.value;
		}
	});

	function rad(x1, y1, x2, y2){
		a = x1 - x2; b = y1 - y2;
		return Math.sqrt(a*a + b*b);
	};

	function gipot(a,b){return Math.sqrt(a*a + b*b);}

	function frame(){
		window.requestAnimationFrame(frame);
		t = times;
		if (show_fps){fps_count ++;}

		bodyEmpty = isEmptyObject(body);

		if (!body[usr_orb_obj]){
			swch.orb_obj = select_object(3);		
		} else {
			swch.orb_obj = usr_orb_obj;
		}

		mcamX = -window.innerWidth/2 * (zm-1);
		mcamY = -window.innerHeight/2 * (zm-1);

		if (leftMouseDown){
			if (mouseMove){
				clear2();
			}
		} else {
			clear2();
		};
		if (visual_sel_ref){
			clear2();
			visual_sel_ref = false;
		}
		if (switcher.move || (switcher.traj_mode != 1)){clear('#000');}else{if(!switcher.trajectory_ref && !switcher.pause2){clear();};};

		if (middleMouseDown || mbut == 'move'){canv2.style.cursor = "move";}else{canv2.style.cursor = "default";};

		if (mbut == 'create' && leftMouseDown && !rightMouseDown){
			if (!switcher.pause){
				switcher.pause = true;
				switcher.traj_pause = true;				
			}
			if (mouseMove){
				visual_trajectory();
			}

			mcx = mouse_coords[2] ? mouse_coords[2] - (mouse_coords[2] - mouse_coords[0])/10 : mouse_coords[0];
			mcy = mouse_coords[3] ? mouse_coords[3] - (mouse_coords[3] - mouse_coords[1])/10 : mouse_coords[1];
			//console.log(obj_for_traj);
			if ((!(Math.abs(mouse[0]-mouse_coords[0]) < dis_zone && Math.abs(mouse[1]-mouse_coords[1]) < dis_zone))&&switcher.traj_prev_on&&mouseMove){
				obj_for_traj = {x: crd(mouse[0], 'x', 1), y: crd(mouse[1], 'y', 1), vx: ((mouse[0]-mcx)/30)*t*switcher.launch_pwr, vy: ((mouse[1]-mcy)/30)*t*switcher.launch_pwr, m: obj_radius, color: obj_color, lck: obj_lck};
				traj_prev(obj_for_traj, traj_calc_smpls, ['#006BDE88', '#ffffff44'], true);
			} else {
				new_obj_param = [0, 0, 0, 0];
			};
		}

		if (mbut == 'create' && !leftMouseDown){
			if (switcher.traj_pause){
				switcher.pause = false;
				delete switcher.traj_pause;
			} else {

			}
		}

		if (switcher.interact != switcher.ref_interact){
			switcher.ref_interact = switcher.interact;
		}
		if (switcher.r_gm != switcher.gravit_mode){
			switcher.r_gm = switcher.gravit_mode;
		}

		
		//Анимация перехода камеры
		if (swch.t_object != swch.prev_t_obj && movAnim[4]){
			switcher.pause = true; //Пауза
			crds = [0,0,0,0,0,0];//Координаты и расстояния
			if (body[swch.t_object]){ //Если целевой объект существует
				crds[0] = body[swch.t_object].x; //Координаты целевого объекта по x
				crds[1] = body[swch.t_object].y; //Координаты целевого объекта по y
			} else { //Если нет
				crds[0] = window.innerWidth/2; //Цель - центр окна
				crds[1] = window.innerHeight/2; //Цель - центр окна
			}
			if (body[swch.prev_t_obj]){ //Если предыдущий целевой объект существует
				crds[2] = body[swch.prev_t_obj].x; //Координаты предыдущео целевого объекта
				crds[3] = body[swch.prev_t_obj].y; //Координаты предыдущео целевого объекта
			} else { //Если нет
				crds[2] = window.innerWidth/2; //Цель - центр окна
				crds[3] = window.innerHeight/2; //Цель - центр окна
			};
			crds[4] = crds[0] - crds[2]; //Расстояние между предыдущим целевым и целевым объектом по x
			crds[5] = crds[1] - crds[3]; //Расстояние между предыдущим целевым и целевым объектом по y
			crds[7] = crds[5]/20; //Размер шага анимации
			crds[6] = crds[4]/20; //Размер шага анимации

			anim_cam[0] -= crds[6]; //Шаг анимации
			anim_cam[1] -= crds[7]; //Шаг анимации

			if (Math.abs(anim_cam[0]) > Math.abs(crds[4]) || Math.abs(anim_cam[0]) == 0){ //Конец анимации
				swch.prev_t_obj = swch.t_object;
				anim_cam[0] = 0;
				anim_cam[1] = 0;
				anim_cam[2] = true;
				switcher.pause = paus; //Снимается пауза, если пауза была выключена
			}
			clear('#000');
		} else {
			swch.prev_t_obj = swch.t_object;
		}

		if (!middleMouseDown){
			prev_cam_x = cam_x;
			prev_cam_y = cam_y;
		} else {
			prev_cam_x = 0;
			prev_cam_y = 0;
		}


		if (tsw){
			$('.time_speed h2').html('T - X'+t);
			for (let i in body){
				c = times/pretime;
				body[i].vx *= c;
				body[i].vy *= c;
			}
			tsw = false;
		}

		switcher.pause2 = switcher.pause ? true:false;
		if (!switcher.pause){
			if (spawn){
				obj_sp(new_obj_param[0], new_obj_param[1], obj_color, new_obj_param[2], new_obj_param[3]);
			}		
		}
		for (let i = 0; i < ref_sped; i++){
			if (swch.prev_t_obj && body[swch.prev_t_obj]){
				cam_vx = !switcher.pause2 ? body[swch.prev_t_obj].vx : 0;
				cam_vy = !switcher.pause2 ? body[swch.prev_t_obj].vy : 0;

				if (swch.t_object && !switcher.pause){
					body_prev = JSON.parse(JSON.stringify(body));
					obj = body_prev[swch.t_object];

					if (switcher.ref_interact == 0 && !switcher.pause2 && !bodyEmpty){
						for(let i in body){
							if (i != swch.t_object){
								obj2 = body_prev[i];
								R = rad(obj.x, obj.y, obj2.x, obj2.y);
								a = obj2.x - obj.x;
								b = obj2.y - obj.y;
								sin = b/R; cos = a/R;

								vx = gravity_func(sin, cos, R, switcher.r_gm, 'vx', obj2.m);
								vy = gravity_func(sin, cos, R, switcher.r_gm, 'vy', obj2.m);

								if(!obj.lck && !switcher.pause2 && !(mbut == 'move' && leftMouseDown && object == mov_obj)){
									cam_vx += vx;
									cam_vy += vy;
								}
							};
						}
					}
					if (switcher.ref_interact == 1 && body_prev['sun'] && !switcher.pause2 && !bodyEmpty){
						obj2 = body_prev['sun'];

						R = rad(obj.x, obj.y, obj2.x, obj2.y);

						a = obj2.x - obj.x;
						b = obj2.y - obj.y;
						sin = b/R; cos = a/R;

						vx = gravity_func(sin, cos, R, switcher.r_gm, 'vx', obj2.m);
						vy = gravity_func(sin, cos, R, switcher.r_gm, 'vy', obj2.m);

						if(!obj.lck && !switcher.pause2 && !(mbut == 'move' && leftMouseDown && object == mov_obj)){
							cam_vx += vx;
							cam_vy += vy;
						}
					};					
				}

				cam_x = (window.innerWidth / 2) - (body[swch.prev_t_obj].x + cam_vx) + anim_cam[0];
				cam_y = (window.innerHeight / 2) - (body[swch.prev_t_obj].y + cam_vy) + anim_cam[1];		
			} else {
				cam_x = 0 + anim_cam[0];
				cam_y = 0 + anim_cam[1];
			}
			body_prev = JSON.parse(JSON.stringify(body));
			if (!bodyEmpty){
				for (let obj in body){	
					//traj_prev(obj, 200, '#ffffff33');
					refresh(obj);
				}			
			}
			if (!movAnim[4]){
				movAnim[4] = true;
			}
			traj_ref = false;		
			if (trace_resolution[0] >= trace_resolution[1]){
				trace_resolution[2] = true;
				trace_resolution[0] = 0;
			} else {trace_resolution[0] ++; trace_resolution[2] = false;}
		}
		traj_ref = true;
		if (switcher.traj_mode2 != switcher.traj_mode){
			switcher.traj_mode = switcher.traj_mode2;
		}
		if (t_wrap){
			$('.time_speed h2').html('T - X'+t);
			for (let i in body){
				c = times/pretime;
				body[i].vx *= c;
				body[i].vy *= c;
			}
			t_wrap = false;
		}

		if (mbut == 'delete'){
			visual_select(switcher.del_radio, '#f006');
		}

		if (mbut == 'camera' && cbut == 'select_track' && swch.s_track){
			visual_select(0, '#0af6', select_object());
		}

		if (mbut == 'move'){
			visual_select(0, '#bbb6', mov_obj);
		}

		if (mbut == 'edit'){
			if (swch.s_edit){
				visual_select(0, '#11f6', mov_obj);
			}
		}
		if (show_center){
			ctx.strokeStyle = '#000000';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(wind_width/2 - 5, wind_height/2 - 5);
			ctx.lineTo(wind_width/2 + 5, wind_height/2 + 5);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(wind_width/2 + 5, wind_height/2 - 5);
			ctx.lineTo(wind_width/2 - 5, wind_height/2 + 5);
			ctx.stroke();

			ctx.strokeStyle = '#ff0000';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(wind_width/2 - 5, wind_height/2 - 5);
			ctx.lineTo(wind_width/2 + 5, wind_height/2 + 5);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(wind_width/2 + 5, wind_height/2 - 5);
			ctx.lineTo(wind_width/2 - 5, wind_height/2 + 5);
			ctx.stroke();			
		}
		if ((mbut == 'create') && (!leftMouseDown || (multiTouch > 0 && mbut != 'create')) && switcher.vis_distance){
			vis_distance([mouse_coords[0], mouse_coords[1]], '#888888');
		}
		if (mbut == 'sel_orb_obj' && switcher.sel_orb_obj){
			visual_select(0, '#bf06', mov_obj);
		}
		if (mbut != 'create'){
			$('.power').css({display: 'none'});
		}

		mouseMove = false;
	}

	function refresh(object){
		obj = body_prev[object];
		t_mod = switcher.traj_mode; //Trajectory mode
		if(switcher.ref_interact == 0 && !switcher.pause2 && !bodyEmpty){
			for (let i in body){
				if (i == object){continue;};
				obj2 = body_prev[i];

				R = rad(obj.x, obj.y, obj2.x, obj2.y);
				
				sin = (obj2.y - obj.y)/R;
				cos = (obj2.x - obj.x)/R;

				if(!obj.lck && !(mbut == 'move' && leftMouseDown && object == mov_obj)){
					body[object].vx += gravity_func(sin, cos, R, switcher.r_gm, 'vx', obj2.m);
					body[object].vy += gravity_func(sin, cos, R, switcher.r_gm, 'vy', obj2.m);
				}

				//A = R;
				//B = rad(obj.x+vx, obj.y+vy, obj2.x, obj2.y);
				//C = rad(obj.x+vx, obj.y+vy, obj.x, obj.y);

				if (R - (Math.sqrt(obj.m) + Math.sqrt(obj2.m)/2) <= 0){
					if (obj.m >= obj2.m){
						body[object].color = mixColors(obj.color, obj2.color, obj.m, obj2.m);
						body[object].m = obj.m + obj2.m;
						if (!obj.lck){
							body[object].vx = (obj.m*obj.vx+obj2.m*obj2.vx)/(obj.m+obj2.m);//Формула абсолютно-неупругого столкновения
							body[object].vy = (obj.m*obj.vy+obj2.m*obj2.vy)/(obj.m+obj2.m);//Формула абсолютно-неупругого столкновения
						}
						del_obj(i);
						continue;
					}else{continue;}
				}
			}
		}
		if (switcher.ref_interact == 1 && body_prev[swch.orb_obj] && !switcher.pause2 && !bodyEmpty){
			if (object != obj.main_obj && body[object] && body[obj.main_obj]){
				obj2 = body_prev[obj.main_obj];

				R = rad(obj.x, obj.y, obj2.x, obj2.y);

				sin = (obj2.y - obj.y)/R;
				cos = (obj2.x - obj.x)/R;

				if(!obj.lck && !(mbut == 'move' && leftMouseDown && object == mov_obj)){
					body[object].vx += gravity_func(sin, cos, R, switcher.r_gm, 'vx', obj2.m);
					body[object].vy += gravity_func(sin, cos, R, switcher.r_gm, 'vy', obj2.m);
				}

				//Эллипс	
				//ctx.beginPath();
				//ctx.lineWidth = Math.sqrt(body[object].m);
				//ctx.strokeStyle = obj.color;
				//ctx.ellipse(body.sun.x + cam_x, body.sun.y + cam_y, Math.abs(ell_a), 250, 0, 0, 7);
				//ctx.stroke();
			};
		}

		prev_x = body[object].x + prev_cam_x + mov[0]/zm;
		prev_y = body[object].y + prev_cam_y + mov[1]/zm;

		if(!obj.lck && !switcher.pause2 && !t_wrap){
			body[object].x += body[object].vx;
			body[object].y += body[object].vy;
		}

		obj_rad = Math.sqrt(obj.m)*zm;
		obj_rad = obj_rad < 0.5 ? 0.5 : obj_rad;
		obCol = obj.color;

		render = (prev_x != body[object].x + cam_x + mov[0]/zm && prev_y != body[object].y + cam_y + mov[1]/zm)?true:false;
		if (traj_ref){		
			if (!render){
				ctx.beginPath();
				ctx.fillStyle = '#000000';
				ctx.arc(crd(body[object].x, 'x', 0), crd(body[object].y, 'y', 0), (obj_rad+0.125), 0, 7);
				ctx.fill();
			}
			ctx.fillStyle = obCol;
			ctx.beginPath();
			ctx.arc(crd(body[object].x, 'x', 0), crd(body[object].y, 'y', 0), obj_rad, 0, 7);
			ctx.fill();
		}

		if (!switcher.pause2 && movAnim[4] && t_mod == 1){
			if (swch.prev_t_obj != object){
				//ctx.beginPath();
				//ctx.fillStyle = obCol;
				//ctx.arc(prev_x*zm+mcamX, prev_y*zm+mcamY, obj_rad, 0, 7);
				//ctx.fill();
				ctx.strokeStyle = obCol;
				ctx.lineWidth = obj_rad*2;
				ctx.beginPath();
				ctx.moveTo(prev_x*zm+mcamX, prev_y*zm+mcamY);
				ctx.lineTo(crd(body[object].x, 'x', 0), crd(body[object].y, 'y', 0));
				ctx.stroke();			
			}
		}
		res = false;
		if ((t_mod == 2 || t_mod == 3 || t_mod == 4) && !obj.lck && trace_resolution[2]){
			res = t_mod == 4?75:20;
			if (!switcher.pause2){
				body[object].trace.unshift([obj.x, obj.y]);
				trace_length = body[object].trace.length;
				while (trace_length > res){
					body[object].trace.pop();
					trace_length --;
				}				
			}			
		}
		//Trajectory mode 2 =====
		if (t_mod == 2 && !obj.lck && res <= 20){
			if (traj_ref){
				ctx.fillStyle = obCol;
				ctx.strokeStyle = obCol;
				if (body[object].trace[0]){
					ctx.lineWidth = obj_rad*2*0.9;
					ctx.beginPath();
					ctx.moveTo(crd(body[object].x, 'x', 0), crd(body[object].y, 'y', 0));
					ctx.lineTo(crd(body[object].trace[0][0], 'x', 0), crd(body[object].trace[0][1], 'y', 0));
					ctx.stroke();				
				}
				for (let i in body[object].trace){
					itr = i-1;
					itr = itr < 0?0:itr;

					ctx.lineWidth = Math.abs(obj_rad*1.9 - (obj_rad*2)/32*i*2*0.8);
					ctx.beginPath();
					ctx.moveTo(crd(body[object].trace[i][0], 'x', 0), crd(body[object].trace[i][1], 'y', 0));
					ctx.lineTo(crd(body[object].trace[itr][0], 'x', 0), crd(body[object].trace[itr][1], 'y', 0));
					ctx.stroke();
				}			
			}
		}

		//Trajectory mode 3 =====
		if (t_mod == 3 && !obj.lck && res <= 20){
			rand_kf = 0.5;

			if (traj_ref){
				prev_randX = 0;
				prev_randY = 0;
				randX = 0;
				randY = 0;

				ctx.fillStyle = obCol;
				ctx.strokeStyle = obCol;
				if (body[object].trace[0]){
					ctx.lineWidth = obj_rad*2;
					ctx.beginPath();
					ctx.moveTo(crd(body[object].x, 'x', 0)+randX, crd(body[object].y, 'y', 0)+randY);
					ctx.lineTo(crd(body[object].trace[0][0], 'x', 0)+prev_randX, crd(body[object].trace[0][1], 'y', 0)+prev_randY);
					ctx.stroke();				
				}
				for (let i in body[object].trace){
					itr = i-1;
					itr = itr < 0?0:itr;
					prev_randX = randX; prev_randY = randY;
					randX = getRandomArbitrary(-(Math.sqrt(obj.m)*zm*i/10), Math.sqrt(obj.m)*zm*i/10)*rand_kf;
					randY = getRandomArbitrary(-(Math.sqrt(obj.m)*zm*i/10), Math.sqrt(obj.m)*zm*i/10)*rand_kf;

					ctx.lineWidth = Math.abs(obj_rad*1.9 - (obj_rad*2)/32*i*2*0.8);
					ctx.beginPath();
					ctx.arc(Math.floor(crd(body[object].trace[itr][0], 'x', 0)+randX*2), Math.floor(crd(body[object].trace[itr][1], 'y', 0)+randY*2), Math.sqrt(obj.m)*zm - (Math.sqrt(obj.m)*zm)/res*i, 0, 7);
					ctx.fill();
					ctx.beginPath();
					ctx.moveTo(crd(body[object].trace[i][0], 'x', 0)+randX, crd(body[object].trace[i][1], 'y', 0)+randY);
					ctx.lineTo(crd(body[object].trace[itr][0], 'x', 0)+prev_randX, crd(body[object].trace[itr][1], 'y', 0)+prev_randY);
					ctx.stroke();
				}			
			}
		}

		//Trajectory mode 4 =====
		if (t_mod == 4 && !obj.lck){
			if (traj_ref){
				ctx.fillStyle = obCol;
				ctx.strokeStyle = obCol;
				ctx.lineWidth = 1;
				if (body[object].trace[0]){
					ctx.beginPath();
					ctx.moveTo(crd(body[object].x, 'x', 0), crd(body[object].y, 'y', 0));			
				}
				for (let i in body[object].trace){
					itr = i-1;
					itr = itr < 0?0:itr;

					ctx.lineTo(crd(body[object].trace[itr][0], 'x', 0), crd(body[object].trace[itr][1], 'y', 0));
				}			
				ctx.stroke();
			}
		}
		if (!isEmptyObject(body[object].trace) && switcher.traj_mode != 2 && switcher.traj_mode != 3 && switcher.traj_mode != 4) {body[object].trace = [];};

		//console.log(R);
		//arr = Object.keys(body);
		//ctx.beginPath();
	};
	//Функции притяжения
	function gravity_func(sin, cos, R, func_num, dir, mass, user_func){
		//Обратно-пропорционально квадрату расстояния
		if (func_num == 1){
			kff = G*mass*10*t*t;
			vx = kff*(cos/(R*R));//(obj2.x-obj.x)/10000;//~1;
			vy = kff*(sin/(R*R));//(obj2.y-obj.y)/10000;//~-0.522;
		}
		//Обранто-пропорционально кубу расстояния
		if (func_num == 0){
			kff = G*mass*1000*t*t;
			vx = kff*(cos/(R*R*R));
			vy = kff*(sin/(R*R*R));
		}
		//Обранто-пропорционально расстоянию
		if (func_num == 2){
			kff = G*mass*0.1*t*t;
			vx = kff*(cos/R);
			vy = kff*(sin/R);
		}
		//Постоянное притяжение
		if (func_num == 3){
			kff = G*mass*0.001*t*t;
			vx = kff*(cos);
			vy = kff*(sin);
		}
		//Пропорционально расстоянию
		if (func_num == 4){
			kff = G*mass*0.00001*t*t;
			vx = kff*(cos*R);
			vy = kff*(sin*R);
		}
		//Функция пользователя
		if (user_func){
			//
		}
		//Отправить вектор x
		if (dir == 'vx'){
			return vx;
		}
		//Отправить вектор y 
		if (dir == 'vy'){
			return vy;
		}
	}

	function visual_trajectory(){
		mcx = mouse_coords[2] ? mouse_coords[2] - (mouse_coords[2] - mouse_coords[0])/10 : mouse_coords[0];
		mcy = mouse_coords[3] ? mouse_coords[3] - (mouse_coords[3] - mouse_coords[1])/10 : mouse_coords[1];

		if (!(Math.abs(mouse[0]-mouse_coords[0]) <= dis_zone && Math.abs(mouse[1]-mouse_coords[1]) <= dis_zone)){
			//clear('#000000');
			swch.vis_traj = true;
			offsX = -10;
			offsY = -30;
			if (switcher.device == 'mobile'){
				offsX = -25;
				offsY = -140;
			}
			$('.power').css({left: mouse_coords[0]+offsX, top: mouse_coords[1]+offsY, display: 'block', color: obj_color});
			$('.power').html(Math.round(rad(mouse[0], mouse[1], mouse_coords[0], mouse_coords[1]) * switcher.launch_pwr * 100)/100);
		}
		D = Math.sqrt(obj_radius)*zm*2 < 0.5 ? 0.5 : Math.sqrt(obj_radius)*zm*2;
		ctx2.strokeStyle = obj_color;
		ctx2.lineWidth = D;
		ctx2.beginPath();
		ctx2.moveTo(mouse[0], mouse[1]);
		ctx2.lineTo(mcx, mcy);
		ctx2.stroke();

		ctx2.strokeStyle = '#000a';
		ctx2.lineWidth = D;
		ctx2.beginPath();
		ctx2.moveTo(mouse[0], mouse[1]);
		ctx2.lineTo(mcx, mcy);
		ctx2.stroke();

		ctx2.beginPath();
		ctx2.fillStyle = obj_color;
		ctx2.arc(mpos[0], mpos[1], D/2, 0, 7);
		ctx2.fill();
	}
	//Необходимая скорость для круговой орбиты
	function f_orbital_speed(px, py, obj){
		if (body[obj]){
			R = rad(crd(px, 'x', 1), crd(py, 'y', 1), crd(body[obj].x, 'x', 1), crd(body[obj].y, 'y', 1))*zm;
			V = Math.sqrt((body[obj].m*10*t*t)*(R)/G);
			a = body[obj].x - px;
			b = body[obj].y - py;
			sin = b/R; cos = a/R;
			svx = -(sin/V)*body[obj].m*10*t*t;
			svy = (cos/V)*body[obj].m*10*t*t;
			if (obj_reverse){
				svx = -svx;
				svy = -svy;
			}
			return [svx, svy];		
		} else {
			return [0, 0];
		}
	}
	//Выбор объекта по функции
	function select_object(mode = 0){
		sel = [Infinity, '', 0];
		if (mode == 2){
			elem = '';
			for (i in body){
				elem = i;
			}
			sel[1] = elem;
		}
		if (mode == 0 || mode == 1){
			for (let i in body){
				r = rad(mouse_coords[0], mouse_coords[1], crd(body[i].x, 'x', 0), crd(body[i].y, 'y', 0));
				if (r < sel[0] && mode == 0){
					sel[0] = r;
					sel[1] = i;
				} else 
				if (r > sel[2] && mode == 1){
					sel[2] = r;
					sel[1] = i;
				}
			}
		}
		if (mode == 3){
			for(let i in body){
				if (body[i].m > sel[2]){
					sel[2] = body[i].m;
					sel[1] = i;
				}
			}
		}
		return 	sel[1];
	}
	//Визуальная дистанция до главного объекта
	function vis_distance(obj_cord, col = '#888888', targ_obj = swch.orb_obj){
		if (body[targ_obj]){
			size = rad(obj_cord[0], obj_cord[1], crd(body[targ_obj].x, 'x', 0), crd(body[targ_obj].y, 'y', 0));
			if (size > Math.sqrt(body[targ_obj].m)*zm){
				ctx2.strokeStyle = col;
				ctx2.lineWidth = 2;
				ctx2.beginPath();
				ctx2.moveTo(obj_cord[0], obj_cord[1]);
				ctx2.lineTo(crd(body[targ_obj].x, 'x', 0), crd(body[targ_obj].y, 'y', 0));
				ctx2.stroke();

				ctx2.lineWidth = 0.5;
				ctx2.beginPath();
				ctx2.arc(crd(body[targ_obj].x, 'x', 0), crd(body[targ_obj].y, 'y', 0), size, 0, 7);
				//ctx2.ellipse(crd(body[targ_obj].x, 'x', 0), crd(body[targ_obj].y, 'y', 0), size, size, 0, 0, 7);
				ctx2.stroke();

				ctx2.beginPath();
				ctx2.fillStyle = col;
				ctx2.arc(crd(body[targ_obj].x, 'x', 0), crd(body[targ_obj].y, 'y', 0), 3, 0, 7);
				ctx2.arc(obj_cord[0], obj_cord[1], 3, 0, 7);
				ctx2.fill();
				ctx2.beginPath();

				$('.power').css({left: mouse_coords[0]-10, top: mouse_coords[1]-30, display: 'block', color: col});
				$('.power').html((Math.round(size/zm*1000)/1000));
			} else {
				if (!leftMouseDown){
					$('.power').css({display: 'none'});			
				}
			}		
		} else {
			$('.power').css({display: 'none'});
		}
	}
	//Визуальное выдиление объекта
	function visual_select(mode, color, object = '') {
		if (!bodyEmpty){
			visual_sel_ref = true;
			del_radius = [Infinity, '', 0];
			if (!body[object]){
				del_radius[1] = select_object(mode);			
			} else {
				del_radius[1] = object;
			}

			if (switcher.del_pulse <= 5){
				switcher.del_pulse_state = true;
			} 
			if (switcher.del_pulse >= 30){
				switcher.del_pulse_state = false;
			}

			if (switcher.del_pulse_state){
				switcher.del_pulse += 1;
			}else{
				switcher.del_pulse -= 0.5;
			}

			ctx2.beginPath();
			ctx2.fillStyle = color;
			ctx2.arc((crd(body[del_radius[1]].x, 'x', 0)), (crd(body[del_radius[1]].y, 'y', 0)), Math.sqrt(body[del_radius[1]].m)*zm+switcher.del_pulse, 0, 7);
			ctx2.fill();
			ctx2.beginPath();

			col = '#fff';
			if (color.length == 4){col = color;}
			if (color.length == 5){col = color.slice(0, 4);}
			if (color.length == 7){col = color;}
			if (color.length == 9){col = color.slice(0, 8);}

			ctx2.beginPath();
			ctx2.strokeStyle = col;
			ctx2.lineWidth = 0.7;
			ctx2.arc((crd(body[del_radius[1]].x, 'x', 0)), (crd(body[del_radius[1]].y, 'y', 0)), Math.sqrt(body[del_radius[1]].m)*zm+switcher.del_pulse, 0, 7);
			ctx2.stroke();
			ctx2.beginPath();		
		}
	}
	//Удаление объекта
	function del_obj(obj_name_id){
		delete body[obj_name_id];
		show_obj_count();
	}
	//Создание нового объекта
	function obj_sp(point_x,point_y,ob_col,vx,vy){
		//Цвет объекта
		if (obj_rand_color){
			if (!ob_col){obj_color = randColor();}else{obj_color = ob_col;};
			sessionStorage['obj_color'] = obj_color;
		};

		if (spawn){
			num ++;
			svx = 0;
			svy = 0;
			px = mouse[0]; py = mouse[1];
			if (!point_x && !point_y){
				let mcx = mouse_coords[2] ? mouse_coords[2] - (mouse_coords[2] - mouse[2])/10 : mouse[2];
				let mcy = mouse_coords[3] ? mouse_coords[3] - (mouse_coords[3] - mouse[3])/10 : mouse[3];
				svx = ((mouse[0]-mcx)/30)*t * switcher.launch_pwr;
				svy = ((mouse[1]-mcy)/30)*t * switcher.launch_pwr;				
			} else {px = point_x; py = point_y;};

			if (((Math.abs(mouse[0]-mouse[2]) <= dis_zone && Math.abs(mouse[1]-mouse[3]) <= dis_zone) || (point_x && point_y)) && body[swch.orb_obj] && obj_cirle_orbit) {
				vel = f_orbital_speed(crd(px, 'x', 1), crd(py, 'y', 1), swch.orb_obj);
				svx = vel[0];
				svy = vel[1];
				if (!body[swch.orb_obj].lck){
					svx += body[swch.orb_obj].vx;
					svy += body[swch.orb_obj].vy;
				}
			}

			body['obj_'+num] = {'x': crd(px, 'x', 1), 'y': crd(py, 'y', 1), 'vx': svx, 'vy': svy, m: obj_radius, 'lck': false, 'color': obj_color, lck: obj_lck, trace: [], main_obj: swch.orb_obj};
			spawn = false;
		}
		new_obj_param = false;
		show_obj_count();
	}
	//Прощет траэктории
	function traj_prev(obj, count = 100, col, full_object = false){
		body_traj = JSON.parse(JSON.stringify(body));
		//sp_obj = [0,1];
		virt_obj = 'virtual';
		if (full_object){
			virtual = JSON.parse(JSON.stringify(obj));
			body_traj['virtual'] = JSON.parse(JSON.stringify(virtual));
		}

		//if (sp_obj[0]<sp_obj[1]){
		//	new_obj_param = [crd(body_traj.virtual.x, 'x', 0), crd(body_traj.virtual.y, 'y', 0), body_traj.virtual.vx, body_traj.virtual.vy];
		//	sp_obj[0] == 10;
		//}
		nlock = body_traj.virtual.lck ? false : true;
		refMov = [0, 0];
		distance = [Infinity, {}, 0];
		for (let i = 0; i < count && nlock; i++){
			body_traj_prev = JSON.parse(JSON.stringify(body_traj));
			for (let object in body_traj){
				//Refresh_func===============
				obj1 = body_traj_prev[object];
				radius = rad(body_traj_prev[virt_obj].x, body_traj_prev[virt_obj].y, body_traj_prev[object].x, body_traj_prev[object].y);
				if (object != virt_obj && radius < distance[0]){
					distance[0] = radius;
					distance[1] = {x: body_traj_prev[object].x, y: body_traj_prev[object].y, x2: body_traj_prev[virt_obj].x, y2: body_traj_prev[virt_obj].y, obj_name: object};
					distance[2] = i;
				}
				if (switcher.interact == 0){
					for (let i in body_traj){
						if (i == object){continue;};
						obj2 = body_traj_prev[i];
						R = rad(obj1.x, obj1.y, obj2.x, obj2.y);
						
						a = obj2.x - obj1.x;
						b = obj2.y - obj1.y;
						sin = b/R; cos = a/R;

						if (body_traj[object]){
							vx = gravity_func(sin, cos, R, switcher.r_gm, 'vx', obj2.m);
							vy = gravity_func(sin, cos, R, switcher.r_gm, 'vy', obj2.m);

							if(!obj1.lck && !(mbut == 'move' && leftMouseDown && object == mov_obj) && body_traj[object]){
								body_traj[object].vx += vx;
								body_traj[object].vy += vy;
							}
						}					
						if (R - (Math.sqrt(obj1.m) + Math.sqrt(obj2.m)/2) <= 0){
							if (obj1.m >= obj2.m){
								body_traj[object].color = mixColors(obj1.color, obj2.color, obj1.m, obj2.m);
								body_traj[object].m = obj1.m + obj2.m;
								if (!obj1.lck){
									body_traj[object].vx = (obj1.m*obj1.vx+obj2.m*obj2.vx)/(obj1.m+obj2.m);//Формула абсолютно-неупругого столкновения
									body_traj[object].vy = (obj1.m*obj1.vy+obj2.m*obj2.vy)/(obj1.m+obj2.m);//Формула абсолютно-неупругого столкновения
								}
								delete body_traj[i];
								body_traj[object].trash = true;
								if (i == virt_obj){
									virt_obj = object;
									nlock = obj1.lck ? false : true;
								}
								continue;
							}else{continue;}
						}
					}			
				}
				if (switcher.interact == 1 && body_traj_prev[swch.orb_obj]){
					if (object != swch.orb_obj && body_traj[object]){
						obj2 = body_traj_prev[swch.orb_obj];

						R = rad(obj1.x, obj1.y, obj2.x, obj2.y);

						a = obj2.x - obj1.x;
						b = obj2.y - obj1.y;
						sin = b/R; cos = a/R;

						if (body_traj[object]){
							vx = gravity_func(sin, cos, R, switcher.r_gm, 'vx', obj2.m);
							vy = gravity_func(sin, cos, R, switcher.r_gm, 'vy', obj2.m);

							if(!obj1.lck && !(mbut == 'move' && leftMouseDown && object == mov_obj) && body_traj[object]){
								body_traj[object].vx += vx;
								body_traj[object].vy += vy;
							}

						}

						if(!obj1.lck && !switcher.pause2 && !(mbut == 'move' && leftMouseDown && object == mov_obj)){
							body_traj[object].vx += vx;
							body_traj[object].vy += vy;
						}
					}
				}
				//End refresh_func========

				prev_x = obj1.x;
				prev_y = obj1.y;
				if(!obj1.lck && body_traj[object]){
					body_traj[object].x += body_traj[object].vx;
					body_traj[object].y += body_traj[object].vy;
				}
			}

			if (body_traj[virt_obj]){
				//ctx2.strokeStyle = col;
				//ctx2.lineWidth = 2;
				//ctx2.beginPath();
				//ctx2.moveTo(prev_x, prev_y);
				//ctx2.lineTo(body_traj[virt_obj].x + cam_x, body_traj[virt_obj].y + cam_y);
				//ctx2.stroke();
				if (swch.t_object == swch.orb_obj && body_traj[swch.orb_obj]){
					refMov[0] += body_traj[swch.orb_obj].vx;
					refMov[1] += body_traj[swch.orb_obj].vy;					
				}
				for (let ob in body_traj){
					R_size = ob == virt_obj ? 1.5 : 0.8;
					clr = ob == virt_obj ? col[1]:body_traj[ob].color+'88';
					if (body_traj[ob].trash){
						clr = '#ff666666';
						R_size = 2;
					}
					ctx2.beginPath();
					ctx2.fillStyle = clr;
					ctx2.arc(crd(body_traj[ob].x-refMov[0], 'x', 0), crd(body_traj[ob].y-refMov[1], 'y', 0), R_size, 0, 7);
					ctx2.fill();
					ctx2.beginPath();
				}
			//ctx2.beginPath();
			//ctx2.fillStyle = col;
			//ctx2.arc(crd(body_traj[virt_obj].x, 'x', 0), crd(body_traj[virt_obj].y, 'y', 0), 1.5, 0, 7);
			//ctx2.fill();
			//ctx2.beginPath();				
			}	
		}
		if (distance[2] <= count){
			ctx2.beginPath();
			ctx2.fillStyle = body[distance[1].obj_name].color+'88';
			mass = Math.sqrt(body[distance[1].obj_name].m) < 2 ? 2 : Math.sqrt(body[distance[1].obj_name].m);
			ctx2.arc(crd(distance[1].x-refMov[0], 'x', 0), crd(distance[1].y-refMov[1], 'y', 0), mass*zm, 0, 7);
			ctx2.fill();
			ctx2.beginPath();
			ctx2.fillStyle = obj_color+'aa';
			mass = Math.sqrt(obj_radius)*zm < 2 ? 2 : Math.sqrt(obj_radius)*zm;
			ctx2.arc(crd(distance[1].x2-refMov[0], 'x', 0), crd(distance[1].y2-refMov[1], 'y', 0), mass, 0, 7);
			ctx2.fill();
			ctx2.beginPath();
		}
	}
	//Scene scale
	document.addEventListener('wheel', function(e){
		e_elem = e.target;
		if (layers_id.includes(e_elem.id)){
			ms = [e.clientX, e.clientY];
			if (!middleMouseDown){
				vl = 1.25;
				if (!swch.prev_t_obj && !switcher.zoomToScreenCenter){
					if (e.deltaY > 0){
						zm /= vl;
						mov[0] = mov[0] / vl - (wind_width/2 - ms[0]) / (vl/(vl-1));
						mov[1] = mov[1] / vl - (wind_height/2 - ms[1]) / (vl/(vl-1));
						mov[2] = mov[0]; mov[3] = mov[1];
					} else {
						zm *= vl
						mov[0] = mov[0] * vl + (wind_width/2 - ms[0]) / (1/(vl-1));
						mov[1] = mov[1] * vl + (wind_height/2 - ms[1]) / (1/(vl-1));
						mov[2] = mov[0]; mov[3] = mov[1];
					}
				} else {
					if (e.deltaY > 0){
						zm /= vl;
						mov[0] /= vl;
						mov[1] /= vl;
						mov[2] = mov[0]; mov[3] = mov[1];
					} else {
						zm *= vl
						mov[0] *= vl;
						mov[1] *= vl;
						mov[2] = mov[0]; mov[3] = mov[1];
					}
				}
				clear('#000');
			}
		}
	});
	//События клавиатуры
	document.addEventListener('keydown', function(e){
		//console.log(e.keyCode);
		if (!e.ctrlKey){
			//Space button creato circle orbit object
			if (e.keyCode == 32){
				if (mbut == 'create' && mouse_coords[0]){
					spawn = true;
					obj_sp(mouse_coords[0], mouse_coords[1]);			
				}
				if (mbut == 'delete' && !bodyEmpty){
					//$('.canvas').mousedown();
					//$('.canvas').mouseup();
					delete_obj = select_object(switcher.del_radio);
					ctx.beginPath();
					ctx.fillStyle = '#000';
					ctx.arc(body[delete_obj].x, body[delete_obj].y, Math.sqrt(body[delete_obj].m)+1, 0, 7);
					ctx.fill();
					del_obj(delete_obj);
					deleted();
				}
			}
			//create
			if (e.keyCode == 67){ $('#create').mousedown(); }
			//delete
			if (e.keyCode==68){ $('#delete').mousedown(); }
			//edit
			if (e.keyCode==69){ $('#edit').mousedown(); }
			//trajectory
			if (e.keyCode == 84){ $('#trajectory').mousedown(); }
			//timedown
			if (e.keyCode == 188){ $('#timedown').mousedown(); }
			//play
			if (e.keyCode == 191){ $('#play').mousedown(); }
			//timeup
			if (e.keyCode == 190){ $('#timeup').mousedown(); }
			//move
			if (e.keyCode == 77){ $('#move').mousedown(); }
			//pause
			if (e.keyCode == 80){ $('#pause').mousedown(); }
			//help
			if (e.keyCode == 72){ $('#help').mousedown(); }
			//settings
			if (e.keyCode == 83 && !e.ctrlKey){ $('#settings').mousedown(); }
			//camera
			if (e.keyCode == 86){ $('#camera').mousedown(); }
			//T+
			if (e.keyCode == 187){
				ref_sped *= 2;
				console.log(ref_sped);
			}
			//T-
			if (e.keyCode == 189){
				if (ref_sped > 1){ref_sped /= 2;}
				console.log(ref_sped);
			}
			//zoom in
			if (e.keyCode == 107){
				//ctx.scale(2, 2);
				//glob_scale *= 2;
				//ctx.translate(-canv.width/4, -canv.height/4);
				zm *= 2;
				clear('#000');
			}
			//zoom out
			if (e.keyCode == 109){
				//ctx.scale(0.5, 0.5);
				//glob_scale *= 0.5;
				//ctx.translate(canv.width/2, canv.height/2);
				zm *= 0.5;
				clear('#000');
			}
			if (e.keyCode == 120){
				if (!show_fps){
					show_fps = true;
					$('.fps').css({display: 'block'});
					fps_interval = setInterval(fps, 1000)
				} else {
					show_fps = false;
					fps_count = 0;
					$('.fps').css({display: 'none'});
					clearInterval(fps_interval);
				}
			}
		}
		//Ctrl keys
		//Ctrl+Z
		if (e.keyCode == 90){ if(e.ctrlKey){del_obj(select_object(2));} }
	});
	noMenuBtns = ['clear', 'timedown', 'play', 'pause', 'timeup', 'refresh', 'music'];
	$('.btn').mousedown(function(){
		//alert($(this).attr('id'));
		pfb = mbut;
		mbut = $(this).attr('id');
		btn_id = mbut;
		if (mbut == 'clear'){
			clear('#000');
			for (let i in body){
				body[i].trace = [];
			}
		} else
		if (mbut == 'create'){
			if (menu_state && btn_id == pfb){
				$('.menu_options').css('display', 'none');
				menu_state = false;
			}else{
				close_all_menus();
				menu_state = true;
				$('.menu_options').fadeIn(0);
			}
			change_state('create');
		}
		if (mbut == 'edit'){
			if (menu_state && btn_id == pfb){
				$('.edit_menu').css('display', 'none');
				menu_state = false;
			}else{
				close_all_menus();
				menu_state = true;
				$('.edit_menu').fadeIn(0);
			}
			change_state('edit');
		}
		if (mbut == 'trajectory'){
			if (menu_state && btn_id == pfb){
				$('.traj_menu').css('display', 'none');
				menu_state = false;
			}else{
				close_all_menus();
				menu_state = true;	
				$('.traj_menu').fadeIn(0);
			}
			change_state('trajectory');
		}
		if (mbut == 'camera'){
			if (menu_state && btn_id == pfb){
				$('.camera_menu').css('display', 'none');
				menu_state = false;
			}else{
				close_all_menus();
				menu_state = true;
				$('.camera_menu').fadeIn(0);
			}
			change_state('camera');
		}
		if (mbut == 'timedown'){
			pretime = times;
			times /= 2;
			tsw = true;
		} else
		if (mbut == 'pause'){
			pretime = times;
			tsw = true;
			if (switcher.pause){
				switcher.pause = false;
				img_name = 'pause';
				change_state('play');
				change_state_play = setTimeout(function(){change_state(pfb);}, 1000);			
			} else {
				switcher.pause = true;
				img_name = 'play';
				change_state('pause');	
				try{clearTimeout(change_state_play)}catch{};
			}
			$('img',this).attr('src', 'ico/'+img_name+'.png');
			//$('.time_speed h2').html('T - X0');
		} else
		if (mbut == 'play'){
			pretime = times;
			times = 1;
			switcher.pause = false;
			tsw = true;
			$('#pause img').attr('src', 'ico/pause.png');
			change_state('restore');
			try{clearTimeout(change_state_play)}catch{};
			change_state_play = setTimeout(function(){change_state(pfb);}, 1000);
		} else
		if (mbut == 'timeup'){
			pretime = times;
			times *= 2;
			tsw = true;
		} else
		if (mbut == 'delete'){
			change_state('delete');
			
			if (menu_state && btn_id == pfb){
				$('.del_menu_options').css('display', 'none');
				menu_state = false;
			}else{
				close_all_menus();
				$('.del_menu_options').fadeIn(0); 				
				menu_state = true;
			}
		}
		if (mbut == 'move'){
			close_all_menus();
			change_state('move');
		}else
		if (mbut == 'refresh'){
			if (confirm("Это действие приведёт к обновлению страницы. Вы уверены?")){
				location.href = location;
			}
		}else
		if (mbut == 'music'){
			if (switcher.music){
				soundStop();
				switcher.music = false;
			} else {
				soundPlay();
				switcher.music = true;
			}
		}else
		if (mbut == 'help'){
			if (menu_state && btn_id == pfb){
				$('.help_menu').css('display', 'none');
				menu_state = false;
			}else{
				close_all_menus();
				menu_state = true;
				$('.help_menu').fadeIn(0);
			}
			change_state('help');
		}
		if (mbut == 'settings'){
			if (menu_state && btn_id == pfb){
				$('.settings').css('display', 'none');
				menu_state = false;	
			} else {
				close_all_menus();
				$('.settings').fadeIn(0);
				menu_state = true;
			}
			change_state('settings');
		}
		if (noMenuBtns.includes(mbut)){
			mbut = pfb;
		}
		
		$('#'+pfb).css({'background': ''});
		$('#'+mbut).css({'background-color': '#fff2'});
		if (menu_state){$('#'+mbut).css({'background-color': '#fff8'});}
		sessionStorage['mbut'] = mbut;
		sessionStorage['menu_state'] = menu_state;
	});
	if (menu_state){
		$('#'+mbut).css({background: '#fff8'});
	} else {
		$('#'+mbut).css({background: '#fff2'});
	}

	$('.button').mouseup(function(){
		cbut = $(this).attr('id');
		//alert(cbut);
		if (cbut == 'select_track'){
			if (swch.s_track){
				swch.s_track = false;
			} else {
				swch.s_track = true;
			}		
		}
		if (cbut == 'clear_camera_settings'){
			clear('#000');
			swch.t_object = false;
			zm = 1;
			mov[0] = 0;
			mov[1] = 0;
			mov[2] = 0;
			mov[3] = 0;
		}
		if (cbut == 'select_edit_obj'){
			if (swch.s_edit){
				swch.s_edit = false;
			} else {
				swch.s_edit = true;
			}				
		}
		if (cbut == 'reset_speed_btn' && body[swch.edit_obj]){
			body[swch.edit_obj].vx = 0;
			body[swch.edit_obj].vy = 0;
		}
		if (cbut == 'select_main_obj'){
			switcher.sel_orb_obj = switcher.sel_orb_obj?false:true;
			mbut = switcher.sel_orb_obj?'sel_orb_obj':'create';
		}
		if (cbut == 'wrap_time'){
			pretime = times;
			times *= -1;
			t_wrap = true;
		}
		if (cbut == 'save_file'){
			switcher.pause = true;
			change_state('pause');
			body_write = JSON.parse(JSON.stringify(body));
			for(let i in body_write){
				body_write[i].trace = [];
			}
			my_data = {body: body_write, switcher: switcher, t_wrap: t_wrap, num: num, times: times, G: G};
			my_data = JSON.stringify(my_data);
			writeFile("No Name.txt", my_data);
			delete body_write;
			//saveFile(name, forat, value, event);
		}
		if (cbut == 'sel_file_but'){
			$('#select_file').click();
		}

	});
	$('.close_btn').mouseup(function(){
		close_all_menus();
		sessionStorage['mbut'] = mbut;
		sessionStorage['menu_state'] = menu_state;
	});
	no_del_anim = false;
	var mytimeout;
	function deleted(){
		if (!no_del_anim){
			$('.deleted').css({display: 'block'});
			$('.deleted').animate({right: 10}, 500);
			clearTimeout(mytimeout);				
		}
		mytimeout = setTimeout(function(){
			no_del_anim = true;
			$('.deleted').animate({right: -300}, 500, function(){
				$('.deleted').css({display: 'none'});
				no_del_anim = false;
			});
		}, 2000);
	}

	function close_all_menus(e){
		menu_state = false;
		$('#'+mbut).css({background: '#fff2'});
		$('.menu_options').css('display', 'none');
		$('.del_menu_options').css('display', 'none');
		$('.help_menu').css('display', 'none');
		$('.settings').css('display', 'none');
		$('.camera_menu').css('display', 'none');
		$('.edit_menu').css('display', 'none');
		$('.traj_menu').css('display', 'none');
	}
	function change_state(img, format='png', path = 'ico/'){
		$('.state').html('<img src="'+path+img+'.'+format+'" alt="">');
	}

	//Cмешивение Цветов===================================
	function toHexInt(i){
	    return parseInt(i, 16);
	}

	function _mixColors(color1, color2, m1, m2){

		var color = "";
	    /*
	     * Сначала считаем среднее по красному цвету - xx---- + yy----
	     * Затем по зеленому --xx-- + --yy--
	     * И по синему ----xx + ----yy
	     */
	    for(var i = 0; i < color1.length; i += 2){
	        var partColor = Math.round((toHexInt(color1.slice(i, i+2))*m1 + toHexInt(color2.slice(i, i+2))*m2)/(m1+m2)).toString(16);

	        color += (partColor.length === 1 ? "0" + partColor : partColor);
	    }
	    return color;
	}

	function mixColors(color1, color2, m1 = 50, m2 = 50){
		var c1 = color1[0] === "#" ? color1.slice(1) : color1;
		var c2 = color2[0] === "#" ? color2.slice(1) : color2;

		return "#" + _mixColors(c1, c2, m1, m2);
	}

	function getRandomArbitrary(min, max) {
		return Math.random() * (max - min) + min;
	}

	$('.col_select').on('change', function(){
		this.value = obj_color;
	});

	function randColor() {
		var r = Math.floor(getRandomArbitrary(40, 255)),
			g = Math.floor(getRandomArbitrary(40, 255)),
			b = Math.floor(getRandomArbitrary(40, 255));

		r = r.toString(16); g = g.toString(16); b = b.toString(16);

		r = r.length < 2 ? '0'+r.toString(16) : r.toString(16);
		g = g.length < 2 ? '0'+g.toString(16) : g.toString(16);
		b = b.length < 2 ? '0'+b.toString(16) : b.toString(16);
		color = '#' + r + g + b;
		//$('#col_select').attr({'value': color});
		$('.div_col_select').html('<input type=color class=col_select value='+color+
			' id=col_select onchange="obj_color = this.value; sessionStorage[\'obj_color\'] = this.value;"\
			 style="padding: 0; border: none; width: 76px; height: 30px;" onmouseout="this.blur();">');
		return color;
	}

	function sumArray(arr){
		val = 0;
		for (let i in arr){val += arr[i];}
		return val;
	}

	//=====================================================

	var audio = new Audio(); // Создаём новый элемент Audio
	audio_src = ['music1.mp3', 'music2.mp3'];
	audio.loop = true;

	function soundPlay() {
		rand_audio = Math.round(getRandomArbitrary(0, audio_src.length - 1));
		audio.src = '/music/'+audio_src[rand_audio]; // Указываем путь к звуку
		audio.play();
	}
	function soundStop() {
		audio.pause();
	}

	if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
		//$('.').css({width: , height: });
		switcher.device = 'mobile';
		dis_zone = 20;
		if (window.innerHeight > window.innerWidth){
			$('body').css({'font-size': 40});
			$('.btn').css({'height': 100, 'width': 130});
			$('.btn img').css({'max-width': 65, 'max-height': 65});
			$('.menu_pos').css({top: 0, left: 139});
			$('.menu').css({'flex-direction': 'column'});
			$('.time_speed').css({left: 10, bottom: 80});
			$('.state').css({top: 10});
			$('.checkbox').css({width: 75, height: 75});
			$('.radius_select').css({'font-size': 50, width: 200, 'border-radius': 10});
			$('.col_select').css({width: 200, height: 60, 'border-radius': 10});
			//$('.menu_pos_size').css({'border-bottom-right-radius': 50});
			$('#timedown').css({'border-top': '6px solid #fff7'});
			$('#timeup').css({'border-bottom': '6px solid #fff7'});
		} else {
			$('.time_speed').css({right: 10, top: 130});
			$('.menu_pos').css({top: $('.menu').outerHeight() , left: 0});
			$('body').css({fontSize: '2vmax'});
			$('#timedown').css({'border-left': '3px solid #fff7'});
			$('#timeup').css({'border-right': '3px solid #fff7'});
		}
		$('.input_num').css({width: '20vmin'});
		$('.power').css({fontSize: '5vmin'})
	  	$('.menu_close').css({padding: '3vmin'});
	  	$('body').css({fontSize: '2vmax'});
	} else {
		$('#timedown').css({'border-left': '3px solid #fff7'});
		$('#timeup').css({'border-right': '3px solid #fff7'});
	  	$('.time_speed').css({right: 10, top: 130});
	  	$('.menu_pos').css({top: $('.menu').outerHeight() , left: 0});
	}
	//Запись файла
	function writeFile(name, value) {
		var val = value;
		if (value === undefined) {
			val = "";
		}
		var download = document.createElement("a");
		download.href = 'data:application/txt;charset=utf-8,' + encodeURIComponent(val);
		download.download = name;
		download.style.display = "none";
		download.id = "download";
		document.body.appendChild(download);
		document.getElementById("download").click();
		document.body.removeChild(download);
	}

//function saveFile(name, forat, value, event){
//	var csvData = 'data:application/txt;charset=utf-8,' + encodeURIComponent(value);
//	event.href = csvData;
//	event.target = '_blank';
//	event.download = name+'.'+format;		
//}

	function readFile(input) {
		let file = input.files[0];

		let reader = new FileReader();

		reader.readAsText(file);

		reader.onload = function() {
			try {
			  	file_data = JSON.parse(reader.result);
			  	body = file_data.body;
			  	switcher.interact = file_data.switcher.interact;
			  	switcher.gravit_mode = file_data.switcher.gravit_mode;
			  	tsw = times == file_data.times ? false : true;
			  	times = file_data.times ? file_data.times : 1;
			  	G = file_data.G ? file_data.G : 1;
			  	pretime = times;
			  	num = file_data.num;
			  	sel_and_rest();
			  	clear('#000');
			} catch(err) {
				alert('Несовместимый файл!');
			}
			document.getElementById('select_file').value = '';
		};

		reader.onerror = function() {
			alert("Ошибка чтения файла!");
		};
	}

	function isEmptyObject(obj) {
	    for (var i in obj) {
	        //if (obj.hasOwnProperty(i)) {
	        return false;
	        //}
	    }
	    return true;
	}

	function intin(n, a, b){
		if (a-b>0){
			if (n<a&&n>b){
				return true;
			}else{
				return false;
			}		
		} else {
			if (n>a&&n<b){
				return true;
			}else{
				return false;
			}
		}
	}

});
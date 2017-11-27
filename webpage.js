var _=require('lodash'),
	regl=require('regl')({attributes: {alpha: true}}),
	domready=require("domready"),
	UIL=require('uil'),
	d3=require("d3"),
	sphereBuilder=require('primitive-sphere'),
	glMatrix=require('gl-matrix'),
	mat4=glMatrix.mat4,
	quat=glMatrix.quat;

var primType='line loop',circleRad=1,rockScale=0.25,viewScale=0.2,loggingOn=false;
var gravityScale=100;
var rockArray=[];
var rockCount=200;
var planetArray=[];
var planetCount=5;

function dot(a, b,scl) {
  return [(a[0] + (b[0]*scl)), (a[1] + (b[1]*scl)), (a[2] + (b[2]*scl))];
}

//mousetocenter,offset

window.onmousedown= function(event){
	console.log(event);
//		rockArray[r].pos.x=event.clientX;
//		rockArray[r].pos.y=event.clientY;
var mouseX=event.clientX;
var mouseY=event.clientY;
console.log(mouseX,mouseY);
rockArray[rockCount]={
		pos: {
			x:mouseX,//(Math.random()*400)-200,
			y:mouseY,//(Math.random()*400)-200,
			z:0
		},
		head: {
			x:(Math.random()*0.5)-0.25,
			y:(Math.random()*0.5)-0.25,
			z:0
		},
		mass: 1,
		history: []
	};
rockCount++
};

for(var num=0;num<rockCount;num++){
	rockArray[num]={
		pos: {
			x:(Math.random()*3200)-1600,
			y:(Math.random()*2200)-1100,
			z:0
		},
		head: {
			x:(Math.random()*0.5)-0.25,
			y:(Math.random()*0.5)-0.25,
			z:0
		},
		mass: 1,
		history: []
	};
}
//>2, feedback,planetInterGap,massLink
for(var pi=0;pi<planetCount;pi++){
	planetArray[pi]={
		pos:{
			x:(Math.random()*12000)-6000,
			y:(Math.random()*5000)-2500,
			z:0
		},
		mass:1+((Math.random()*10)*(Math.random()*4))
	};
}
console.log('planets: ',planetArray);

function reglStuff(){
	var drawFeedbackIsOn=true;
	var sphereRadius=1;
	var sphereMesh=sphereBuilder(sphereRadius,{segments: 16});
	
	var drawT=regl({
		frag: document.getElementById('FShade').text,
		vert: document.getElementById('VShade').text ,

		attributes:{
			position: sphereMesh.positions,
			normal: sphereMesh.normals
		},
		elements: sphereMesh.cells,
		primitive: regl.prop('prim'),
		uniforms:{
			color: regl.prop('color'),
			zoom: regl.prop('zoom'),
			scale: regl.prop('scale'),
			translation: regl.prop('translation'),  
			pulse: regl.prop('pulse'),
			model: mat4.fromRotationTranslationScale([], quat.rotateX([],quat.create(),Math.PI/0.5), [0,0,0], [1,1,1]),
			res: function(o){
			return [o.viewportWidth,o.viewportHeight];
			}
		},
	});

	const feedBackTexture = regl.texture({
		copy: true,
		min: 'linear',
		mag: 'linear'
	});

	const drawFeedback = regl({
		frag: document.getElementById('FFeed').text,
		vert: document.getElementById('VFeed').text,
		attributes:{
			position: [-2, 0, 0, -2, 2, 2]
		},
		uniforms:{
			texture: feedBackTexture,
			t: ({tick}) => 0.001 * tick
		},
		depth:{
			enable: false
		},
		count: 3,
		blend:{
			enable: true,
			func:{
				src: 'src alpha',
				dst: 'dst color'
			}
		},
	});

	const drawHistory = regl({
		frag: document.getElementById('histF').text,
		vert: document.getElementById('histV').text,
		attributes:{
			position: regl.prop('positions'),
		},
		primitive:'line',
		uniforms:{
			color: regl.prop('color'),
			zoom: regl.prop('zoom'),
			scale: regl.prop('scale'),
			
			model: mat4.fromRotationTranslationScale([], quat.rotateX([],quat.create(),Math.PI/0.5), [0,0,0], [1,1,1]),
			res: function(o){
			return [o.viewportWidth,o.viewportHeight];
			}
		},
		count: regl.prop('count')
	});


	var earth={
			pos: {
				x:0,
				y:0,
				z:0
		},
			mass: 3
	};
	
	function distance(a, b){
		var dx = b.x - a.x;
		var dy = b.y - a.y;
		var dz = b.z - a.z;
		//vec3(dx,dy,dz)
		return Math.sqrt(dx*dx + dy*dy + dz*dz);
	}		
	
	function normalize(a){
		var nx=0;
		var ny=0;
		var nz=0;
		var x = a.x;
		var y = a.y;
		var z = a.z;
		var len = x * x + y * y + z * z;
		if (len > 0){
		  len = 1 / Math.sqrt(len);
		  nx = a.x * len;
		  ny = a.y * len;
		  nz = a.z * len;
		}
	return [nx,ny,nz];
	}
	
	function getDifference(a,b){
		var dx = b.x - a.x;
		var dy = b.y - a.y;
		var dz = b.z - a.z;
	return {
			x:dx,y:dy,z:dz
		}
	} 
	
	var fc=1000,head=[0,0,0];
	
	regl.frame(function(o){ //frame
		fc++;
		regl.clear({
			color:[0,0,0,1]
		})
	

			//drawFeedback();		
	
		for(var p=0;p<planetCount;p++){
			drawT({
				color: [1.1-(1/planetArray[p].mass),1.1-(1/planetArray[p].mass),(1/planetArray[p].mass),1],
			 	scale: rockScale*planetArray[p].mass*5,
				translation: [planetArray[p].pos.x,planetArray[p].pos.y,planetArray[p].pos.z],//sx,sy,0],
				pulse: (o.tick%1000)/1000,
				prim: primType,
				zoom: viewScale
			});
		}

		for(var r=0;r<rockCount;r++){
			head=[0,0,0];//normalize(rockArray[r].head);
			if(fc<100)
			console.log('head',head,fc);
			//planets
			for(var pg=0; pg<planetCount; pg++){
				var currentDistance=distance(planetArray[pg].pos,rockArray[r].pos)/circleRad;
				var diff=getDifference(planetArray[pg].pos,rockArray[r].pos);
				var gravityVector=normalize(diff);
				head=dot(head,gravityVector,(0.1*planetArray[pg].mass)/(currentDistance/gravityScale));
				if(fc<100)
				console.log('p',pg,head,gravityVector,fc);
			}
			//other rocks
			for(var rg=0; rg<rockCount; rg++){
				if(rg==r) // if the rock we are checking is us
					continue;
				var currentDistanceRock=distance(rockArray[rg].pos,rockArray[r].pos)/circleRad;
				var diffRock=getDifference(rockArray[rg].pos,rockArray[r].pos);
				var gravityVectorRock=normalize(diffRock);
				head=dot(head,gravityVectorRock,(0.01*rockArray[rg].mass)/(currentDistanceRock/gravityScale));
			}
			
			rockArray[r].head.x+=head[0];
			rockArray[r].head.y+=head[1];
			rockArray[r].head.z+=head[2];
		
			if(loggingOn){
				console.log("f",currentDistance,diff);
				console.log("-",earth.pos,rockArray[r].pos);		
			}
		
			var grav=(gravityScale/100);
	
	
			//rockArray[r].head.x=rockArray[r].head.x+(gravityVector.x*grav);
			//rockArray[r].head.y=rockArray[r].head.y+(gravityVector.y*grav);

			rockArray[r].pos.x-=rockArray[r].head.x;
			rockArray[r].pos.y-=rockArray[r].head.y;
			rockArray[r].pos.z-=rockArray[r].head.z;
			if(rockArray[r].history.length>=2000){
				rockArray[r].history.shift();
			}
			rockArray[r].history.push([rockArray[r].pos.x,rockArray[r].pos.y,rockArray[r].pos.z]);

			drawHistory({
				positions:rockArray[r].history,
				color: [0.1+(r/rockCount),0.1+((r/rockCount)*0.5),1.1-(r/rockCount),1],
			 	scale: rockScale,
				zoom: viewScale,
				count: rockArray[r].history.length
			});
			
			drawT({
				color: [0.1+(r/rockCount),0.1+((r/rockCount)*0.5),1.1-(r/rockCount),1],
			 	scale: rockScale,

				translation: [rockArray[r].pos.x,rockArray[r].pos.y,rockArray[r].pos.z],
				pulse: (o.tick%1000)/1000,
				prim: primType,
				zoom: viewScale
			});

				feedBackTexture({
					copy: true,
					min: 'linear',
					mag: 'linear'
				});	
		} //end of for loop
	}); //end of draw loop
} //end of regl stuff



domready(function () {	

//parse string to object, stringify
//string?object:string
	 
	const ws = new WebSocket('ws://localhost:8090');
	 
	ws.onopen=function(){
	  ws.send(JSON.stringify({loaded:true}));
	};
	 
	ws.onmessage=function(message){
	console.log(message);
	  var d=JSON.parse(message.data);
	  if(typeof d.id!=='undefined'){
	  	console.log('[UPDATE]',d.id,d.value);
	  	if(d.id=='wireframe'){
	  		if(d.value)//true
				primType='line loop';//default
			else
				primType='triangle';
	  	}
	  	if(d.id=='scale'){
	  		viewScale=d.value;
	  	}
	  }
	};


	var callback=function(v){
		console.log('uil change',v);
	};
	var callbackWireframe=function(v){
		ws.send(JSON.stringify({id:'wireframe',value:v}));
		if(v)
			primType='line loop';
		else
			primType='triangle';
	};
	var callbackScale=function(v){
		ws.send(JSON.stringify({id:'scale',value:v}));
		viewScale=v;
	};
	var callbackRockRadius=function(v){
		circleRad=v;
	};
	var callbackLogging=function(v){
		loggingOn=v;
	};
	var callbackGravityScale=function(v){
		ws.send(JSON.stringify({id:'gravity',value:v}));
		gravityScale=v;
	};

	
	
	var ui = new UIL.Gui( { size:300} );
	ui.add('title', { name:'Title'});
	ui.add('bool', { name:'Wireframe', callback:callbackWireframe, value: true});
	ui.add('bool', { name:'Debug Logging', callback:callbackLogging, value: loggingOn});
	ui.add('slide', { name:'Zoom', callback:callbackScale, min: 0, max: 100, step: 0.5, value:viewScale});
	ui.add('slide', { name:'Color Distance Scale', callback:callbackRockRadius, min: 0, max: 1000, step: 0.5, value:circleRad});
	ui.add('slide', { name:'Gravity &perc;', callback:callbackGravityScale, min: 0, max: 100, step: 0.5,value: gravityScale});

//	ui.add('color', { name:'Color', callback:callback, type:'html', value:0xff0000});
//	ui.add('color', { name:'Color', callback:callback, type:'rgba', value:[0,1,1,1]});
//	ui.add('string', { name:'String', callback:callback, value:'welcome to uil'});
//	ui.add('list', { name:'List', callback:callback, list:['item1', 'item2']});
//	ui.add('number', { name:'Number', callback:callback, value:rockCount, min:0, max:10, precision:2, step:1.0 });


	reglStuff();
});


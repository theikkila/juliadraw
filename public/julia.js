function shaded( context )
{
	this.init( context );
}

shaded.prototype =
{
	context: null,

	prevMouseX: null, prevMouseY: null,

	points: null, count: null,

	init: function( context )
	{
		this.context = context;
		this.context.globalCompositeOperation = 'source-over';

		this.points = new Array();
		this.count = 0;
	},

	destroy: function()
	{
	},

	strokeStart: function( mouseX, mouseY )
	{
		this.prevMouseX = mouseX;
		this.prevMouseY = mouseY;
	},

	stroke: function( mouseX, mouseY )
	{
		var i, dx, dy, d;

		this.points.push( [ mouseX, mouseY ] );
		
		this.context.lineWidth = BRUSH_SIZE;

		for (i = 0; i < this.points.length; i++)
		{
			dx = this.points[i][0] - this.points[this.count][0];
			dy = this.points[i][1] - this.points[this.count][1];
			d = dx * dx + dy * dy;

			if (d < 1000)
			{
				this.context.strokeStyle = "rgba(" + COLOR[0] + ", " + COLOR[1] + ", " + COLOR[2] + ", " + ((1 - (d / 1000)) * 0.1 * BRUSH_PRESSURE) + " )";

				this.context.beginPath();
				this.context.moveTo( this.points[this.count][0], this.points[this.count][1]);
				this.context.lineTo( this.points[i][0], this.points[i][1]);
				this.context.stroke();
			}
		}

		this.prevMouseX = mouseX;
		this.prevMouseY = mouseY;

		this.count ++;
	},

	strokeEnd: function()
	{
		
	}
}


function makeid(length) {
    var result           = [];
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result.push(characters.charAt(Math.floor(Math.random() * 
 charactersLength)));
   }
   return result.join('');
}



const REV = 6,
       BRUSHES = ["sketchy", "shaded", "chrome", "fur", "longfur", "web", "", "simple", "squares", "ribbon", "", "circles", "grid"],
       USER_AGENT = navigator.userAgent.toLowerCase();

var SCREEN_WIDTH = window.innerWidth,
    SCREEN_HEIGHT = window.innerHeight,
    BRUSH_SIZE = 1,
    BRUSH_PRESSURE = 1,
    COLOR = [0, 0, 0],
    BLACK = [0, 0, 0],
    BACKGROUND_COLOR = [250, 250, 250],
    STORAGE = null,
    brush,
    saveTimeOut,
    wacom,
	socket,
	CLIENT_ID = makeid(10),
	drawer_brushes = {},
    i,
    mouseX = 0,
    mouseY = 0,
    container,
    foregroundColorSelector,
    backgroundColorSelector,
    menu,
    about,
    canvas,
    flattenCanvas,
    context,
    isFgColorSelectorVisible = false,
    isBgColorSelectorVisible = false,
    isAboutVisible = false,
    isMenuMouseOver = false,
    shiftKeyIsDown = false,
    altKeyIsDown = false;

init();

function init()
{
	var hash, palette, embed, localStorageImage;
	
	if (USER_AGENT.search("android") > -1 || USER_AGENT.search("iphone") > -1)
		BRUSH_SIZE = 2;	
		
	if (USER_AGENT.search("safari") > -1 && USER_AGENT.search("chrome") == -1) // Safari
		STORAGE = false;
	
	document.body.style.backgroundRepeat = 'no-repeat';
	document.body.style.backgroundPosition = 'center center';	
	
	container = document.createElement('div');
	document.body.appendChild(container);

	/*
	 * TODO: In some browsers a naste "Plugin Missing" window appears and people is getting confused.
	 * Disabling it until a better way to handle it appears.
	 * 
	 * embed = document.createElement('embed');
	 * embed.id = 'wacom-plugin';
	 * embed.type = 'application/x-wacom-tablet';
	 * document.body.appendChild(embed);
	 *
	 * wacom = document.embeds["wacom-plugin"];
	 */

	canvas = document.createElement("canvas");
	canvas.width = SCREEN_WIDTH;
	canvas.height = SCREEN_HEIGHT;
	canvas.style.cursor = 'crosshair';
	container.appendChild(canvas);
	
	context = canvas.getContext("2d");
	
	flattenCanvas = document.createElement("canvas");
	flattenCanvas.width = SCREEN_WIDTH;
	flattenCanvas.height = SCREEN_HEIGHT;
	
	

	if (STORAGE)
	{
		if (localStorage.canvas)
		{
			localStorageImage = new Image();
		
			localStorageImage.addEventListener("load", function(event)
			{
				localStorageImage.removeEventListener(event.type, arguments.callee, false);
				context.drawImage(localStorageImage,0,0);
			}, false);
			
			localStorageImage.src = localStorage.canvas;			
		}
		
		if (localStorage.brush_color_red)
		{
			COLOR[0] = localStorage.brush_color_red;
			COLOR[1] = localStorage.brush_color_green;
			COLOR[2] = localStorage.brush_color_blue;
		}

		if (localStorage.background_color_red)
		{
			BACKGROUND_COLOR[0] = localStorage.background_color_red;
			BACKGROUND_COLOR[1] = localStorage.background_color_green;
			BACKGROUND_COLOR[2] = localStorage.background_color_blue;
		}
	}

	// foregroundColorSelector.setColor( COLOR );
	// backgroundColorSelector.setColor( BACKGROUND_COLOR );
	
	if (window.location.hash)
	{
		hash = window.location.hash.substr(1,window.location.hash.length);

		for (i = 0; i < BRUSHES.length; i++)
		{
			if (hash == BRUSHES[i])
			{
				brush = eval("new " + BRUSHES[i] + "(context)");
				menu.selector.selectedIndex = i;
				break;
			}
		}
	}

	if (!brush)
	{
		brush = new shaded(context)// eval("new " + BRUSHES[0] + "(context)");
	}
	
	socket = io();
	setTimeout(function(){
		socket.emit('load', {})
	}, 1000)

	socket.on('drawing_start', function(event) {
		if (event.c === CLIENT_ID) return;
		if (!(event.c in drawer_brushes)) {
			drawer_brushes[event.c] = new shaded(context);
		};

		drawer_brushes[event.c].strokeStart( event.x0*SCREEN_WIDTH, event.y0*SCREEN_HEIGHT );
	});
	socket.on('drawing_stroke', function(event) {
		if (event.c === CLIENT_ID) return;
		if (!(event.c in drawer_brushes)) {
			drawer_brushes[event.c] = new shaded(context);
		};

		drawer_brushes[event.c].stroke( event.x0*SCREEN_WIDTH, event.y0*SCREEN_HEIGHT );
	});
	socket.on('drawing_end', function(event) {
		if (event.c === CLIENT_ID) return;
		if (!(event.c in drawer_brushes)) {
			drawer_brushes[event.c] = new shaded(context);
		};

		drawer_brushes[event.c].strokeEnd();

		// brush.stroke( event.x0*SCREEN_WIDTH, event.y0*SCREEN_HEIGHT );
	});

	// about = new About();
	// container.appendChild(about.container);
	
	window.addEventListener('mousemove', onWindowMouseMove, false);
	window.addEventListener('resize', onWindowResize, false);
	// window.addEventListener('keydown', onWindowKeyDown, false);
	// window.addEventListener('keyup', onWindowKeyUp, false);
	window.addEventListener('blur', onWindowBlur, false);
	
	document.addEventListener('mousedown', onDocumentMouseDown, false);
	document.addEventListener('mouseout', onDocumentMouseOut, false);
	
	document.addEventListener("dragenter", onDocumentDragEnter, false);  
	document.addEventListener("dragover", onDocumentDragOver, false);
	// document.addEventListener("drop", onDocumentDrop, false);  
	
	canvas.addEventListener('mousedown', onCanvasMouseDown, false);
	canvas.addEventListener('touchstart', onCanvasTouchStart, false);
	
	onWindowResize(null);
}


// WINDOW

function onWindowMouseMove( event )
{
	mouseX = event.clientX;
	mouseY = event.clientY;
}

function onWindowResize()
{
	SCREEN_WIDTH = window.innerWidth;
	SCREEN_HEIGHT = window.innerHeight;
	
	// menu.container.style.left = ((SCREEN_WIDTH - menu.container.offsetWidth) / 2) + 'px';
	
}



function onWindowKeyDown( event )
{
	if (shiftKeyIsDown)
		return;
		
	switch(event.keyCode)
	{
		case 16: // Shift
			shiftKeyIsDown = true;
			foregroundColorSelector.container.style.left = mouseX - 125 + 'px';
			foregroundColorSelector.container.style.top = mouseY - 125 + 'px';
			foregroundColorSelector.container.style.visibility = 'visible';
			break;
			
		case 18: // Alt
			altKeyIsDown = true;
			break;
			
		case 68: // d
			if(BRUSH_SIZE > 1) BRUSH_SIZE --;
			break;
		
		case 70: // f
			BRUSH_SIZE ++;
			break;			
	}
}


function onWindowBlur( event )
{
	shiftKeyIsDown = false;
	altKeyIsDown = false;
}


// DOCUMENT

function onDocumentMouseDown( event )
{
	if (!isMenuMouseOver)
		event.preventDefault();
}

function onDocumentMouseOut( event )
{
	onCanvasMouseUp();
}

function onDocumentDragEnter( event )
{
	event.stopPropagation();
	event.preventDefault();
}

function onDocumentDragOver( event )
{
	event.stopPropagation();
	event.preventDefault();
}




// COLOR SELECTORS

function onForegroundColorSelectorChange( event )
{
	COLOR = foregroundColorSelector.getColor();
	
	menu.setForegroundColor( COLOR );

	if (STORAGE)
	{
		localStorage.brush_color_red = COLOR[0];
		localStorage.brush_color_green = COLOR[1];
		localStorage.brush_color_blue = COLOR[2];		
	}
}




// MENU



function onMenuSelectorChange()
{
	if (BRUSHES[menu.selector.selectedIndex] == "")
		return;

	brush.destroy();
	brush = eval("new " + BRUSHES[menu.selector.selectedIndex] + "(context)");

	window.location.hash = BRUSHES[menu.selector.selectedIndex];
}




// CANVAS

function onCanvasMouseDown( event )
{
	var data, position;

	clearTimeout(saveTimeOut);
	cleanPopUps();
	
	if (altKeyIsDown)
	{
		flatten();
		
		data = flattenCanvas.getContext("2d").getImageData(0, 0, flattenCanvas.width, flattenCanvas.height).data;
		position = (event.clientX + (event.clientY * canvas.width)) * 4;
		
		foregroundColorSelector.setColor( [ data[position], data[position + 1], data[position + 2] ] );
		
		return;
	}
	
	BRUSH_PRESSURE = wacom && wacom.isWacom ? wacom.pressure : 1;
	
	brush.strokeStart( event.clientX, event.clientY );
	socket.emit('drawing_start', {
	  c: CLIENT_ID,
      x0: event.clientX / SCREEN_WIDTH,
      y0: event.clientY / SCREEN_HEIGHT
    });

	window.addEventListener('mousemove', onCanvasMouseMove, false);
	window.addEventListener('mouseup', onCanvasMouseUp, false);
}

function onCanvasMouseMove( event )
{
	BRUSH_PRESSURE = wacom && wacom.isWacom ? wacom.pressure : 1;
	
	socket.emit('drawing_stroke', {
		c: CLIENT_ID,
		x0: event.clientX / SCREEN_WIDTH,
		y0: event.clientY / SCREEN_HEIGHT
	});
	brush.stroke( event.clientX, event.clientY );
}

function onCanvasMouseUp()
{
	brush.strokeEnd();
	socket.emit('drawing_end', {c: CLIENT_ID});
	
	window.removeEventListener('mousemove', onCanvasMouseMove, false);
	window.removeEventListener('mouseup', onCanvasMouseUp, false);
	
	if (STORAGE)
	{
		clearTimeout(saveTimeOut);
		saveTimeOut = setTimeout(saveToLocalStorage, 2000, true);
	}
}


//

function onCanvasTouchStart( event )
{
	cleanPopUps();		

	if(event.touches.length == 1)
	{
		event.preventDefault();
		
		brush.strokeStart( event.touches[0].pageX, event.touches[0].pageY );
		
		window.addEventListener('touchmove', onCanvasTouchMove, false);
		window.addEventListener('touchend', onCanvasTouchEnd, false);
	}
}

function onCanvasTouchMove( event )
{
	if(event.touches.length == 1)
	{
		event.preventDefault();
		brush.stroke( event.touches[0].pageX, event.touches[0].pageY );
	}
}

function onCanvasTouchEnd( event )
{
	if(event.touches.length == 0)
	{
		event.preventDefault();
		
		brush.strokeEnd();

		window.removeEventListener('touchmove', onCanvasTouchMove, false);
		window.removeEventListener('touchend', onCanvasTouchEnd, false);
	}
}

//

function saveToLocalStorage()
{
	localStorage.canvas = canvas.toDataURL('image/png');
}

function flatten()
{
	var context = flattenCanvas.getContext("2d");
	
	context.fillStyle = 'rgb(' + BACKGROUND_COLOR[0] + ', ' + BACKGROUND_COLOR[1] + ', ' + BACKGROUND_COLOR[2] + ')';
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.drawImage(canvas, 0, 0);
}

function cleanPopUps()
{
	if (isFgColorSelectorVisible)
	{
		foregroundColorSelector.hide();
		isFgColorSelectorVisible = false;
	}
		
	if (isBgColorSelectorVisible)
	{
		backgroundColorSelector.hide();
		isBgColorSelectorVisible = false;
	}
	
	if (isAboutVisible)
	{
		about.hide();
		isAboutVisible = false;
	}
}
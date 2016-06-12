//
// draw.js file for all of CiteMap's canvas manipulation
// This is where all the heavy lifting occurs
// Lots of coordinate transformations to convert from browser to world and back
// Contains draw loop
//
// Alexander Gutierrez
// 2016-06-01


var node_default_r = 60;
var stroke_default = 1;
var selection_default = 3;
var link_default = 5;
var expansionFactor = 2.5;
var expansionRate = 1.3;
var maxzoom = 2.5, minzoom = 0.15;
var menu_height = 300;
var link_colors = ['#444544', '#FF9300', '#00AEB0'];
var link_show = [true,true,true];

var dom_canvas, dom_menu;
var ctx;
var offsetX, offsetY;
var xtranslate = 0, ytranslate = 0;
var totalFactor = 1.0;
var scaleFactor, factor = 1.0;
var disp_scale;
var $disp2;
var mods = [];
var xmargin = 1; // total horiz margin for canvas (for auto sizing)
var ymargin = 22; // total vertical margin for canvas (for auto sizing)
var font = "13px Arial";
var keys_link = ["r","e","w"];
var dialog_width = node_default_r*expansionFactor*1.4;
var dialog_height = dialog_width;
var $dom_dialog;
var curlink_color = "";
var curlink_type = -1;

var getFontHeight = function(ctx, font) {
  return ctx.measureText("w").width;
}

var show_dialog = function(mx,my,content){
  $dom_dialog.css("left",(((mx*totalFactor)+xtranslate)+offsetX
  								-(dialog_width/2))+"px");
  $dom_dialog.css("top",((my*totalFactor)+ytranslate+offsetY
  								-(dialog_height/2))+"px");
  for(var i=0; i<content.length; i++){
    $dom_dialog.children("textarea:nth-child("+(i+1)+")").val(content[i][0]);
  }
  $dom_dialog.show();
}

var set_schema = function(schema){
  for(var i=0; i<schema.length; i++){
    $dom_dialog.append("<textarea rows=10 id=\"in"+i+"\" />");
  }
}

var split_lines = function(ctx, mw, font, text) {
  mw = mw - 14;
  ctx.font = font;

  var words = text.split(' ');
  var new_line = words[0];
  var text_lines = [];
  var fh = getFontHeight(ctx,font);
  for(var i = 1; i < words.length; ++i) {
     if (ctx.measureText(new_line + " " + words[i]).width < mw) {
         new_line += " " + words[i];
     } else {
         text_lines.push(new_line);
         new_line = words[i];
     }
     if(text_lines.length * fh > node_default_r*0.7){
       text_lines.push(' ...');
       return text_lines;
     }
  }
  text_lines.push(new_line);
  return text_lines;
}

function Circle(x, y, r, fill, content) {
  this.x = x;
  this.y = y;
  this.r = r;
  this.fill = fill || '#FFFFFF';
  this.content = content || [];
  this.rtemp = -1;
}

function Link(a,b,c,d) {
  // curlink constructor
  if(typeof(a)=="object" && typeof(b)=="object"){ // node,node,color
    this.start = a;
    this.end = b;
    this.type = c;
    this.color = link_colors[this.type] || '#000000';
  }
  // linked link constructor
  else if(typeof(a)=="object"){ // node,x,y,color
    this.start = a;
    this.x2 = b; this.y2 = c;
    this.type = d;
    this.color = link_colors[this.type] || '#000000';
  }
}

Circle.prototype.draw = function(ctx) {
  ctx.fillStyle = this.fill;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = stroke_default;
  ctx.beginPath();
  ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
  ctx.fill();
  ctx.stroke();
  ctx.closePath();
  ctx.font = font;
  ctx.fillStyle = '#000000';
  for(var i=0; i<this.content.length; i++){
    this.writeText(ctx, this.content[i][0], this.r);
  }
}

Circle.prototype.writeText = function(ctx,text,r) {
  var output = split_lines(ctx, r*2, font, text);
  var fh = getFontHeight(ctx,font);
  var ly = ((r*2.2) - (output.length*fh))/2 + this.y - r;
  if(ly < this.y - (0.3*r)) ly = this.y -(0.3*r);
  var lx = this.x;
  ctx.textAlign="center";
  for(var j=0; j<output.length; j++, ly += fh+4) {
    ctx.fillText(output[j],lx,ly);
  }
}

Circle.prototype.collapse = function(ctx,s) {
  for(var i=0; i<this.content.length; i++){
    this.content[i][0] = $dom_dialog.children("textarea:nth-child("+(i+1)+")").val();
  }
}

Circle.prototype.expand = function(ctx,s) {
  var rnew = this.r*expansionFactor/totalFactor;
  if(s.expanding) {
    if(this.rtemp == -1){ // start expanding
	   this.rtemp = this.r*expansionRate;
	   rnew = this.rtemp;
	 }else if(this.rtemp > 0 && this.rtemp*expansionRate < rnew){ //intermediate
	   this.rtemp *= expansionRate;
		rnew=this.rtemp;
    }else {s.expanding = false; this.rtemp=-1;} //finished
  }
  ctx.fillStyle = this.fill;
  ctx.strokeStyle = this.selectionColor;
  ctx.lineWidth = stroke_default;
  ctx.beginPath();
  ctx.arc(this.x,this.y,rnew,0,Math.PI*2);
  ctx.fill();
  ctx.stroke();
  ctx.closePath();
  if(!s.expanding){
    ctx.font = font;
    ctx.fillStyle = '#000000';
	 var thisnode = this;
	 var curval = this.content.length > 0 ? this.content[0][0] : "";
	 show_dialog(this.x,this.y,this.content);
  }
}

Link.prototype.draw = function(ctx) {
  ctx.strokeStyle = this.color;
  ctx.lineWidth = link_default;
  var slope = 0;
  if(this.end){
    slope = - (this.start.x - this.end.x) / (this.start.y - this.end.y);
    slope = Math.atan(slope)/Math.PI/2;
  }
  var dx = 0;
  if(this.type == 1)
    dx = 10;
  else if(this.type == 2)
    dx = -10;
  ctx.beginPath();
  ctx.moveTo(this.start.x+dx, this.start.y+(slope*dx));
  if(this.end) ctx.lineTo(this.end.x+dx,this.end.y+(slope*dx));
  else ctx.lineTo(this.x2, this.y2);
  ctx.stroke();
  ctx.closePath()
}

// is point inside circle
Circle.prototype.contains = function(mx, my, s) {
  var r = (s.expanded && this == s.expanded) ? this.r*expansionFactor/totalFactor : this.r;
  var lhs = (Math.pow(this.x - mx,2)+Math.pow(this.y - my,2));
  var rhs = r*r;
  return lhs <= rhs;
}


function State(canvas) {
  this.canvas = canvas;
  canvas.width = $(window).width() - xmargin;
  canvas.height = $(window).height() - ymargin;
  this.width = canvas.width;
  this.height = canvas.height;
  this.vport = [0,0,canvas.width,canvas.height];
  this.vport_noscale = [0,0,canvas.width,canvas.height];
  this.vport_orig = [0,0,canvas.width,canvas.height];
  this.ctx = canvas.getContext('2d');
  scaleFactor = 1.1;
  ctx = this.ctx;
  this.lastX=this.width/2;
  this.lastY=this.height/2;
  this.trackTransforms(this.ctx);

  this.valid = false; // invalid means redraw (view has been modified)
  this.nodes = []; // nodes on canvas
  this.links = [[],[],[]]; // links between nodes
  this.curlink = null;
  this.dragging = false; // are we in dragging mode
  this.linking = false; // link mode
  this.expanding = false;
  this.selection = null;
  this.expanded = null;
  this.dragoffx = 0;
  this.dragoffy = 0;
  
  var s = this;
  
  // -handlers
  $(window).on('resize', function(){
    var win = $(this);
    canvas.width = win.width() - xmargin;
    canvas.height = win.height() - ymargin;
    s.vport_orig = [0,0,canvas.width,canvas.height];
	 // TODO resize breaks transformations TRY MODIFY VPORT ORIG
    totalFactor = 1.0; 
    xtranslate = 0;
    ytranslate = 0;
    ctx.setTransform(1,0,0,1,0,0);
    disp_scale.innerHTML = "100%";
	 s.updateVport();
    s.valid = false;
  });
  document.addEventListener('keydown', function(e) {
    var key = e.key || String.fromCharCode(e.keyCode) || e.keyIdentifier;
    key = key.toLowerCase();
    var index = mods.indexOf(key);
    if(key =='delete' && s.selection){
      s.removeNode(s.selection);
    }
	 else if(index < 0 && keys_link.indexOf(key) >=0) {
      if(s.expanded) return;
	   s.linking = true;
      if(mods.length == 0){
        curlink_color = link_colors[keys_link.indexOf(key)];
        curlink_type = keys_link.indexOf(key);
        s.valid = false; // TODO not doing anything?
      }
      mods.push(key);
      //console.log(mods);
	 }
  }, false);
  document.addEventListener('keyup', function(e) {
    var key = e.key || String.fromCharCode(e.keyCode) || e.keyIdentifier;
    key = key.toLowerCase();
    var index = mods.indexOf(key);
	 if(index >= 0) {
	   mods.splice(index,1);
	 }
	 if(mods.length==0 && !s.dragging) s.linking = false;
  }, true);
  canvas.addEventListener('selectstart', function(e) { e.preventDefault(); return false; }, false);
  // mousedown for dragging
  canvas.addEventListener('mousedown', function(e) {
    var mouse = s.getMouse(e);
    var mx = mouse.x;
    var my = mouse.y;
	 var tmx = mouse.tx;
	 var tmy = mouse.ty;
	 var nodes = s.nodes;
	 var nl = nodes.length;

    if(s.linking && !s.expanded){
      for (var i = nl-1; i >= 0; i--) {
        if (nodes[i].contains(tmx, tmy,s)) {
  	  	    s.selection = nodes[i];
          s.lastX = e.offsetX || (e.pageX - s.canvas.offsetLeft);
          s.lastY = e.offsetY || (e.pageY - s.canvas.offsetTop);
          s.dragStart = ctx.transformedPoint(s.lastX,s.lastY);
  	  	    s.dragging = true;
			 $dom_dialog.hide();
  		    return;
        }
	   }
	 }
    if(s.selection && s.selection.contains(tmx,tmy,s)){
	   // if same node don't change focus
      if(s.expanded) { s.valid = true; return; }
      var mySel = s.selection;
      s.dragoffx = (tmx - mySel.x);
      s.dragoffy = (tmy - mySel.y);
      s.dragging = true;
	   s.dragStart = null;
      s.selection = mySel;
      s.valid = false;
		return;
	 }
	 else{ // drag node
      for (var i = nl-1; i >= 0; i--) {
        if (nodes[i].contains(tmx, tmy,s)) {
          var mySel = nodes[i];
          s.dragoffx = (tmx - mySel.x);
          s.dragoffy = (tmy - mySel.y);
          s.dragging = true;
	       s.dragStart = null;
			 s.expanded = null;
          s.selection = mySel;
          s.valid = false;
			 $dom_dialog.hide();
          return; // a node is selected
        }
      }
	 }

	 // nothing was selected
    // deselect previously selected
    if (s.selection) {
      s.selection = null;
      if(s.expanded) {
		  s.expanded.collapse(ctx,s);
	     s.expanded = null;
		  $dom_dialog.hide();
      }
      s.valid = false;
    }
    document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
    s.lastX = e.offsetX || (e.pageX - s.canvas.offsetLeft);
    s.lastY = e.offsetY || (e.pageY - s.canvas.offsetTop);
    s.dragStart = ctx.transformedPoint(s.lastX,s.lastY);
    s.dragging = true;
	 s.valid = false;
  }, true);
  canvas.addEventListener('mousemove', function(e) {
    if(s.dragging && !s.expanded){
	   // dragging node
      if(!s.linking && s.selection){
        var mouse = s.getMouse(e);
        // drag with offset on point of holding
        s.selection.x = mouse.tx - s.dragoffx;
        s.selection.y = mouse.ty - s.dragoffy;   
        s.valid = false; // Something's dragging so we must redraw
      }
		// linking
      if (s.linking && s.selection) s.makeLink(e);
		// panning
      else if (s.dragStart) s.pan(e);
    }
  }, true);
  canvas.addEventListener('mouseup', function(e) {
    s.dragging = false;
	 if(s.linking && s.dragStart && s.selection)
    {
	   if(mods.length==0) s.linking = false; //clear linking when no mods
	   var mouse = s.getMouse(e);
	   var tmx = mouse.tx, tmy = mouse.ty;
		var start = s.selection;
		var end = null;
      s.lastX = e.offsetX || (e.pageX - s.canvas.offsetLeft);
      s.lastY = e.offsetY || (e.pageY - s.canvas.offsetTop);
      s.pt = ctx.transformedPoint(s.lastX,s.lastY);

      for (var i = s.nodes.length-1; i >= 0; i--) { // find end node
        if (s.nodes[i].contains(tmx, tmy,s)) {
		      end = s.nodes[i];
	         break;
        }
      }
		if(end) s.addLink(new Link(start,end,curlink_type));
	 }
    s.curlink = null;
	 s.dragStart = null;
    if(s.expanded) return;
	 s.valid = false;
  }, false);
  // add new nodes
  canvas.addEventListener('dblclick', function(e) {
    var mouse = s.getMouse(e);
    for (var i = s.nodes.length-1; i >= 0; i--)
      if (s.nodes[i].contains(mouse.tx, mouse.ty,s)) {
		  s.expanding = true;
		  s.expanded = s.nodes[i];
		  s.valid = false;
		  return;
		}
	 s.addNode(new Circle(mouse.tx, mouse.ty, node_default_r, '#FFFFFF', [["",1]]));
  }, true);
  canvas.addEventListener('DOMMouseScroll', function(e) {
    s.handleScroll(e);
  } ,false);
  canvas.addEventListener('mousewheel', function(e) {
    s.handleScroll(e);
  } ,false);
  $('#showlink1').click(function() {
    link_show[0] = this.checked;
    s.valid = false;
  });
  $('#showlink2').click(function() {
    link_show[1] = this.checked;
    s.valid = false;
  });
  $('#showlink3').click(function() {
    link_show[2] = this.checked;
    s.valid = false;
  });
  
  this.selectionColor = '#CC0000';
  this.selectionWidth = 1;  
  this.interval = 30;
  setInterval(function() { s.draw(); }, s.interval);
}

State.prototype.pan = function(e) {
  this.lastX = e.offsetX || (e.pageX - this.canvas.offsetLeft);
  this.lastY = e.offsetY || (e.pageY - this.canvas.offsetTop);
  var ctx = this.ctx;
  var pt = ctx.transformedPoint(this.lastX,this.lastY);
  ctx.translate(pt.x-this.dragStart.x,pt.y-this.dragStart.y);
  this.updateVport();
  this.valid = false;
}

State.prototype.makeLink = function(e) {
  if(this.dragging && this.linking){
    this.lastX = e.offsetX || (e.pageX - this.canvas.offsetLeft);
    this.lastY = e.offsetY || (e.pageY - this.canvas.offsetTop);
    var ctx = this.ctx;
    var pt = ctx.transformedPoint(this.lastX,this.lastY);
    this.curlink = new Link(this.selection,pt.x,pt.y,curlink_type);
    this.valid = false;
  }
}

State.prototype.addNode = function(node) {
  this.nodes.push(node);
  $disp2.text(this.nodes.length);
  this.valid = false;
}

State.prototype.removeNode = function(node) {
  // remove associated links
  for(var i=0; i<this.links.length; i++){
    for(var j=this.links[i].length-1; j>=0; j--){
      var temp = this.links[i][j];
      if(temp.start == node || temp.end == node)
        this.removeLink(temp);
    }
  }
  this.nodes.splice(this.nodes.indexOf(node),1);
  $disp2.text(this.nodes.length);
  this.selection = null;
  this.valid = false;
}

State.prototype.addLink = function(link) {
  this.links[link.type].push(link)
  this.valid = false;
}

State.prototype.removeLink = function(link) {
  this.links[link.type].splice(this.links[link.type].indexOf(link),1);
  this.valid = false;
}

State.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.width, this.height);
}

// draw canvas state (#draw)
State.prototype.draw = function() {
  if (!this.valid) { // redraw if invalid
    var ctx = this.ctx;
    var nodes = this.nodes;
	 var links = this.links;
    this.clear();
	 var nodesdrawn = 0;

    var p1 = ctx.transformedPoint(0,0);
    var p2 = ctx.transformedPoint(this.canvas.width,this.canvas.height);
    ctx.clearRect(p1.x,p1.y,p2.x-p1.x,p2.y-p1.y);

	 // draw links first
	 if(this.curlink) this.curlink.draw(ctx); // if currently dragging a link
    for(var i=0; i<links.length; i++){
      if(!link_show[i]) continue;
	   for(var j=0; j<links[i].length; j++){
	     var link = links[i][j];
	     links[i][j].draw(ctx);
	   }
    }
    
    // draw all nodes
    var nl = nodes.length;
	 var bounds = this.vport;
    for (var i=0; i<nl; i++) {
      var node = nodes[i];
      // don't draw elements that are offscreen
      if (node.x - node.r > bounds[2] || node.y - node.r > bounds[3] ||
          node.x + node.r < bounds[0] || node.y + node.r < bounds[1])
			 continue;
      nodes[i].draw(ctx);
		nodesdrawn++;
    }
    
    // draw selection
	 if(this.selection && this.expanded) {
	   this.expanded.expand(ctx,this);
	 } else if(this.selection) {
      var mySel = this.selection;
		mySel.draw(ctx);
      ctx.strokeStyle = this.selectionColor;
      ctx.lineWidth = selection_default;
      ctx.beginPath();
      ctx.arc(mySel.x,mySel.y,mySel.r,0,Math.PI*2);
		ctx.fillStyle = mySel.fill;
      ctx.stroke();
      ctx.closePath();
    }
    
    this.valid = !this.expanding; // keep drawing if we're animating
  }
}


State.prototype.getMouse = function(e) {
  offsetX = 0, offsetY = 0;
  var mx, my, tmx, tmy;

  var $canvas = $("#canvas");
  var canvasOffset = $canvas.offset();
  offsetX = canvasOffset.left;
  offsetY = canvasOffset.top;

  mx = (e.pageX - offsetX);
  my = (e.pageY - offsetY);
  tmx = (mx-xtranslate)/ totalFactor;
  tmy = (my-ytranslate)/ totalFactor;

  // We return a simple javascript object (a hash) with x and y defined
  return {x: mx, y: my, tx: tmx, ty: tmy};
}

// update vport (currently used in handleScroll and pan)
State.prototype.updateVport = function() {
	xtranslate = ctx.getTransform().e;
	ytranslate = ctx.getTransform().f;

	// viewport transformations
	this.vport[0] = (this.vport_orig[0] - xtranslate) /totalFactor;
	this.vport[2] = (this.vport_orig[2] - xtranslate) /totalFactor;
	this.vport[1] = (this.vport_orig[1] - ytranslate) /totalFactor;
	this.vport[3] = (this.vport_orig[3] - ytranslate) /totalFactor;
	this.vport_noscale[0] = this.vport_orig[0] - xtranslate;
	this.vport_noscale[2] = this.vport_orig[2] - xtranslate;
	this.vport_noscale[1] = this.vport_orig[1] - ytranslate;
	this.vport_noscale[3] = this.vport_orig[3] - ytranslate;
}

State.prototype.handleScroll = function(e) {
  	 var delta = e.wheelDelta ? e.wheelDelta/40 : e.detail ? -e.detail : 0;
    this.lastX = e.offsetX || (e.pageX - this.canvas.offsetLeft);
    this.lastY = e.offsetY || (e.pageY - this.canvas.offsetTop);
    var ctx = this.ctx;
	 var newFactor = totalFactor * Math.pow(scaleFactor,delta);
  	 if(delta && newFactor<maxzoom && newFactor>minzoom) {
	   totalFactor = newFactor;
      var factor_display = (totalFactor*100).toFixed(0)+'%';
      if(totalFactor<1) factor_display = ' '+factor_display;
		disp_scale.innerHTML = factor_display;
  	   var pt = ctx.transformedPoint(this.lastX,this.lastY);

		// translate, scale, translate back
  	   ctx.translate(pt.x,pt.y);
  	   factor = Math.pow(scaleFactor,delta);
  	   ctx.scale(factor,factor);
  	   ctx.translate(-pt.x,-pt.y);

      $dom_dialog.css("width",dialog_width*totalFactor+"px");
      $dom_dialog.css("height",dialog_height*totalFactor+"px");

		this.updateVport();

  	   this.valid = false;
	 }
  	 return e.preventDefault() && false;
}


// maintain transformation matrix xform so we know how we have transformed
// relative to the original viewport
State.prototype.trackTransforms = function(ctx){
	var svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
	var xform = svg.createSVGMatrix();
	ctx.getTransform = function(){ return xform; };
	
	var scale = ctx.scale;
	ctx.scale = function(sx,sy){
		xform = xform.scaleNonUniform(sx,sy);
		return scale.call(ctx,sx,sy);
	};
	var translate = ctx.translate;
	ctx.translate = function(dx,dy){
		xform = xform.translate(dx,dy);
		return translate.call(ctx,dx,dy);
	};
	var transform = ctx.transform;
	ctx.transform = function(a,b,c,d,e,f){
		var m2 = svg.createSVGMatrix();
		m2.a=a; m2.b=b; m2.c=c; m2.d=d; m2.e=e; m2.f=f;
		xform = xform.multiply(m2);
		return transform.call(ctx,a,b,c,d,e,f);
	};
	var setTransform = ctx.setTransform;
	ctx.setTransform = function(a,b,c,d,e,f){
		xform.a = a; xform.b = b;
		xform.c = c; xform.d = d;
		xform.e = e; xform.f = f;
		return setTransform.call(ctx,a,b,c,d,e,f);
	};
	var pt  = svg.createSVGPoint();
	ctx.transformedPoint = function(x,y){
		pt.x=x; pt.y=y;
		return pt.matrixTransform(xform.inverse());
	}
}

function init() {
  $('body').on('contextmenu','#canvas',function(e)
    { return false; }); // disable context menu on canvas
  $disp2 = $("#disp2");
  dom_canvas = document.getElementById('canvas');
  dom_menu = document.getElementById('menu');
  var s = new State(dom_canvas);
  disp_scale = document.getElementById("disp");

  // test input
  s.addNode(new Circle(300,300,node_default_r,'#FFFFFF',[["This is some test input. Putting some lorem ipsum sit dolor amet here to test. This text should be hidden from overview",1]]));
  s.addNode(new Circle(200,130,node_default_r,'#FFFFFF',[["M. D. Merrill, \"Knowledge objects and mental models,\" Advanced Learning Technologies, 2000. IWALT 2000. Proceedings. International Workshop on, Palmerston North, 2000, pp. 244-246.",1]]));
  s.addNode(new Circle(500,150,node_default_r,'#FFFFFF',[["Marti A. Hearst. 2006. Clustering versus faceted categories for information exploration. Commun. ACM 49, 4 (April 2006), 59-61.",1]]));
  s.addNode(new Circle(800,250,node_default_r,'#FFFFFF',[["Wood, Dylan D View. Harnessing modern web application technology to create intuitive and efficient data visualization and sharing tools. Frontiers in neuroinformatics. Vol 8, Issue 152, Page 71. 2014.",1]]));
  s.addNode(new Circle(400,550,node_default_r,'#FFFFFF',[["Nakanishi, Mikiko and Horikoshi, Tsutomu. Intuitive substitute interface. Personal and Ubiquitous Computing. Volume 17, Issue 8. Pages 1797-1805. 2013",1]]));
  s.addNode(new Circle(700,450,node_default_r,'#FFFFFF',[["Curiel, Jacqueline M., and Gabriel A. Radvansky. \"Mental Organization Of Maps.\" Journal Of Experimental Psychology: Learning, Memory, And Cognition 24.1 (1998): 202-214.",1]]));
  s.addNode(new Circle(1200,350,node_default_r,'#FFFFFF',[["This could be a really long note about some idea I thought of",1]]));
  s.addNode(new Circle(1100,650,node_default_r,'#FFFFFF',[["This is an a following thought related to the idea I had earlier",1]]));
  s.addLink(new Link(s.nodes[0],s.nodes[1],0));
  s.addLink(new Link(s.nodes[0],s.nodes[2],1));
  s.addLink(new Link(s.nodes[0],s.nodes[3],2));
  s.addLink(new Link(s.nodes[2],s.nodes[3],1));
  s.addLink(new Link(s.nodes[2],s.nodes[3],2));
  s.addLink(new Link(s.nodes[0],s.nodes[4],1));
  s.addLink(new Link(s.nodes[0],s.nodes[5],0));
  s.addLink(new Link(s.nodes[3],s.nodes[6],0));
  s.addLink(new Link(s.nodes[6],s.nodes[7],0));

  $dom_dialog = $("#popup");
  $dom_dialog.hide();
  $dom_dialog.css("width",dialog_width+"px");
  $dom_dialog.css("height",dialog_height+"px");
  $dom_dialog.css("padding","10px");

  dom_menu.style.height = "0px";

  set_schema(["test"]);

  $('#showlink1').prop('checked', true);
  $('#showlink2').prop('checked', true);
  $('#showlink3').prop('checked', true);
  toggleMenu();
}

function toggleMenu() {
  if(dom_menu.style.height == "0px") {
    dom_menu.style.height = menu_height+"px";
    dom_menu.style.borderWidth = "1px";

    $('#menu_arrow').removeClass();
    $('#menu_arrow').css("animation-direction","normal");
    setTimeout(function(){
    $('#menu_arrow').addClass('arrow'); }, 20);
  }
  else {
    dom_menu.style.height = "0px";
    dom_menu.style.borderWidth = "0px";

    $('#menu_arrow').removeClass();
    $('#menu_arrow').css("animation-direction","reverse");
    setTimeout(function(){
    $('#menu_arrow').addClass('arrow'); }, 20);
  }
}

function saveWork(){ alert('This will save the workspace to the database.'); }

function loadWork(){ alert('This will load a workspace from the database.'); }

function manageLinks(){ alert('This will bring up a menu for customizing link color, key, and name, as well as allowing the user to add more link types.'); }

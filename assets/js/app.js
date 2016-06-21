'use strict';
var svg, tooltip, biHiSankey, path, defs, colorScale, highlightColorScale, isTransitioning;
var OPACITY = {
NODE_DEFAULT: 0.9,
NODE_FADED: 0.1,
NODE_HIGHLIGHT: 0.8,
LINK_DEFAULT: 0.4,
LINK_FADED: 0.01,
LINK_HIGHLIGHT: 0.7
},
EXPANDED_NODES = [],
TYPES = ["A", "AA", "B", "BB"],
TYPE_COLORS = ["#1b9e77", "#1fb487", "#9591c5", "#7570b3"],
TYPE_HIGHLIGHT_COLORS = ["#22ca98", "#22ca98", "#b5b2d7", "#b5b2d7"],
LINK_COLOR = "#b3b3b3",
highlighted = 0,
OTHER_HIGHLIGHTED = 0,
expanded = 0,
NODE_WIDTH = 10,
COLLAPSER = {
RADIUS: NODE_WIDTH * 1.5,
SPACING: 25
},
OUTER_MARGIN = 50,
MARGIN = {
TOP: 2 * (COLLAPSER.RADIUS + OUTER_MARGIN),
RIGHT: OUTER_MARGIN,
BOTTOM: OUTER_MARGIN,
LEFT: OUTER_MARGIN
},
TRANSITION_DURATION = 400,
HEIGHT = 8000 - MARGIN.TOP - MARGIN.BOTTOM,
WIDTH = document.body.clientWidth - MARGIN.LEFT - MARGIN.RIGHT - 20,
LAYOUT_INTERATIONS = 32,
REFRESH_INTERVAL = 7000;
var formatNumber = function(d) {
var numberFormat = d3.format(",.0f"); // zero decimal places
return numberFormat(d);
},
formatFlow = function(d) {
var flowFormat = d3.format(",.0f"); // zero decimal places with sign
return flowFormat(Math.abs(d));
},
// Used when temporarily disabling user interractions to allow animations to complete
disableUserInterractions = function(time) {
isTransitioning = true;
setTimeout(function() {
isTransitioning = false;
}, time);
},
hideTooltip = function() {
return tooltip.transition()
.duration(TRANSITION_DURATION)
.style("opacity", 0);
},
showTooltip = function() {
return tooltip
.style("left", d3.event.pageX + "px")
.style("top", d3.event.pageY + 15 + "px")
.transition()
.duration(TRANSITION_DURATION)
.style("opacity", 1);
};
colorScale = d3.scale.ordinal().domain(TYPES).range(TYPE_COLORS),
highlightColorScale = d3.scale.ordinal().domain(TYPES).range(TYPE_HIGHLIGHT_COLORS),
svg = d3.select("#chart").append("svg")
.attr("width", WIDTH + MARGIN.LEFT + MARGIN.RIGHT)
.attr("height", HEIGHT + MARGIN.TOP + MARGIN.BOTTOM)
.append("g")
.attr("transform", "translate(" + MARGIN.LEFT + "," + MARGIN.TOP + ")");
svg.append("g").attr("id", "links");
svg.append("g").attr("id", "nodes");
svg.append("g").attr("id", "collapsers");
tooltip = d3.select("#chart").append("div").attr("id", "tooltip");
tooltip.style("opacity", 0)
.append("p")
.attr("class", "value");
biHiSankey = d3.biHiSankey();
// Set the biHiSankey diagram properties
biHiSankey
.nodeWidth(NODE_WIDTH)
.nodeSpacing(10)
.linkSpacing(4)
.arrowheadScaleFactor(0)
.size([WIDTH, HEIGHT]);
path = biHiSankey.link().curvature(0.45);
defs = svg.append("defs");
function update() {
var link, linkEnter, node, nodeEnter, collapser, collapserEnter;
function containChildren(node) {
node.children.forEach(function(child) {
child.state = "contained";
child.parent = this;
child._parent = null;
if (EXPANDED_NODES.indexOf(child) >= 0)
EXPANDED_NODES.splice(EXPANDED_NODES.indexOf(child));
//console.dir(EXPANDED_NODES);
containChildren(child);
}, node);
}
function expand(node) {
expanded++;
node.state = "expanded";
node.children.forEach(function(child) {
child.state = "collapsed";
child._parent = this;
child.parent = null
EXPANDED_NODES.push(child);
//console.dir(EXPANDED_NODES);
containChildren(child);
}, node);
}
function collapse(node) {
expanded--;
node.state = "collapsed";
containChildren(node);
}
function restoreLinksAndNodes() {
link
.style("stroke", LINK_COLOR)
.transition()
.duration(TRANSITION_DURATION)
.style("opacity", OPACITY.LINK_DEFAULT);
node
.selectAll("rect")
.style("fill", function(d) {
d.color = colorScale(d.type.replace(/ .*/, ""));
return d.color;
})
.style("stroke", function(d) {
return d3.rgb(colorScale(d.type.replace(/ .*/, ""))).darker(0.1);
})
.style("fill-opacity", OPACITY.NODE_DEFAULT);
node.filter(function(n) {
return n.state === "collapsed";
})
.transition()
.duration(TRANSITION_DURATION)
.style("opacity", OPACITY.NODE_DEFAULT);
}
function showHideChildren(node) {
highlighted = 0;
disableUserInterractions(2 * TRANSITION_DURATION);
hideTooltip();
if (node.state === "collapsed") {
expand(node);
} else {
collapse(node);
}
biHiSankey.relayout();
update();
link.attr("d", path);
restoreLinksAndNodes();
if(expanded){
setTimeout(function(){
fadeUnconnectedLinks("");
EXPANDED_NODES.forEach(function(expanded) {
//console.dir(EXPANDED_NODES);
highlightConnected(expanded);
}
);
}, TRANSITION_DURATION*2);
}
}
function highlightChildren(g) {
link.filter((function (d) {return true; }))
.style("opacity", OPACITY.LINK_FADED);
}
function highlightConnected(g) {
link.filter((function (d) { return (d.target === g || d.source === g); }))
.transition()
.duration(TRANSITION_DURATION)
.style("stroke", LINK_COLOR)
.style("opacity", OPACITY.LINK_HIGHLIGHT);
}
function fadeConnectedLinks(g) {
link.filter((function (d) { return (d.target === g || d.source === g); }))
.transition()
.duration(TRANSITION_DURATION)
.style("stroke", LINK_COLOR)
.style("opacity", OPACITY.LINK_FADED);
}
function fadeUnconnectedLinks(g) {
link.filter(function(d) {
return d.source !== g && d.target !== g;
})
.transition()
.duration(TRANSITION_DURATION)
.style("opacity", OPACITY.LINK_FADED);
}
function fadeUnconnectedNodes(g) {
node.filter(function(d) {
return (d.name === g.name) ? false : !biHiSankey.connected(d, g);
}).transition()
.duration(TRANSITION_DURATION)
.style("opacity", OPACITY.NODE_FADED);
}
function fadeUnconnected(g) {
fadeUnconnectedLinks(g);
fadeUnconnectedNodes(g)
}
function showConnections(g) {
if (!isTransitioning) {
//console.dir("Show Connections");
restoreLinksAndNodes();
highlightConnected(g);
expanded ? fadeUnconnectedLinks(g) : fadeUnconnected(g);
d3.select(this).select("rect")
.style("stroke", function(d) {
return d3.rgb(d.color).darker(0.1);
})
.style("fill-opacity", OPACITY.NODE_HIGHLIGHT);
}
}
function hideConnections(g) {
if (!isTransitioning) {
hideTooltip();
restoreLinksAndNodes();
}
}
link = svg.select("#links").selectAll("path.link")
.data(biHiSankey.visibleLinks(), function(d) {
return d.id;
});
link.transition()
.duration(TRANSITION_DURATION)
.style("stroke-WIDTH", function(d) {
return Math.max(1, d.thickness);
})
.attr("d", path)
.style("opacity", OPACITY.LINK_DEFAULT);
link.exit().remove();
linkEnter = link.enter().append("path")
.attr("class", "link")
.style("fill", "none");
linkEnter.on('mouseenter', function(d) {
if (!isTransitioning) {
showTooltip().select(".value").text(function() {
//console.dir(d.direction);
if (d.source.children.length === 0 || d.target.children.length === 0) {
//console.dir(d.source.children);
return d.source.name + " → " + d.target.name + "\n";
}
return d.source.name + " → " + d.target.name + "\n" + formatNumber(d.value);
});
//console.dir(highlighted);
d3.select(this)
.style("stroke", LINK_COLOR)
.transition()
.duration(TRANSITION_DURATION / 2);
if(!highlighted)
d3.select(this).style("opacity", OPACITY.LINK_HIGHLIGHT);
}
});
linkEnter.on('mouseleave', function() {
if (!isTransitioning) {
hideTooltip();
d3.select(this)
.style("stroke", LINK_COLOR)
.transition()
.duration(TRANSITION_DURATION / 2);
if(!highlighted)
d3.select(this).style("opacity", expanded ? OPACITY.LINK_FADED : OPACITY.LINK_DEFAULT);
EXPANDED_NODES.forEach(function(expanded) {
highlightConnected(expanded);
}
);
}
});
linkEnter.sort(function(a, b) {
return b.thickness - a.thickness;
})
.style("stroke", LINK_COLOR)
.style("opacity", 0)
.transition()
.delay(TRANSITION_DURATION)
.duration(TRANSITION_DURATION)
.attr("d", path)
.style("stroke-WIDTH", function(d) {
return Math.max(1, d.thickness);
})
.style("opacity", OPACITY.LINK_DEFAULT);
node = svg.select("#nodes").selectAll(".node")
.data(biHiSankey.collapsedNodes(), function(d) {
return d.id;
});
node.transition()
.duration(TRANSITION_DURATION)
.attr("transform", function(d) {
return "translate(" + d.x + "," + d.y + ")";
})
.style("opacity", OPACITY.NODE_DEFAULT)
.select("rect")
.style("fill", function(d) {
d.color = colorScale(d.type.replace(/ .*/, ""));
return d.color;
})
.style("stroke", function(d) {
return d3.rgb(colorScale(d.type.replace(/ .*/, ""))).darker(0.1);
})
.style("stroke-WIDTH", "1px")
.attr("height", function(d) {
return d.height;
})
.attr("width", biHiSankey.nodeWidth());
node.exit()
.transition()
.duration(TRANSITION_DURATION)
.attr("transform", function(d) {
var collapsedAncestor, endX, endY;
collapsedAncestor = d.ancestors.filter(function(a) {
return a.state === "collapsed";
})[0];
endX = collapsedAncestor ? collapsedAncestor.x : d.x;
endY = collapsedAncestor ? collapsedAncestor.y : d.y;
return "translate(" + endX + "," + endY + ")";
})
.remove();
nodeEnter = node.enter().append("g").attr("class", "node");
nodeEnter
.attr("transform", function(d) {
var startX = d._parent ? d._parent.x : d.x,
startY = d._parent ? d._parent.y : d.y;
return "translate(" + startX + "," + startY + ")";
})
.style("opacity", 1e-6)
.transition()
.duration(TRANSITION_DURATION)
.style("opacity", OPACITY.NODE_DEFAULT)
.attr("transform", function(d) {
return "translate(" + d.x + "," + d.y + ")";
});
nodeEnter.append("text");
nodeEnter.append("rect")
.style("fill", function(d) {
d.color = colorScale(d.type.replace(/ .*/, ""));
return d.color;
})
.style("stroke", function(d) {
return d3.rgb(colorScale(d.type.replace(/ .*/, ""))).darker(0.1);
})
.style("stroke-WIDTH", "1px")
.attr("height", function(d) {
return d.height;
})
.attr("width", biHiSankey.nodeWidth());
node.on("click", function(g) {
if (!highlighted) {
highlighted = 1;
hideTooltip();
showConnections(g);
} else {
highlighted = 0;
hideConnections(g);
}
});
node.on("mouseenter", function(g) {
if (!highlighted) {
tooltip
.style("left", g.x + "px")
.style("top", g.y + g.height + MARGIN.TOP + 15 + "px")
.transition()
.duration(TRANSITION_DURATION)
.style("opacity", 1).select(".value")
.text(function() {
var additionalInstructions = g.children.length ? "\n\n(Double click to expand)" : "";
return g.name + "\n" + formatFlow(g.netFlow) + additionalInstructions;
});
showConnections(g);
}
});
node.on("mouseleave", function(g) {
if(expanded){
EXPANDED_NODES.forEach(function(expanded) {
highlightConnected(expanded);
}
);
hideTooltip();
fadeConnectedLinks(g);
}else if (!highlighted) {
hideConnections(g);
}
});
node.filter(function(d) {
return d.children.length;
})
.on("dblclick", showHideChildren);
// add in the text for the nodes
node.filter(function(d) {
return d.value !== 0;
})
.select("text")
.attr("x", -6)
.attr("y", function(d) {
return d.height / 2;
})
.attr("dy", ".35em")
.attr("text-anchor", "end")
.attr("transform", null)
.text(function(d) {
return d.name;
})
.filter(function(d) {
return d.x < WIDTH / 2;
})
.attr("x", 6 + biHiSankey.nodeWidth())
.attr("text-anchor", "start");
collapser = svg.select("#collapsers").selectAll(".collapser")
.data(biHiSankey.expandedNodes(), function(d) {
return d.id;
});
collapserEnter = collapser.enter().append("g").attr("class", "collapser");
collapserEnter.append("circle")
.attr("r", COLLAPSER.RADIUS)
.style("fill", function(d) {
d.color = colorScale(d.type.replace(/ .*/, ""));
return d.color;
});
collapserEnter
.style("opacity", OPACITY.NODE_DEFAULT)
.attr("transform", function(d) {
return "translate(" + (d.x + d.width / 2) + "," + (d.y + COLLAPSER.RADIUS) + ")";
});
collapserEnter.on("dblclick", showHideChildren);
// add in the text for the collapser
collapserEnter
.append("text")
.attr("dy", function(d){
return 2*COLLAPSER.RADIUS;
})
.attr("font-size", "13px")
.attr("font-family", "sans-serif")
.attr("font-style", "italic")
.attr("text-anchor", "middle")
.attr("transform", null)
.attr("fill", "#606060")
.text(function(d) {
if(d.name.length > 10)
return d.name.substring(0,7) + "...";
return d.name;
});
collapser.select("circle")
.attr("r", COLLAPSER.RADIUS);
collapser.transition()
.delay(TRANSITION_DURATION)
.duration(TRANSITION_DURATION)
.attr("transform", function(d, i) {
return "translate(" +
(COLLAPSER.RADIUS + i * 2 * (COLLAPSER.RADIUS + COLLAPSER.SPACING)) +
"," +
(-COLLAPSER.RADIUS - OUTER_MARGIN) +
")";
});
collapser.on("mouseenter", function(g) {
if (!isTransitioning) {
showTooltip().select(".value")
.text(function() {
return g.name + "\n(Double click to collapse)";
});
var highlightColor = highlightColorScale(g.type.replace(/ .*/, ""));
d3.select(this)
.style("opacity", OPACITY.NODE_HIGHLIGHT)
.select("circle")
.style("fill", highlightColor);
node.filter(function(d) {
return d.ancestors.indexOf(g) >= 0;
}).style("opacity", OPACITY.NODE_HIGHLIGHT)
.select("rect")
.style("fill", highlightColor);
}
});
collapser.on("mouseleave", function(g) {
if (!isTransitioning) {
hideTooltip();
d3.select(this)
.style("opacity", OPACITY.NODE_DEFAULT)
.select("circle")
.style("fill", function(d) {
return d.color;
});
node.filter(function(d) {
return d.ancestors.indexOf(g) >= 0;
}).style("opacity", OPACITY.NODE_DEFAULT)
.select("rect")
.style("fill", function(d) {
return d.color;
});
}
});
collapser.exit().remove();
}
var exampleNodes = [{"parent":null,"name":"A","id":"A","xPos":0,"type":"AA"},{"parent":null,"name":"B","id":"B","xPos":5,"type":"BB"},{"parent":"A","name":"1","id":1,"xPos":1,"type":"A1"},{"parent":"B","name":"1","id":2,"xPos":4,"type":"B1"},{"parent":null,"name":"B.2","id":"B.2","xPos":5,"type":"BB"},{"parent":"A","name":"1","id":3,"xPos":1,"type":"A1"},{"parent":"B.2","name":"1","id":4,"xPos":4,"type":"B1"},{"parent":null,"name":"B.3","id":"B.3","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":5,"xPos":1,"type":"A1"},{"parent":"B.3","name":"randomName","id":6,"xPos":4,"type":"B1"},{"parent":null,"name":"B.4","id":"B.4","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":7,"xPos":1,"type":"A1"},{"parent":"B.4","name":"randomName","id":8,"xPos":4,"type":"B1"},{"parent":null,"name":"B.5","id":"B.5","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":9,"xPos":1,"type":"A1"},{"parent":"B.5","name":"randomName","id":10,"xPos":4,"type":"B1"},{"parent":null,"name":"B.6","id":"B.6","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":11,"xPos":1,"type":"A1"},{"parent":"B.6","name":"randomName","id":12,"xPos":4,"type":"B1"},{"parent":"A","name":"randomName","id":13,"xPos":1,"type":"A1"},{"parent":"B","name":"randomName","id":14,"xPos":4,"type":"B1"},{"parent":null,"name":"B.7","id":"B.7","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":15,"xPos":1,"type":"A1"},{"parent":"B.7","name":"randomName","id":16,"xPos":4,"type":"B1"},{"parent":null,"name":"B.8","id":"B.8","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":17,"xPos":1,"type":"A1"},{"parent":"B.8","name":"randomName","id":18,"xPos":4,"type":"B1"},{"parent":null,"name":"B.9","id":"B.9","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":19,"xPos":1,"type":"A1"},{"parent":"B.9","name":"randomName","id":20,"xPos":4,"type":"B1"},{"parent":null,"name":"B.10","id":"B.10","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":21,"xPos":1,"type":"A1"},{"parent":"B.10","name":"randomName","id":22,"xPos":4,"type":"B1"},{"parent":null,"name":"B.11","id":"B.11","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":23,"xPos":1,"type":"A1"},{"parent":"B.11","name":"randomName","id":24,"xPos":4,"type":"B1"},{"parent":null,"name":"B.12","id":"B.12","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":25,"xPos":1,"type":"A1"},{"parent":"B.12","name":"randomName","id":26,"xPos":4,"type":"B1"},{"parent":null,"name":"B.13","id":"B.13","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":27,"xPos":1,"type":"A1"},{"parent":"B.13","name":"randomName","id":28,"xPos":4,"type":"B1"},{"parent":null,"name":"B.14","id":"B.14","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":29,"xPos":1,"type":"A1"},{"parent":"B.14","name":"randomName","id":30,"xPos":4,"type":"B1"},{"parent":null,"name":"B.15","id":"B.15","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":31,"xPos":1,"type":"A1"},{"parent":"B.15","name":"randomName","id":32,"xPos":4,"type":"B1"},{"parent":null,"name":"B.16","id":"B.16","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":33,"xPos":1,"type":"A1"},{"parent":"B.16","name":"randomName","id":34,"xPos":4,"type":"B1"},{"parent":null,"name":"B.17","id":"B.17","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":35,"xPos":1,"type":"A1"},{"parent":"B.17","name":"randomName","id":36,"xPos":4,"type":"B1"},{"parent":"A","name":"randomName","id":37,"xPos":1,"type":"A1"},{"parent":"B.5","name":"randomName","id":38,"xPos":4,"type":"B1"},{"parent":null,"name":"B.18","id":"B.18","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":39,"xPos":1,"type":"A1"},{"parent":"B.18","name":"randomName","id":40,"xPos":4,"type":"B1"},{"parent":null,"name":"B.19","id":"B.19","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":41,"xPos":1,"type":"A1"},{"parent":"B.19","name":"randomName","id":42,"xPos":4,"type":"B1"},{"parent":null,"name":"B.20","id":"B.20","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":43,"xPos":1,"type":"A1"},{"parent":"B.20","name":"randomName","id":44,"xPos":4,"type":"B1"},{"parent":null,"name":"B.21","id":"B.21","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":45,"xPos":1,"type":"A1"},{"parent":"B.21","name":"randomName","id":46,"xPos":4,"type":"B1"},{"parent":null,"name":"B.1","id":"B.1","xPos":0,"type":"AA"},{"parent":"B.1","name":"randomName","id":47,"xPos":1,"type":"A1"},{"parent":"B.18","name":"randomName","id":48,"xPos":4,"type":"B1"},{"parent":"B.1","name":"randomName","id":49,"xPos":1,"type":"A1"},{"parent":"B.19","name":"randomName","id":50,"xPos":4,"type":"B1"},{"parent":null,"name":"B.22","id":"B.22","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":51,"xPos":1,"type":"A1"},{"parent":"B.22","name":"randomName","id":52,"xPos":4,"type":"B1"},{"parent":null,"name":"B.23","id":"B.23","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":53,"xPos":1,"type":"A1"},{"parent":"B.23","name":"randomName","id":54,"xPos":4,"type":"B1"},{"parent":null,"name":"B.24","id":"B.24","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":55,"xPos":1,"type":"A1"},{"parent":"B.24","name":"randomName","id":56,"xPos":4,"type":"B1"},{"parent":null,"name":"B.25","id":"B.25","xPos":5,"type":"BB"},{"parent":"A","name":"randomName","id":57,"xPos":1,"type":"A1"},{"parent":"B.25","name":"randomName","id":58,"xPos":4,"type":"B1"}]
var exampleLinks = [{"source":1,"value":1,"target":2},{"source":3,"value":1,"target":4},{"source":5,"value":1,"target":6},{"source":7,"value":1,"target":8},{"source":9,"value":1,"target":10},{"source":11,"value":1,"target":12},{"source":13,"value":1,"target":14},{"source":15,"value":1,"target":16},{"source":17,"value":1,"target":18},{"source":19,"value":1,"target":20},{"source":21,"value":1,"target":22},{"source":23,"value":1,"target":24},{"source":25,"value":1,"target":26},{"source":27,"value":1,"target":28},{"source":29,"value":1,"target":30},{"source":31,"value":1,"target":32},{"source":33,"value":1,"target":34},{"source":35,"value":1,"target":36},{"source":37,"value":1,"target":38},{"source":39,"value":1,"target":40},{"source":41,"value":1,"target":42},{"source":43,"value":1,"target":44},{"source":45,"value":1,"target":46},{"source":47,"value":1,"target":48},{"source":49,"value":1,"target":50},{"source":51,"value":1,"target":52},{"source":53,"value":1,"target":54},{"source":55,"value":1,"target":56},{"source":57,"value":1,"target":58}]
biHiSankey
.nodes(exampleNodes)
.links(exampleLinks)
.initializeNodes(function(node) {
node.state = node.parent ? "contained" : "collapsed";
})
.layout(LAYOUT_INTERATIONS);
disableUserInterractions(2 * TRANSITION_DURATION);
update();
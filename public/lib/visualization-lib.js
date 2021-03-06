(function() {
  "use strict";

  window.renderObstacleMap = window.renderObstacleMap || function(element, w, h, r, dH, dW) {
    var randomX = function() { return parseInt(Math.random() * 3000); },
        randomY = function() { return parseInt(Math.random() * 3000); },
        randomR = function() { return parseInt(Math.random() * 50); }

    var randomColor = function(d, i) {
      var hex = ['a', 'b', 'c', 'd', 'e', 'f', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      var color = "";

      while(color.length < 6) {
        var rando = parseInt(Math.random()*16);
        color = color + hex[rando];
      }

      return '#' + color;
    };

    var width = w || 960,
        height = h || 500,
        radius = r || 20,
        droneHeight = dH || 50,
        droneWidth = dW || 50;

    var data = d3.range(50).map(function() {
      return [
        randomX(),
        randomY()
      ];
    });

    var x = d3.scale.linear()
        .domain([0, width])
        .range([width, 0]);

    var y = d3.scale.linear()
        .domain([0, height])
        .range([height, 0]);

    d3.selectAll('svg').remove();

    var svg = d3.select(element).append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("class", "zoom-container")
        .call(d3.behavior.zoom().x(x).y(y).scale(1).scaleExtent([1, 1])
        .on("zoom", zoom));

    var rect = svg.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height);

    var circle = svg.selectAll("circle")
        .data(data)
        .enter().append("circle")
        .attr("r", radius)
        .attr("transform", transform);

    var drone = svg.selectAll(".drone")
        .data([width / 2, height / 2])
        .enter().append("image")
        .attr("transform","translate(" + (width / 2 - droneWidth / 2)+ "," + (height / 2 - droneHeight / 2) + ")")
        .attr("xlink:href","./css/images/drone.png")
        .attr("height", droneHeight + "px")
        .attr("width", droneWidth + "px");

    var currCorner,
        centerPt = [],
        viewBox = [],
        detectionBox = [],
        inrange = [],
        howmany,
        region;

    circle.style("stroke", randomColor);
    circle.style("fill", randomColor);

    function createWarnings(currCorner) {
      circle.data().forEach(function(datum) {
        if (inTheBox(datum, detectionBox) && !inTheBox(datum, viewBox)) {
          inrange.push(makeWarningData(datum, currCorner, findRegion(datum, viewBox)));
          howmany++;
        }
      });
    }

    function zoom() {
      inrange.length = 0;

      svg.selectAll("g").data(inrange).exit().remove();

      howmany = 0;
      currCorner = d3.event.translate;
      centerPt = [currCorner[0] + (width/2), currCorner[1] + (height/2), radius];
      var dronePt = [centerPt[0] - droneWidth/2, centerPt[1] + droneHeight/2];
      viewBox = [[centerPt[0] - (width/2) - radius, centerPt[0] + (width/2) + radius], [centerPt[1] - (height/2) - radius, centerPt[1] + (height/2) + radius]];
      var smallBox = [[centerPt[0] - 50, centerPt[0] + 50], [centerPt[1] - 50, centerPt[1] + 50]];
      detectionBox = [[centerPt[0] - (width + radius), centerPt[0] + (width + radius)],[centerPt[1] - (height + radius), centerPt[1] + (height + radius)]];
      circle.data(data).enter().append("circle");

      drone.data(dronePt).enter().append("image");

      createWarnings(currCorner);

      // red dots
      var container = svg.selectAll("g").data(inrange)
        .enter().append("g")
        .attr("transform", transform)

      container.append("ellipse")
        .attr("rx", function(d) { return Math.min(2000/(d[2] + 1), radius);})
        .attr("ry", function(d) { return Math.min(2000/(d[2] + 1), radius); })
        .style("fill", "red")
        .style("fill-opacity", .7);

      container.append("text")
        .attr("x", function(d) { return -1*Math.min(1000/(d[2] + 1), 7);})
        .attr("y", function(d) { return Math.min(700/(d[2] + 1), 5);})
        .attr("font-size", function(d) { return Math.min(2000/(d[2] + 1), 17);})
        .text(function(d){ return parseInt(d[2]); })
        .style("fill", "white")
        .style("font-weight", "bold");

      circle.attr("transform", transform);
    }

    function calculateDistance(currCorner, circlePts) {
      var x = circlePts[0],
          y = circlePts[1],
          centerX = currCorner[0] + (width/2),
          centerY = currCorner[1] + (height/2),
          viewBox = [[centerX - (width/2) - radius, centerX + (width/2) + radius], [centerY - (height/2) - radius, centerY + (height/2) + radius]],
          distance = null;

      var region = findRegion([x, y], viewBox);

      switch (region) {
        case 'UpperRight':
          distance = Math.sqrt(Math.pow((viewBox[0][0] - x), 2) + Math.pow((viewBox[1][1] - y), 2));
          break;
        case 'UpperLeft':
          distance = Math.sqrt(Math.pow((viewBox[0][1] - x), 2) + Math.pow((viewBox[1][1] - y), 2));
          break;
        case 'Up':
          distance = Math.abs(viewBox[1][1] - y);
          break;
        case 'LowerRight':
          distance = Math.sqrt(Math.pow((viewBox[0][0] - x), 2) + Math.pow((viewBox[1][0] - y), 2));
          break;
        case 'LowerLeft':
          distance = Math.sqrt(Math.pow((viewBox[0][1] - x), 2) + Math.pow((viewBox[1][0] - y), 2));
          break;
        case 'Low':
          distance = Math.abs(viewBox[1][0] - y);
          break;
        case 'Left':
          distance = Math.abs(viewBox[0][1] - x);
          break;
        case 'Right':
          distance = Math.abs(viewBox[0][0] - x);
          break;
        default: distance = null;
      }

      return distance;
    }

    function makeWarningData (point, currCorner, region) {
      var x = point[0],
          y = point[1],
          x0 = currCorner[0],
          x1 = currCorner[0] + width,
          y0 = currCorner[1],
          y1 = currCorner[1] + height, warnPt;
      switch (region) {
        case 'UpperRight':
          warnPt = [x0 + 15, y1 - 15];
          break;
        case 'UpperLeft':
          warnPt = [x1 - 15, y1 - 15];
          break;
        case 'Up':
          warnPt = [x, y1 - 15];
          break;
        case 'LowerRight':
          warnPt = [x0 + 15, y0 + 15];
          break;
        case 'LowerLeft':
          warnPt = [x1 - 15, y0 + 15];
          break;
        case 'Low':
          warnPt = [x, y0 + 15];
          break;
        case 'Left':
          warnPt = [x1 - 15, y];
          break;
        case 'Right':
          warnPt = [x0 + 15, y];
          break;
        default: warnPt = null;
      }

      warnPt.push(calculateDistance(currCorner, point));

      return warnPt;
    }

    function findRegion (point, box) {
      var x = point[0], y = point[1], x0 = box[0][0], x1 = box[0][1], y0 = box[1][0], y1 = box[1][1];

      if(y >= y1) {
        if(x >= x1) return 'UpperLeft';
        else if(x <= x0) return 'UpperRight';
        else return 'Up';
      } else if(y <= y0) {
        if(x >= x1) return 'LowerLeft';
        else if(x <= x0) return 'LowerRight';
        else return 'Low';
      } else {
        if(x >= x1) return 'Left';
        else if(x <= x0) return 'Right';
      }
      return "unknown";
    }

    function inTheBox (point, box) {
      var x = point[0], y = point[1];
      return x > box[0][0] && x < box[0][1] && y > box[1][0] && y < box[1][1];
    }

    function transform(d, i) {
      return "translate(" + x(d[0]) + "," + y(d[1]) + ")";
    }
  };
})();

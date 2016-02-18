'use strict';

angular.module('cassiopeiaApp')
  .service('nova', function () {
    // CUSTOM NOVA LAYOUT
    (function() {
		  d3.layout.nova = function() {
		    var layout = _sortInNova,
		        size = [1, 1],//for now, the layout doesn't handle resizing (done in the vis itself)

		        minX,
		        maxX,
		        sX = d3.scale.linear(),

		        minY,
		        maxY,
		        sY = d3.scale.linear(),

		        range,//absolute range begin minX and maxX
		        remainder,//remainder from the total number of ranges that can fit before minX
		        colN,//layout number of columns
		        displacement,//the remainder of columns that helps to attribute proper column for each node
		        relRank,//relative ranks in their columns

		        nodeSize,

		        columns = [],
		        columnSize,

		        i,//iterator lvl 1
		        n,//nodes length
		        j,//iterator lvl 2

		        px,//in nested mode: position of parent
		        py,

		        x,//position of currently processed node
		        y,

		        col,//column attribution
		        maxRank,
		        rowSize
		        ;

		    function nova(nodes, accessorX, accessorY, minX, maxX, span, accessorXNested) {
		      return layout(nodes, accessorX, accessorY, minX, maxX, span, accessorXNested);
		    }

		    function _sortInNova(nodes, accessorX, accessorY, minX, maxX, span, accessorXNested) {
		    	var n = nodes && nodes.length;
		    	if(!n)return;

		      i = -1;
		      n = nodes.length;
		      j = -1;


		      sX.domain([minX, maxX]);

		      nodes = nodes.sort(function(a, b){
		      	var a1 = accessorY(a), b1 = accessorY(b);
		      	if(a1 > b1)
		      		return 1;
		      	else return -1;
		      });

		      columns = [];
		      range = maxX - minX;
		      remainder = minX%range;

		      columnSize = size[1]/(range/span);
		      colN = parseInt(1/columnSize)+1;
		      displacement = sX(minX + remainder%(range/colN));

		      for(var j = 0 ; j <= colN ; j++){
		      	columns.push({count:0, lastrank:0});
		      }

		      while(++i  < nodes.length){
		      	x = sX(accessorX(nodes[i]));
		      	nodes[i].x = x;
		      	col = parseInt((x+displacement)/columnSize);
		      	nodes[i].col = col;
		      	nodes[i].rank = columns[col].lastrank;
		      	if(!columns[col]){
		      		console.error('nova issue ', i)
		      		continue;
		      	}
		      	columns[col].lastrank++;
		      	columns[col].count++;
		      	nodes[i].y = 0;


		      	if(accessorXNested){
		      		j = -1;
		      		px = x;
		      		while(++j < nodes[i].values.length){
		      			x = sX(accessorXNested(nodes[i].values[j]));
		      			nodes[i].values[j].x = x;
		      			col = parseInt((x+displacement)/columnSize);

		      			nodes[i].values[j].col = col;
		      			//if not first, compute rank
		      			if(j > 0){
		      				nodes[i].values[j].rank = columns[col].lastrank;
					      	columns[col].lastrank++;
					      	columns[col].count++;
					     //if first, same rank as parent
		      			}else{
		      				nodes[i].values[j].rank = nodes[i].rank
		      			}

				      	nodes[i].values[j].y = 0;
				      	nodes[i].values[j].relx = x - px;//relative to parent
		      		}
		      	}
		      }

			  maxRank = d3.max(columns, function(d){
			      	return d.count;
			   });
			   rowSize = (maxRank > 1)?1/maxRank : .5;

		      sY.domain([0, maxRank]).range([rowSize, 1 - rowSize]);
		      i = -1;

		      while(++i < nodes.length){
		      	relRank = (maxRank - columns[nodes[i].col].count)/2 + nodes[i].rank;
		      	nodes[i].y = sY(relRank);
		      	if(accessorXNested){
		      		j = -1;
		      		py = nodes[i].y;
		      		while(++j < nodes[i].values.length){
		      			relRank = (maxRank - columns[nodes[i].values[j].col].count)/2 + nodes[i].values[j].rank;
		      			nodes[i].values[j].y = sY(relRank);
		      			nodes[i].values[j].rely = nodes[i].values[j].y - py;
		      			if(j > 0){
							nodes[i].values[j].nextrelx =  nodes[i].values[j-1].relx -nodes[i].values[j].relx;
							nodes[i].values[j].nextrely = nodes[i].values[j-1].rely -nodes[i].values[j].rely;
						}else{
							//if 0 connect to origin
							nodes[i].values[j].nextrelx = -nodes[i].values[j].relx;
							nodes[i].values[j].nextrely = -nodes[i].values[j].rely;
						}
		      		}
		      	}
		      }

		      nodeSize = [columnSize, rowSize];

		      return nodes;
		    }

		    nova.size = function(value) {
		      if (!arguments.length) return nodeSize ? actualSize : size;
		      actualSize = [0, 0];
		      nodeSize = (size = value) == null;
		      return nova;
		    }

		    nova.nodeSize = function(value) {
		    	if(!arguments.length)return nodeSize;
		    	nodeSize = (size = value) != null;
		    	return nova;
		    }

		    return nova;
		  };
		})();
  });

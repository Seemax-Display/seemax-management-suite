function createP391Planner() {
  "use strict";
  function integer(value) { var n=Number(value);return Number.isFinite(n)?Math.max(0,Math.floor(n)):0; }
  function geometry(raw) {
    var cols=integer(raw.cols),rows=integer(raw.rows),faces=Number(raw.faces)===2?2:1;
    if(!cols||!rows||cols>4000||rows>4000)throw new Error("Dimensioni P3.91 non valide.");
    return {cols:cols,rows:rows,faces:faces,cells:cols*rows*faces,maxRect:Math.floor(cols*rows/2)*faces};
  }
  function allocate(configurations,stock) {
    var grids=(configurations||[]).map(geometry),cells=0,capacity=0;
    grids.forEach(function(g){cells+=g.cells;capacity+=g.maxRect;});
    var availableRect=integer(stock&&stock.rect),availableSquare=integer(stock&&stock.square);
    var chosen=Math.min(capacity,availableRect),feasible=cells-2*chosen<=availableSquare;
    if(!feasible)chosen=capacity;
    var left=chosen;
    var plans=grids.map(function(g){
      var rect=Math.min(left,g.maxRect);left-=rect;
      return {cols:g.cols,rows:g.rows,faces:g.faces,cells:g.cells,rect:rect,square:g.cells-2*rect,feasible:feasible};
    });
    return {feasible:feasible,rect:chosen,square:cells-2*chosen,plans:plans,availableRect:availableRect,availableSquare:availableSquare};
  }
  function plan(cols,rows,faces,rectStock,squareStock) {
    return allocate([{cols:cols,rows:rows,faces:faces}],{rect:rectStock,square:squareStock}).plans[0];
  }
  function tiles(cols,rows,rectCount) {
    var g=geometry({cols:cols,rows:rows}),needed=integer(rectCount);
    if(needed>g.maxRect)throw new Error("Composizione P3.91 non valida.");
    if(g.cells>1600)return null;
    var pairs=[];
    for(var y=0;y+1<rows;y+=2)for(var x=0;x<cols;x++)pairs.push({x:x,y:y,w:1,h:2});
    if(rows%2)for(var x2=0;x2+1<cols;x2+=2)pairs.push({x:x2,y:rows-1,w:2,h:1});
    var used={},result=[];
    pairs.slice(0,needed).forEach(function(t){
      result.push(t);
      for(var dy=0;dy<t.h;dy++)for(var dx=0;dx<t.w;dx++)used[(t.x+dx)+":"+(t.y+dy)]=true;
    });
    for(var cy=0;cy<rows;cy++)for(var cx=0;cx<cols;cx++)if(!used[cx+":"+cy])result.push({x:cx,y:cy,w:1,h:1});
    return result;
  }
  return {allocate:allocate,plan:plan,tiles:tiles};
}
(function(root){var api=createP391Planner();if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.SeemaxP391=api;})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:this);


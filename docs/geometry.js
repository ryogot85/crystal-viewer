(function (root) {
  'use strict';
  const add = (a,b) => a.map((v,j) => v+b[j]);
  const scale = (a,s) => a.map(v => v*s);
  const dot = (a,b) => a.reduce((s,v,j) => s+v*b[j],0);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const length = a => Math.hypot(...a);
  const unit = a => length(a) ? scale(a,1/length(a)) : [0,0,0];
  const indices = (p,q,r) => [p,q,-p-q,r];
  const basis = ratio => [[.5,Math.sqrt(3)/2,0],[.5,-Math.sqrt(3)/2,0],[-1,0,0],[0,0,ratio]];
  // All Cartesian coordinates are measured in units of a.
  const direction = (w,x,z,ratio) => {
    const axes=basis(ratio),coefficients=indices(w,x,z);
    return axes.reduce((sum,axis,j)=>add(sum,scale(axis,coefficients[j])),[0,0,0]);
  };
  // The plane cuts w, x, y, z at reciprocal index positions.
  const normal = (h,k,l,ratio) => [h+k,(h-k)/Math.sqrt(3),l/ratio];
  function prism(ratio) {
    const vertices=[];
    for(const z of [0,ratio]) for(let j=0;j<6;j++) vertices.push([Math.cos(j*Math.PI/3),Math.sin(j*Math.PI/3),z]);
    const edges=[];
    for(let j=0;j<6;j++) edges.push([j,(j+1)%6],[j+6,(j+1)%6+6],[j,j+6]);
    return {vertices,edges};
  }
  function section(n,ratio) {
    if(length(n)<1e-12) return [];
    const {vertices,edges}=prism(ratio);
    // Use the +1 member of the family when visible. A purely negative c plane
    // would lie below the bottom face; its -1 family member remains visible.
    const positive=clip(1),negative=positive.length<3?clip(-1):[];
    return positive.length>=3?positive:negative;
    function clip(level){
    const points=[];
    function insert(p){if(!points.some(q=>length(add(p,scale(q,-1)))<1e-8))points.push(p);}
    for(const [i,j] of edges){
      const a=vertices[i], b=vertices[j], da=dot(n,a)-level, db=dot(n,b)-level;
      if(Math.abs(da)<1e-9)insert(a);
      if(Math.abs(db)<1e-9)insert(b);
      if(da*db < -1e-16)insert(add(a,scale(add(b,scale(a,-1)),da/(da-db))));
    }
    if(points.length<3)return [];
    const center=scale(points.reduce(add,[0,0,0]),1/points.length);
    const e1=unit(add(points[0],scale(center,-1))),e2=unit(cross(n,e1));
    points.sort((a,b)=>Math.atan2(dot(add(a,scale(center,-1)),e2),dot(add(a,scale(center,-1)),e1))-Math.atan2(dot(add(b,scale(center,-1)),e2),dot(add(b,scale(center,-1)),e1)));
    points.level=level;
    return points;
    }
  }
  const api={add,scale,dot,cross,length,unit,indices,basis,direction,normal,prism,section};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.HexGeometry=api;
})(typeof window!=='undefined'?window:globalThis);

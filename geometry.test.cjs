'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const G=require('./dist/geometry.js');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('all selectable values: four-axis sums, reciprocal dot products, plane clipping',()=>{
  for(const ratio of [.6,1.633,2.5]) for(let p=-2;p<=2;p++) for(let q=-2;q<=2;q++) for(let z=-2;z<=2;z++){
    const indices=G.indices(p,q,z),axes=G.basis(ratio),n=G.normal(p,q,z,ratio),d=G.direction(p,q,z,ratio);
    assert.equal(indices[0]+indices[1]+indices[2],0);
    const direct=axes.reduce((sum,b,j)=>G.add(sum,G.scale(b,indices[j])),[0,0,0]);
    d.forEach((x,j)=>close(x,direct[j]));
    axes.forEach((b,j)=>close(G.dot(n,b),indices[j]));
    const poly=G.section(n,ratio);
    if(p===0&&q===0&&z===0){assert.equal(poly.length,0);assert.equal(G.length(d),0);continue;}
    assert.ok(poly.length>=3,'nonzero plane intersects display prism');
    poly.forEach(v=>{close(G.dot(n,v),poly.level);assert.ok(v[2]>=-1e-9&&v[2]<=ratio+1e-9);assert.ok(Math.hypot(v[0],v[1])<=1+1e-9);});
    const area=G.length(poly.reduce((sum,v,j)=>G.add(sum,G.cross(v,poly[(j+1)%poly.length])),[0,0,0]))/2;
    assert.ok(area>1e-9,'intersection polygon must have positive area');
  }
});
test('known basal and axial examples',()=>{
  G.direction(2,-1,0,1.633).forEach((v,j)=>close(v,[1.5,3*Math.sqrt(3)/2,0][j]));
  close(G.direction(0,0,1,1.633)[2],1.633);
  G.section(G.normal(0,0,-1,1.633),1.633).forEach(v=>close(v[2],1.633));
  G.section(G.normal(2,-1,0,1.633),1.633).forEach(v=>close(G.dot(G.normal(2,-1,0,1.633),v),1));
});
test('w, x, y are the shared axes for directions and planes',()=>{
  const [w,x,y,vertical]=G.basis(Math.sqrt(8/3));
  [w,x,y].forEach(axis=>close(G.length(axis),1));
  G.add(G.add(w,x),y).forEach(value=>close(value,0));
  close(G.dot(w,x),-.5);close(G.dot(x,y),-.5);close(G.dot(y,w),-.5);
  vertical.forEach((value,j)=>close(value,[0,0,Math.sqrt(8/3)][j]));
  for(const [first,second,expected] of [[2,-1,w],[-1,2,x],[-1,-1,y]]){
    G.direction(first,second,0,Math.sqrt(8/3)).forEach((value,j)=>close(value,3*expected[j]));
  }
});
test('origin is at the center of the bottom hexagon; initial prism face exists',()=>{
  const {vertices}=G.prism(1.633);
  vertices.slice(0,6).forEach(v=>close(v[2],0));
  const center=vertices.slice(0,6).reduce(G.add,[0,0,0]).map(v=>v/6);
  center.forEach(v=>close(v,0));
  const polygon=G.section(G.normal(1,0,0,1.633),1.633);
  assert.ok(polygon.length>=3);
  polygon.forEach(v=>close(G.dot(G.normal(1,0,0,1.633),v),1));
});
test('initial diagonal view faces the (1 0 -1 0) prism face',()=>{
  const n=G.unit(G.normal(1,0,0,Math.sqrt(8/3)));
  [Math.sin(Math.PI/3),Math.cos(Math.PI/3),0].forEach((v,j)=>close(v,n[j]));
});

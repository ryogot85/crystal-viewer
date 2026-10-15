'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('./dist/materials.js');
const distance=(a,b)=>Math.hypot(...a.map((x,j)=>x-b[j]));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
for(const symbol of ['Fe','Cu','Mg'])test(`${symbol}: atom positions, neighbors and every distinct dense row in the plane`,()=>{
  const m=M.model(symbol),expectedCounts={Fe:9,Cu:14,Mg:17},expectedDirections={Fe:2,Cu:3,Mg:3};
  assert.equal(m.atoms.length,expectedCounts[symbol]);
  let nearest=Infinity;
  for(let i=0;i<m.atoms.length;i++)for(let j=i+1;j<m.atoms.length;j++){
    const d=distance(m.atoms[i],m.atoms[j]);assert.ok(d>1e-9,'no duplicates');nearest=Math.min(nearest,d);
  }
  close(nearest,m.nearest);
  assert.ok(m.polygon.every(m.onPlane),'display polygon lies in selected plane');
  assert.equal(m.directions.length,expectedDirections[symbol]);
  for(const direction of m.directions){
    assert.ok(direction.points.every(m.onPlane),'direction is in selected plane');
    const row=m.atoms.filter(direction.onRow).sort((a,b)=>a.reduce((s,x,j)=>s+x*direction.axis[j],0)-b.reduce((s,x,j)=>s+x*direction.axis[j],0));
    assert.ok(row.length>=2);
    assert.ok(row.every(m.onPlane));
    for(let j=1;j<row.length;j++)close(distance(row[j],row[j-1]),m.rowDistance);
  }
  for(let i=0;i<m.directions.length;i++)for(let j=i+1;j<m.directions.length;j++){
    const a=m.directions[i].axis,b=m.directions[j].axis;
    assert.ok(Math.abs(a.reduce((s,x,k)=>s+x*b[k],0))<Math.hypot(...a)*Math.hypot(...b)-1e-8,'directions must not be parallel');
  }
  const planeAtoms=m.atoms.filter(m.onPlane);
  for(let i=0;i<planeAtoms.length;i++)for(let j=i+1;j<planeAtoms.length;j++){
    const delta=planeAtoms[j].map((x,k)=>x-planeAtoms[i][k]),separation=distance(planeAtoms[i],planeAtoms[j]);
    if(Math.abs(separation-m.rowDistance)>1e-8)continue;
    assert.ok(m.directions.some(direction=>{
      const axis=direction.axis,projection=Math.abs(delta.reduce((sum,x,k)=>sum+x*axis[k],0));
      return Math.abs(projection-separation*Math.hypot(...axis))<1e-8;
    }),'every nearest in-plane atomic pair belongs to a displayed direction');
  }
  assert.ok(m.nearest<=m.rowDistance+1e-8);
});
test('conventional cubic cells have the expected weighted atom counts',()=>{
  const fe=M.model('Fe'),cu=M.model('Cu');
  assert.equal(fe.atoms.length-8,1,'one body center');
  assert.equal(cu.atoms.length-8,6,'six face centers');
  assert.equal(8/8+1,2,'BCC: eight shared corners plus one interior');
  assert.equal(8/8+6/2,4,'FCC: eight shared corners plus six shared faces');
  for(const m of [fe,cu]){
    const a=m.element.a;
    m.vertices.forEach(p=>p.forEach(v=>close(Math.abs(v),a/2)));
  }
});
test('HCP basal six-neighbor packing and AB stacking',()=>{
  const m=M.model('Mg'),a=m.element.a,c=m.element.c;
  assert.equal(m.atoms.filter(m.onPlane).length,7);
  assert.equal(m.atoms.filter(p=>m.onPlane(p)&&Math.abs(distance(p,[0,0,0])-a)<1e-8).length,6);
  assert.equal(m.atoms.filter(p=>Math.abs(p[2]-c/2)<1e-8).length,3);
  assert.equal(m.atoms.filter(p=>Math.abs(p[2]-c)<1e-8).length,7);
  assert.ok(Math.abs(c/a-Math.sqrt(8/3))<.02);
});

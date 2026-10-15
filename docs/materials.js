(function(root){
  'use strict';
  // Lengths in nm, representative ambient-phase lattice parameters.
  // Data: WebElements crystal_structure entries, literature references linked in the UI.
  const elements={
    Fe:{name:'鉄',phase:'α-Fe',structure:'BCC',structureName:'体心立方構造',a:.28665,color:'#7f8c98',light:'#edf2f7',dark:'#364451',plane:'(110)',planeFamily:'{110}',directionFamily:'⟨111⟩',directions:[{index:'[11̄1]',axis:[1,-1,1]},{index:'[11̄1̄]',axis:[1,-1,-1]}],planeName:'最も原子が密な面',source:'https://www.webelements.com/iron/crystal_structure.html'},
    Cu:{name:'銅',phase:'Cu',structure:'FCC',structureName:'面心立方構造',a:.36149,color:'#c57e52',light:'#ffddbb',dark:'#774629',plane:'(111)',planeFamily:'{111}',directionFamily:'⟨110⟩',directions:[{index:'[11̄0]',axis:[1,-1,0]},{index:'[101̄]',axis:[1,0,-1]},{index:'[011̄]',axis:[0,1,-1]}],planeName:'最密面',source:'https://www.webelements.com/copper/crystal_structure.html'},
    Mg:{name:'マグネシウム',phase:'Mg',structure:'HCP',structureName:'六方最密構造',a:.32094,c:.52108,color:'#b4c2ca',light:'#ffffff',dark:'#637684',plane:'(0001)',planeFamily:'{0001}',directionFamily:'⟨112̄0⟩',directions:[{index:'[112̄0]',axis:[1,0,0]},{index:'[21̄1̄0]',axis:[.5,Math.sqrt(3)/2,0]},{index:'[1̄21̄0]',axis:[.5,-Math.sqrt(3)/2,0]}],planeName:'最密面（底面）',source:'https://www.webelements.com/magnesium/crystal_structure.html'}
  };
  const dot=(a,b)=>a.reduce((s,v,j)=>s+v*b[j],0);
  const sub=(a,b)=>a.map((v,j)=>v-b[j]);
  const norm=p=>Math.hypot(...p);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  function model(symbol){
    const m=elements[symbol];if(!m)throw new Error('Unknown element');
    const a=m.a,atoms=[],edges=[],vertices=[],normal=m.structure==='BCC'?[1,1,0]:m.structure==='FCC'?[1,1,1]:[0,0,1];
    let center=[0,0,0],polygon,rowDistance,planeLevel=0;
    if(m.structure==='HCP'){
      // Hexagonal basal lattice positions with AB stacking.
      for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)for(let k=0;k<=1;k++)for(const b of [[0,0,0],[2/3,1/3,.5]]){
        const p=[a*(i+b[0]-(j+b[1])/2),a*Math.sqrt(3)/2*(j+b[1]),m.c*(k+b[2])];
        if(Math.hypot(p[0],p[1])<=a+1e-8&&p[2]<=m.c+1e-8)atoms.push(p);
      }
      for(const z of [0,m.c])for(let j=0;j<6;j++)vertices.push([a*Math.cos(j*Math.PI/3),a*Math.sin(j*Math.PI/3),z]);
      for(let j=0;j<6;j++)edges.push([j,(j+1)%6],[j+6,(j+1)%6+6],[j,j+6]);
      polygon=vertices.slice(0,6);center=[0,0,m.c/2];rowDistance=a;
    }else{
      // One conventional cubic cell: 8 corners + 1 body center or 6 face centers.
      for(const z of [-a/2,a/2])for(const y of [-a/2,a/2])for(const x of [-a/2,a/2]){
        vertices.push([x,y,z]);atoms.push([x,y,z]);
      }
      if(m.structure==='BCC')atoms.push([0,0,0]);
      else for(let j=0;j<3;j++)for(const side of [-a/2,a/2]){const p=[0,0,0];p[j]=side;atoms.push(p);}
      for(let i=0;i<8;i++)for(const flip of [1,2,4])if(i<(i^flip))edges.push([i,i^flip]);
      if(m.structure==='BCC'){
        polygon=[[-a/2,a/2,-a/2],[a/2,-a/2,-a/2],[a/2,-a/2,a/2],[-a/2,a/2,a/2]];
        rowDistance=Math.sqrt(3)*a/2;
      }else{
        planeLevel=a/2;
        polygon=[[a/2,a/2,-a/2],[a/2,-a/2,a/2],[-a/2,a/2,a/2]];
        rowDistance=a/Math.sqrt(2);
      }
    }
    const onPlane=p=>Math.abs(dot(p,normal)-planeLevel)<1e-8;
    const planeAtoms=atoms.filter(onPlane);
    const directions=m.directions.map(({index,axis})=>{
      let points=null,maxDistance=0;
      for(let i=0;i<planeAtoms.length;i++)for(let j=i+1;j<planeAtoms.length;j++){
        const delta=sub(planeAtoms[j],planeAtoms[i]),distance=norm(delta);
        if(distance<=maxDistance+1e-8||norm(cross(delta,axis))>1e-8)continue;
        points=dot(delta,axis)>0?[planeAtoms[i],planeAtoms[j]]:[planeAtoms[j],planeAtoms[i]];
        maxDistance=distance;
      }
      if(!points||maxDistance<rowDistance-1e-8)throw new Error(`No atomic row for ${index}`);
      const vector=sub(points[1],points[0]);
      const onRow=p=>onPlane(p)&&norm(cross(sub(p,points[0]),vector))<1e-8;
      return {index,axis,points,onRow};
    });
    const nearest=m.structure==='HCP'?Math.min(a,Math.hypot(a/Math.sqrt(3),m.c/2)):rowDistance;
    return {element:m,atoms,vertices,edges,polygon,normal,center,directions,rowDistance,nearest,onPlane,planeLevel};
  }
  const api={elements,model};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CrystalMaterials=api;
})(typeof window!=='undefined'?window:globalThis);

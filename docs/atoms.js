(() => {
  'use strict';
  const $=id=>document.getElementById(id),M=window.CrystalMaterials;
  const state={symbol:'Fe',az:.65,el:.42,size:.55};
  const directionColors=['#167554','#7251a1','#ad476d'];
  let current=M.model('Fe'),pointer=null;
  const dims={solid:[460,430],plane:[460,430]};
  const sub=(a,b)=>a.map((v,j)=>v-b[j]);
  const dot=(a,b)=>a.reduce((s,v,j)=>s+v*b[j],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const length=v=>Math.hypot(...v),unit=v=>v.map(x=>x/length(v));
  const fmt=x=>x.toFixed(4)+' nm';
  const drawLine=(a,b,color,thick=1,dash='')=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" stroke-width="${thick}" ${dash?`stroke-dasharray="${dash}"`:''} stroke-linecap="round"/>`;
  function rowArrow(a,b,color,radius){
    const d=length(sub(b,a));if(d<2*radius+24)return '';
    const u=[(b[0]-a[0])/d,(b[1]-a[1])/d],inset=radius+5;
    const start=[a[0]+u[0]*inset,a[1]+u[1]*inset],end=[b[0]-u[0]*inset,b[1]-u[1]*inset];
    const head=(tip,sign)=>`<polygon points="${tip[0]},${tip[1]} ${tip[0]+sign*u[0]*11-u[1]*4.5},${tip[1]+sign*u[1]*11+u[0]*4.5} ${tip[0]+sign*u[0]*11+u[1]*4.5},${tip[1]+sign*u[1]*11-u[0]*4.5}" fill="${color}"/>`;
    return `<g pointer-events="none">${drawLine(start,end,'#fff',6)}${drawLine(start,end,color,2.8,'5 4')}${head(start,1)}${head(end,-1)}</g>`;
  }
  const fill=m=>`<defs><radialGradient id="metal" cx="32%" cy="25%" r="75%"><stop offset="0" stop-color="${m.light}"/><stop offset=".48" stop-color="${m.color}"/><stop offset="1" stop-color="${m.dark}"/></radialGradient></defs>`;
  function scaleFor(w,h){return Math.min(w,h)/.9;}
  function renderSolid(){
    const svg=$('atom-scene'),model=current,m=model.element,[width,height]=dims.solid,scale=scaleFor(width,height);
    const az=state.az,el=state.el,showPlane=$('plane-toggle').checked,showDirection=$('direction-toggle').checked;
    const center=model.center;
    const rotate=p=>{const x=p[0]*Math.cos(az)-p[1]*Math.sin(az),y=p[0]*Math.sin(az)+p[1]*Math.cos(az);return [x,p[2]*Math.cos(el)-y*Math.sin(el),y*Math.cos(el)+p[2]*Math.sin(el)];};
    const project=p=>{const q=rotate(sub(p,center));return [width/2+q[0]*scale,height/2-q[1]*scale,q[2]];};
    let behind='',inFront='';
    model.edges.forEach(([i,j])=>behind+=drawLine(project(model.vertices[i]),project(model.vertices[j]),'#afbea9',1));
    if(showPlane)behind+=`<polygon points="${model.polygon.map(p=>project(p).slice(0,2).join(',')).join(' ')}" fill="#cf8450" fill-opacity=".23" stroke="#b77749" stroke-width="2"/>`;
    const radius=model.nearest/2*state.size*scale;
    const atoms=model.atoms.map(p=>{
      const q=project(p),onPlane=model.onPlane(p);
      const emphasize=showPlane&&onPlane?'#c37742':m.dark;
      const opacity=showPlane&&!onPlane?.28:1;
      return {depth:q[2],markup:`<g opacity="${opacity}"><circle cx="${q[0]}" cy="${q[1]}" r="${radius}" fill="url(#metal)" stroke="${emphasize}" stroke-width="${showPlane&&onPlane?2.5:.8}"/></g>`};
    }).sort((a,b)=>a.depth-b.depth);
    if(showDirection)model.directions.forEach((direction,j)=>{inFront+=rowArrow(project(direction.points[0]),project(direction.points[1]),directionColors[j],radius);});
    // Small orientation triad. Distances in both panels use the same nm scale.
    const axes=m.structure==='HCP'?[[.5,Math.sqrt(3)/2,0],[.5,-Math.sqrt(3)/2,0],[-1,0,0],[0,0,1]]:[[1,0,0],[0,1,0],[0,0,1]],names=m.structure==='HCP'?['w','x','y','z']:['x','y','z'];
    axes.forEach((p,j)=>{const q=rotate(p),a=[42,height-38],b=[a[0]+q[0]*22,a[1]-q[1]*22];inFront+=drawLine(a,b,'#6d8074',1.2)+`<text x="${b[0]+q[0]*9}" y="${b[1]-q[1]*9}" text-anchor="middle" dominant-baseline="middle" style="font-size:11px">${names[j]}</text>`;});
    svg.innerHTML=`<title>${m.name}の通常の単位胞</title><desc>${m.plane}の面と面内の${model.directions.length}方向を立体の中で示す。</desc>${fill(m)}${behind}${atoms.map(a=>a.markup).join('')}${inFront}`;
    svg.setAttribute('aria-label',`${m.name} ${m.structure}の単位胞1個分、${m.plane}面と面内の${model.directions.length}方向`);
  }
  function renderPlane(){
    const svg=$('plane-scene'),model=current,m=model.element,[width,height]=dims.plane,scale=scaleFor(width,height);
    const [start,end]=model.directions[0].points,u=unit(sub(end,start)),v=unit(cross(model.normal,u));
    const center=model.polygon.reduce((sum,p)=>sum.map((x,j)=>x+p[j]),[0,0,0]).map(x=>x/model.polygon.length);
    const project=p=>{const q=sub(p,center);return [width/2+dot(q,u)*scale,height/2-dot(q,v)*scale];};
    const showPlane=$('plane-toggle').checked,showDirection=$('direction-toggle').checked,radius=model.nearest/2*state.size*scale;
    let markup=`<title>${m.name}の${m.plane}面を正面から見た原子配置</title><desc>通常の単位胞に含まれる面上の原子のみ表示。</desc>${fill(m)}`;
    if(showPlane)markup+=`<polygon points="${model.polygon.map(p=>project(p).join(',')).join(' ')}" fill="#cf8450" fill-opacity=".14" stroke="#bb7442" stroke-width="1.8"/>`;
    for(const p of model.atoms.filter(model.onPlane)){
      const q=project(p),stroke=showPlane?'#c37742':m.dark;
      markup+=`<circle cx="${q[0]}" cy="${q[1]}" r="${radius}" fill="url(#metal)" stroke="${stroke}" stroke-width="2"/>`;
    }
    if(showDirection)model.directions.forEach((direction,j)=>{markup+=rowArrow(project(direction.points[0]),project(direction.points[1]),directionColors[j],radius);});
    const bar=.2*scale,y=height-27,x=width-20;
    markup+=`<path d="M ${x-bar} ${y-5} v 10 M ${x-bar} ${y} H ${x} M ${x} ${y-5} v 10" fill="none" stroke="#48654f" stroke-width="1.5"/><text x="${x-bar/2}" y="${y-12}" text-anchor="middle" style="font-size:11px">0.2 nm</text>`;
    svg.innerHTML=markup;
    svg.setAttribute('aria-label',`${m.name} ${m.plane}面上の${model.atoms.filter(model.onPlane).length}個の原子。面内の${model.directions.length}方向を表示。`);
  }
  function draw(){renderSolid();renderPlane();}
  function update(){
    current=M.model(state.symbol);const m=current.element;
    document.querySelectorAll('[data-element]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.element===state.symbol));
    $('material-name').textContent=m.name+' / '+m.phase;
    $('structure-name').textContent=m.structure+' · '+m.structureName;
    $('lattice-a').textContent=fmt(m.a);$('lattice-c').textContent=m.c?fmt(m.c):'';$('c-measure').hidden=!m.c;
    $('nearest').textContent=fmt(current.nearest);$('row-distance').textContent=fmt(current.rowDistance);
    $('plane-kind').textContent=m.planeName;$('plane-index').textContent=m.plane;
    $('plane-family').textContent=m.planeFamily+' の一例';
    $('direction-list').innerHTML=current.directions.map((direction,j)=>`<span class="direction-chip"><i style="background:${directionColors[j]}"></i>${direction.index}</span>`).join('');
    $('direction-family').textContent=m.directionFamily+` · ${current.directions.length}方向（逆向きは同じ原子列）`;
    $('packing-note').textContent=m.structure==='BCC'?'BCC に厳密な最密面はありません。ここでは原子の面密度が最大になる (110) 面と、その面内の2つの ⟨111⟩ 原子列を示しています。':m.structure==='FCC'?'(111) 最密面の三角形の網目には、3つの異なる ⟨110⟩ 原子列があります。':'(0001) 底面の三角形の網目には、3つの異なる ⟨112̄0⟩ 原子列があります。層は ABAB… と重なります。';
    $('open-index').hidden=m.structure!=='HCP';
    if(m.c)$('open-index').href='index.html?mode=plane&h=0&k=0&l=1';
    $('atom-view-title').textContent=m.phase+' · '+m.structure;
    $('size-value').textContent=Math.round(state.size*100)+'%';
    const planeCount=current.atoms.filter(current.onPlane).length;
    $('atom-detail').innerHTML=`<div>${m.planeName} <strong>${m.plane}</strong> の原子をオレンジで示しています。色付きの両矢印は、面内にある ${current.directions.length} 本の最密な原子列の向きです。単位胞内では面上に ${planeCount} 個の原子があります。</div><span class="row-spacing">各原子列で隣り合う中心間距離：${fmt(current.rowDistance)}</span><div class="detail-note">${m.structure==='HCP'?'Mg の層間最近接距離は底面内の間隔よりわずかに短いため、左の2つの距離は異なります。':'立体と平面に同じ原子層を表示しています。'} ${m.structure==='HCP'?'通常の六角柱単位胞（原子6個分）です。':'通常の立方単位胞1個分です。'}</div>`;
    draw();
  }
  document.querySelectorAll('[data-element]').forEach(b=>b.addEventListener('click',()=>{state.symbol=b.dataset.element;update();}));
  ['plane-toggle','direction-toggle'].forEach(id=>$(id).addEventListener('change',draw));
  $('atom-size').addEventListener('input',()=>{state.size=Number($('atom-size').value)/100;update();});
  $('atoms-reset').addEventListener('click',()=>{state.az=.65;state.el=.42;draw();});
  const svg=$('atom-scene');
  svg.addEventListener('pointerdown',e=>{if(e.button!==0||pointer)return;e.preventDefault();pointer={id:e.pointerId,x:e.clientX,y:e.clientY};svg.setPointerCapture(e.pointerId);});
  svg.addEventListener('pointermove',e=>{if(pointer?.id!==e.pointerId)return;state.az-=(e.clientX-pointer.x)*.008;state.el=Math.max(-Math.PI/2,Math.min(Math.PI/2,state.el+(e.clientY-pointer.y)*.008));pointer.x=e.clientX;pointer.y=e.clientY;renderSolid();});
  const release=e=>{if(pointer?.id===e.pointerId)pointer=null;};
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>svg.addEventListener(type,release));
  svg.addEventListener('dragstart',e=>e.preventDefault());
  [['atom-scene','solid'],['plane-scene','plane']].forEach(([id,key])=>new ResizeObserver(entries=>{const rect=entries[0].contentRect;dims[key]=[Math.max(1,rect.width),Math.max(1,rect.height)];$(id).setAttribute('viewBox',`0 0 ${dims[key][0]} ${dims[key][1]}`);draw();}).observe($(id).parentElement));
  update();
})();

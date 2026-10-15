(() => {
  'use strict';
  const G=window.HexGeometry, $=id=>document.getElementById(id);
  const state={mode:'plane',direction:[2,-1,0],plane:[1,0,0],ratio:Math.sqrt(8/3),az:Math.PI/3,el:.38};
  const query=new URLSearchParams(location.search);
  if(query.get('mode')==='plane'){
    state.mode='plane';
    state.plane=['h','k','l'].map(key=>Math.max(-2,Math.min(2,Math.round(Number(query.get(key))||0))));
  }
  const colors=['#7e8f66','#699789','#9d8e73','#6c839e'];
  const directionColor='#a0205b';
  const bars=n=>n<0?`<span class="bar">${Math.abs(n)}</span>`:String(n);
  const fmt=n=>Math.abs(n)<.0005?'0':Number(n.toFixed(3)).toString();
  const labels=()=>state.mode==='direction'?['w','x','y','z']:['h','k','i','l'];
  const values=()=>G.indices(...state[state.mode]);
  const notation=(v,mode=state.mode)=>`${mode==='direction'?'[':'('}${v.map(n=>`<span class="index-number">${bars(n)}</span>`).join(' ')}${mode==='direction'?']':')'}`;
  const presets={direction:[{name:'w 方向',v:[2,-1,0]},{name:'z 軸',v:[0,0,1]},{name:'底面内',v:[1,1,0]},{name:'斜め',v:[1,0,1]}],plane:[{name:'底面',v:[0,0,1]},{name:'柱面',v:[1,0,0]},{name:'錐面',v:[1,0,1]},{name:'第2柱面',v:[1,1,0]}]};
  function createControls(){
    const symbols=labels();
    const descriptions=['w 軸','x 軸','y 軸','縦軸'];
    $('inputs').innerHTML=symbols.map((s,j)=>j===2?`<div class="index-row auto"><div class="index-label"><span class="symbol">${s}</span><span class="axis-sub">${descriptions[j]}</span></div><div><span class="auto-tag">自動</span><output id="value-2" aria-label="${s} 自動計算"></output></div></div>`:`<div class="index-row"><div class="index-label"><span class="symbol">${s}</span><span class="axis-sub">${descriptions[j]}</span></div><div class="stepper"><button data-index="${j===3?2:j}" data-step="-1" aria-label="${s} を1減らす">−</button><output id="value-${j}" aria-label="${s}"></output><button data-index="${j===3?2:j}" data-step="1" aria-label="${s} を1増やす">＋</button></div></div>`).join('');
    $('presets').innerHTML=presets[state.mode].map((p,j)=>`<button data-preset="${j}"><span>${p.name}</span><span class="preset-index">${notation(G.indices(...p.v))}</span></button>`).join('');
    $('direction-mode').setAttribute('aria-pressed',state.mode==='direction');
    $('plane-mode').setAttribute('aria-pressed',state.mode==='plane');
  }
  function update(){
    const v=values(),p=state[state.mode],isDir=state.mode==='direction';
    $('notation').innerHTML=notation(v);
    $('notation').setAttribute('aria-label',`${isDir?'方向':'面'} ${v.join(', ')}`);
    $('constraint').textContent=isDir?'y = −(w + x)':'i = −(h + k)';
    v.forEach((n,j)=>{$('value-'+j).innerHTML=bars(n);$('value-'+j).setAttribute('aria-label',`${labels()[j]} = ${n}`);});
    document.querySelectorAll('[data-step]').forEach(b=>{b.disabled=p[Number(b.dataset.index)]+Number(b.dataset.step)>2||p[Number(b.dataset.index)]+Number(b.dataset.step)<-2;});
    $('ratio-value').textContent=state.ratio.toFixed(3);
    $('view-title').textContent=isDir?'結晶方向':'結晶面';
    $('object-legend').innerHTML=isDir?`<b class="dot vector-dot" style="background:${directionColor}"></b>方向と終点の原子（長さは正規化）`:'<b class="dot plane-dot"></b>面（表示範囲で切り取り）';
    $('extent-note').textContent=isDir?'O は六角柱の底面中央。終点の球は原子の模式図です。結晶全体の原子配置は表していません。':'O は六角柱の底面中央。枠の半径は a、高さは 0〜c。原子配置は表していません。';
    const vec=isDir?G.direction(...p,state.ratio):G.normal(...p,state.ratio),empty=G.length(vec)<1e-9;
    $('empty-state').hidden=!empty;
    $('empty-state').textContent=`全指数が0のため、${isDir?'方向':'面'}は定義されません。`;
    $('detail-title').textContent=isDir?'軸ベクトルの和':'各軸との切片';
    if(empty)$('detail-content').innerHTML='<div class="formula">未定義</div><div class="detail-note">いずれかの指数を変えると表示されます。</div>';
    else if(isDir){
      $('detail-content').innerHTML=`<div class="formula">r = (${v[0]}) w + (${v[1]}) x + (${v[2]}) y + (${v[3]}) z</div><div class="detail-note">直交座標 r / a = (${vec.map(fmt).join(', ')})。矢印の長さは表示用にそろえています。</div>`;
    }else{
      const layer=G.section(vec,state.ratio).level||1;
      $('detail-content').innerHTML=`<div class="formula">切片：w / h · x / k · y / i · z / l</div><div class="intercepts">${v.map((n,j)=>`<span>${['w','x','y','z'][j]}：${n===0?'∞（平行）':(n<0?'−':'')+(Math.abs(n)===1?'1':'1/'+Math.abs(n))}</span>`).join('')}</div><div class="detail-note">切片の値は各軸の単位ベクトルに対する倍率です。${layer===1?'指定切片の面':'表示範囲内の平行な面'}を表示しています。</div>`;
    }
    $('scene').setAttribute('aria-label',`${isDir?'方向':'面'} ${v.join(', ')} の3D表示。${isDir&&!empty?'矢印の終点に原子の模式図。':''}${empty?'全指数0で未定義。':''}ドラッグで回転、視点ボタンで上面や正面に切り替え。`);
    draw();
  }
  let width=800,height=600;
  function draw(){
    const svg=$('scene'),a=state.az,e=state.el,r=state.ratio;
    const viewScale=Math.min(width/2.75,height/(Math.sqrt(1+r*r)+.35));
    const project=p=>{
      const horizontal=p[0]*Math.cos(a)-p[1]*Math.sin(a),d=p[0]*Math.sin(a)+p[1]*Math.cos(a);
      return [width/2+horizontal*viewScale,height/2-((p[2]-r/2)*Math.cos(e)-d*Math.sin(e))*viewScale,d*Math.cos(e)+(p[2]-r/2)*Math.sin(e)];
    };
    const objects=[],labelsOut=[];
    let directionOverlay='';
    const add=(points,html,bias=0)=>objects.push({depth:points.reduce((sum,p)=>sum+project(p)[2],0)/points.length+bias,html});
    const path=points=>points.map(p=>project(p).slice(0,2).map(n=>n.toFixed(2)).join(',')).join(' ');
    const text=(p,t,color='#3f574a',dx=0,dy=0)=>{const q=project(p);labelsOut.push(`<text x="${q[0]+dx}" y="${q[1]+dy}" fill="${color}" text-anchor="middle" dominant-baseline="middle" style="fill:${color};font-size:14px">${t}</text>`);};
    function line(p,q,color,stroke=1,dash='',bias=0){const A=project(p),B=project(q);add([p,q],`<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="${color}" stroke-width="${stroke}" ${dash?`stroke-dasharray="${dash}"`:''} stroke-linecap="round"/>`,bias);}
    function dot(p,color,size=4){const A=project(p);add([p],`<circle cx="${A[0]}" cy="${A[1]}" r="${size}" fill="${color}" stroke="#f4f6ef" stroke-width="1.5"/>`,.03);}
    function arrow(p,q,color,stroke=3,dash=''){
      line(p,q,color,stroke,dash,.05);
      const A=project(p),B=project(q),d=Math.hypot(B[0]-A[0],B[1]-A[1]);
      if(d<8){dot(q,color,5);return;}
      const u=[(B[0]-A[0])/d,(B[1]-A[1])/d],head=Math.min(13,d*.4),side=head*.43;
      add([q],`<polygon points="${B[0]},${B[1]} ${B[0]-u[0]*head-u[1]*side},${B[1]-u[1]*head+u[0]*side} ${B[0]-u[0]*head+u[1]*side},${B[1]-u[1]*head-u[0]*side}" fill="${color}"/>`,.06);
    }
    const {vertices,edges}=G.prism(r);
    // The bottom hexagon is z=0, with the origin at its center.
    edges.forEach(([i,j])=>line(vertices[i],vertices[j],'#bfccb8',1.1));
    const axes=G.basis(r),origin=[0,0,0];
    axes.forEach((axis,j)=>{
      line(G.scale(axis,-1.15),origin,colors[j],1.1,'3 5');
      arrow(origin,G.scale(axis,1.18),colors[j],1.5);
      dot(axis,colors[j],2.7);
      text(G.scale(axis,1.31),['w','x','y','z'][j],colors[j],0,j===3?-6:0);
    });
    const p=state[state.mode];
    if(state.mode==='direction'){
      const vec=G.direction(...p,r);
      if(G.length(vec)>1e-9){
        const tip=G.scale(G.unit(vec),1.16);
        const A=project(origin),B=project(tip),projectedLength=Math.hypot(B[0]-A[0],B[1]-A[1]);
        let shaft='';
        if(projectedLength>30){
          const ux=(B[0]-A[0])/projectedLength,uy=(B[1]-A[1])/projectedLength;
          const end=[B[0]-ux*16,B[1]-uy*16],head=12,side=6;
          shaft=`<line x1="${A[0]}" y1="${A[1]}" x2="${end[0]}" y2="${end[1]}" stroke="#fff" stroke-width="8" stroke-linecap="round"/><line x1="${A[0]}" y1="${A[1]}" x2="${end[0]}" y2="${end[1]}" stroke="${directionColor}" stroke-width="4.5" stroke-linecap="round"/><polygon points="${end[0]},${end[1]} ${end[0]-ux*head-uy*side},${end[1]-uy*head+ux*side} ${end[0]-ux*head+uy*side},${end[1]-uy*head-ux*side}" fill="${directionColor}"/>`;
        }
        directionOverlay=`<g pointer-events="none">${shaft}<circle cx="${B[0]}" cy="${B[1]}" r="14" fill="#fff" stroke="${directionColor}" stroke-width="1.6"/><circle cx="${B[0]}" cy="${B[1]}" r="11.5" fill="url(#direction-atom)" stroke="#762246" stroke-width="1.2"/></g>`;
        // Offset the vector label from the endpoint atom and axis labels.
        text(tip,'r',directionColor,22,19);
      }
    }else{
      const n=G.normal(...p,r),poly=G.section(n,r);
      if(poly.length){
        add(poly,`<polygon points="${path(poly)}" fill="#d48750" fill-opacity=".27" stroke="#bf7545" stroke-width="2" stroke-linejoin="round"/>`);
        const v=values();axes.forEach((axis,j)=>{if(v[j]){const point=G.scale(axis,poly.level/v[j]);if(point[2]>=-1e-9&&point[2]<=r+1e-9&&Math.hypot(point[0],point[1])<=1+1e-9)dot(point,'#b66837',4.5);}});
      }
    }
    dot(origin,'#425b4a',3.5);text(origin,'O','#61745f',-13,14);
    objects.sort((a,b)=>a.depth-b.depth);
    svg.innerHTML='<title>六方晶の指数と幾何</title><desc>底面の3軸は互いに120度。z軸は底面に垂直です。</desc><defs><radialGradient id="direction-atom" cx="30%" cy="25%" r="72%"><stop offset="0" stop-color="#fff2f8"/><stop offset=".42" stop-color="#d879a8"/><stop offset="1" stop-color="#7a214b"/></radialGradient></defs>'+objects.map(o=>o.html).join('')+directionOverlay+labelsOut.join('');
  }
  $('inputs').addEventListener('click',event=>{const b=event.target.closest('[data-step]');if(!b)return;const j=Number(b.dataset.index);state[state.mode][j]=Math.max(-2,Math.min(2,state[state.mode][j]+Number(b.dataset.step)));update();});
  $('presets').addEventListener('click',event=>{const b=event.target.closest('[data-preset]');if(!b)return;state[state.mode]=[...presets[state.mode][Number(b.dataset.preset)].v];update();});
  ['direction','plane'].forEach(mode=>$(mode+'-mode').addEventListener('click',()=>{state.mode=mode;createControls();update();}));
  function setView(view){
    if(view==='top'){state.az=0;state.el=Math.PI/2;}
    else if(view==='front'){const n=state.mode==='plane'?G.normal(...state.plane,state.ratio):[0,1,0];state.az=Math.atan2(n[0],n[1]);state.el=Math.asin(n[2]/G.length(n));}
    else {state.az=Math.PI/3;state.el=.38;}
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===view));draw();
  }
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  $('reset-view').addEventListener('click',()=>setView('iso'));
  const svg=$('scene');let pointer=null;
  svg.addEventListener('pointerdown',event=>{if(event.button!==0||pointer)return;event.preventDefault();pointer={id:event.pointerId,x:event.clientX,y:event.clientY};svg.setPointerCapture(event.pointerId);});
  svg.addEventListener('pointermove',event=>{if(!pointer||pointer.id!==event.pointerId)return;state.az-=(event.clientX-pointer.x)*.008;state.el=Math.max(-Math.PI/2,Math.min(Math.PI/2,state.el+(event.clientY-pointer.y)*.008));pointer.x=event.clientX;pointer.y=event.clientY;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));draw();});
  const release=event=>{if(pointer?.id===event.pointerId)pointer=null;};
  svg.addEventListener('pointerup',release);svg.addEventListener('pointercancel',release);svg.addEventListener('lostpointercapture',release);
  svg.addEventListener('dragstart',event=>event.preventDefault());
  new ResizeObserver(entries=>{const box=entries[0].contentRect;width=Math.max(1,box.width);height=Math.max(1,box.height);svg.setAttribute('viewBox',`0 0 ${width} ${height}`);draw();}).observe($('scene-wrap'));
  createControls();update();
})();

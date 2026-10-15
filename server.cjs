'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'dist');
const allowed=new Map([['/','index.html'],...['index.html','style.css','app.js','geometry.js','atoms.html','atoms.css','atoms.js','materials.js'].map(name=>['/'+name,name])]);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const port=Number(process.env.PORT||4173);
const server=http.createServer((req,res)=>{
  const route=new URL(req.url,'http://localhost').pathname;
  const file=allowed.get(route);
  if(!file){res.writeHead(404);res.end('Not found');return;}
  fs.readFile(path.join(root,file),(err,data)=>{
    if(err){res.writeHead(500);res.end('Unable to read file');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);
  });
});
server.on('error',err=>{console.error(err.code==='EADDRINUSE'?`Port ${port} is already in use. Set PORT to another value.`:err.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));

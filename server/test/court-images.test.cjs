const {test}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {createHash}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {openDatabase}=require('../database.cjs');
const {createApp}=require('../index.cjs');
const {hashPassword}=require('../auth.cjs');
const {courtImages}=require('../court-images.cjs');
const {tables}=require('../migrate-sqlite.cjs');

const password='Only-for-tests-RTL-1234';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=','base64');
const jpeg=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(32,1)]);
const dataUrl=(mime,bytes)=>`data:image/${mime};base64,${bytes.toString('base64')}`;
const photo=dataUrl('png',png);
const version=bytes=>createHash('sha256').update(bytes).digest('hex').slice(0,32);
const address=(id,bytes)=>`api/courts/${id}/image?v=${version(bytes)}`;
const own='padel-3-court-1',sibling='padel-3-court-2',foreign='padel-1-court-1';

async function fixture(t){
  const db=openDatabase(':memory:'),hash=await hashPassword(password);
  db.prepare('INSERT INTO platform_admins VALUES(?,?,?)').run('rtl','rtl@example.test',hash);
  for(const [id,email,complex]of [['one','one@example.test','padel-3'],['two','two@example.test','padel-1']])db.prepare('INSERT INTO admins(id,email,password_hash,complex_id) VALUES(?,?,?,?)').run(id,email,hash,complex);
  const {server}=createApp({db});server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));db.close();});
  const base=`http://127.0.0.1:${server.address().port}`;
  function client(){
    const jar=new Map();
    return async(path,method='GET',data)=>{
      const response=await fetch(`${base}/api${path}`,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')},body:data?JSON.stringify(data):undefined});
      for(const header of response.headers.getSetCookie()){const [entry]=header.split(';'),i=entry.indexOf('=');jar.set(entry.slice(0,i),entry.slice(i+1));}
      const raw=await response.text();let body;try{body=JSON.parse(raw);}catch{body=raw;}
      return {status:response.status,body,raw};
    };
  }
  const club=async(email='one@example.test')=>{const c=client();assert.equal((await c('/auth/login','POST',{email,password})).status,200);return c;};
  const catalog=()=>client()('/catalog');
  const listed=async id=>(await catalog()).body.courts.find(c=>c.id===id);
  const stored=id=>JSON.parse(db.prepare('SELECT data FROM courts WHERE id=?').get(id).data);
  const setStored=(id,image)=>db.prepare('UPDATE courts SET data=? WHERE id=?').run(JSON.stringify({...stored(id),image}),id);
  const files=()=>db.prepare('SELECT court_id,complex_id,mime,version FROM court_images ORDER BY court_id').all().map(row=>({...row}));
  const save=async(admin,id,image)=>admin(`/admin/courts/${id}`,'PUT',{...await listed(id),image});
  return {db,base,client,club,catalog,listed,stored,setStored,files,save};
}

test('an uploaded court photo is stored apart and the catalog only carries its address',async t=>{
  const {base,club,catalog,listed,stored,files,save}=await fixture(t),admin=await club();
  const saved=await save(admin,own,photo);
  assert.equal(saved.status,200);
  assert.equal(saved.body.image,address(own,png));
  assert.equal(stored(own).image,address(own,png));
  assert.equal((await listed(own)).image,address(own,png));
  assert.doesNotMatch((await catalog()).raw,/base64/);
  assert.deepEqual(files(),[{court_id:own,complex_id:'padel-3',mime:'image/png',version:version(png)}]);
  const file=await fetch(`${base}/${saved.body.image}`);
  assert.equal(file.status,200);
  assert.equal(file.headers.get('content-type'),'image/png');
  assert.equal(file.headers.get('x-content-type-options'),'nosniff');
  assert.match(file.headers.get('cache-control'),/public.*immutable/);
  assert.equal(file.headers.get('set-cookie'),null);
  assert.deepEqual(Buffer.from(await file.arrayBuffer()),png);
});

test('a new court with an uploaded photo gets its own file',async t=>{
  const {base,club,listed,files}=await fixture(t),admin=await club();
  const created=await admin('/admin/courts','POST',{...await listed(own),name:'Cancha nueva',image:dataUrl('jpeg',jpeg)});
  assert.equal(created.status,201);
  assert.equal(created.body.image,address(created.body.id,jpeg));
  assert.deepEqual(files().map(f=>f.court_id),[created.body.id]);
  assert.equal((await fetch(`${base}/${created.body.image}`)).headers.get('content-type'),'image/jpeg');
});

test('a new court started from a sibling keeps that photo in a file of its own',async t=>{
  const {base,club,listed,save,files}=await fixture(t),admin=await club();
  const source=(await save(admin,own,photo)).body;
  const created=await admin('/admin/courts','POST',{...source,name:'Cancha copiada'});
  assert.equal(created.status,201);
  assert.equal(created.body.image,address(created.body.id,png));
  assert.equal(files().length,2);
  await save(admin,own,dataUrl('jpeg',jpeg));
  const copy=await fetch(`${base}/${(await listed(created.body.id)).image}`);
  assert.deepEqual(Buffer.from(await copy.arrayBuffer()),png);
});

test('saving a court with its current address keeps the photo',async t=>{
  const {club,listed,stored,files,save}=await fixture(t),admin=await club();
  await save(admin,own,photo);
  const before=files();
  const court=await listed(own);
  const toggled=await admin(`/admin/courts/${own}`,'PUT',{...court,enabled:false});
  assert.equal(toggled.status,200);
  assert.equal(toggled.body.enabled,false);
  assert.equal(stored(own).image,address(own,png));
  assert.deepEqual(files(),before);
});

test('a replaced photo gets a new address and the old one is not cached as current',async t=>{
  const {base,club,save}=await fixture(t),admin=await club();
  const first=(await save(admin,own,photo)).body.image;
  const second=(await save(admin,own,dataUrl('jpeg',jpeg))).body.image;
  assert.notEqual(second,first);
  const stale=await fetch(`${base}/${first}`);
  assert.equal(stale.headers.get('cache-control'),'no-store');
  assert.equal(stale.headers.get('content-type'),'image/jpeg');
});

test('going back to a bundled image removes the uploaded file',async t=>{
  const {base,club,stored,files,save}=await fixture(t),admin=await club();
  const uploaded=(await save(admin,own,photo)).body.image;
  assert.equal((await save(admin,own,'assets/soccer.png')).status,200);
  assert.equal(stored(own).image,'assets/soccer.png');
  assert.deepEqual(files(),[]);
  assert.equal((await fetch(`${base}/${uploaded}`)).status,404);
});

test('photos saved inside the court keep working and never reach the catalog',async t=>{
  const {base,club,catalog,listed,stored,setStored,files,save}=await fixture(t);
  setStored(own,photo);
  assert.doesNotMatch((await catalog()).raw,/base64/);
  assert.equal((await listed(own)).image,address(own,png));
  assert.deepEqual(files(),[]);
  assert.equal(stored(own).image,photo);
  const file=await fetch(`${base}/${address(own,png)}`);
  assert.equal(file.headers.get('content-type'),'image/png');
  assert.match(file.headers.get('cache-control'),/immutable/);
  assert.deepEqual(Buffer.from(await file.arrayBuffer()),png);
  const admin=await club(),saved=await save(admin,own,address(own,png));
  assert.equal(saved.status,200);
  assert.equal(saved.body.image,address(own,png));
  assert.equal(stored(own).image,address(own,png));
  assert.equal(files().length,1);
});

test('a legacy photo larger than the upload limit is still served',async t=>{
  const {base,listed,setStored}=await fixture(t),large=Buffer.concat([jpeg,Buffer.alloc(1024*1024+10,2)]);
  setStored(own,dataUrl('jpeg',large));
  const file=await fetch(`${base}/${(await listed(own)).image}`);
  assert.equal(file.status,200);
  assert.deepEqual(Buffer.from(await file.arrayBuffer()),large);
});

test('an unreadable legacy photo falls back to a bundled image',async t=>{
  const {base,club,catalog,listed,stored,setStored,save}=await fixture(t);
  setStored(own,'data:image/png;base64,AAAA');
  assert.doesNotMatch((await catalog()).raw,/base64/);
  const shown=(await listed(own)).image;
  assert.equal(shown,'assets/padel-v1.webp');
  assert.equal((await fetch(`${base}/api/courts/${own}/image?v=abc`)).status,404);
  assert.equal((await save(await club(),own,shown)).status,200);
  assert.equal(stored(own).image,'assets/padel-v1.webp');
});

test('photos are only served for courts that have one',async t=>{
  const {base}=await fixture(t);
  assert.equal((await fetch(`${base}/api/courts/${own}/image?v=abc`)).status,404);
  assert.equal((await fetch(`${base}/api/courts/missing/image?v=abc`)).status,404);
});

test('a club admin cannot change or borrow photos from another complex',async t=>{
  const {club,listed,stored,files,save}=await fixture(t),admin=await club(),rival=await club('two@example.test');
  const rivalPhoto=(await save(rival,foreign,photo)).body.image,before=stored(foreign);
  assert.equal((await admin(`/admin/courts/${foreign}`,'PUT',{...await listed(foreign),image:dataUrl('jpeg',jpeg)})).status,404);
  assert.deepEqual(stored(foreign),before);
  assert.equal((await save(admin,own,rivalPhoto)).status,400);
  assert.equal((await admin('/admin/courts','POST',{...await listed(own),name:'Cancha ajena',image:rivalPhoto})).status,400);
  assert.equal((await admin('/admin/courts','POST',{...await listed(own),name:'Cancha ajena 2',image:dataUrl('jpeg',jpeg),complexId:'padel-1'})).body.complexId,'padel-3');
  assert.deepEqual(files().filter(f=>f.complex_id==='padel-1').map(f=>f.version),[version(png)]);
});

test('a court cannot point at the photo of another court or complex',async t=>{
  const {club,stored,save,client}=await fixture(t),admin=await club();
  const siblingPhoto=(await save(admin,sibling,photo)).body.image,before=stored(own).image;
  const complexPhoto=(await admin('/admin/complex/image','PUT',{image:photo})).body.image;
  for(const image of [siblingPhoto,complexPhoto])assert.equal((await save(admin,own,image)).status,400,image);
  assert.equal(stored(own).image,before);
  assert.equal((await save(client(),own,photo)).status,401);
});

test('the server rejects anything that is not a real PNG, JPEG or WebP within the size limit',async t=>{
  const {club,stored,files,save}=await fixture(t),admin=await club(),before=stored(own).image;
  const invalid={
    missing:undefined,
    number:12,
    remote:'https://example.test/photo.png',
    traversal:'api/courts/../../x/image?v=0123456789abcdef0123456789abcdef',
    svg:dataUrl('svg+xml',Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')),
    notBase64:'data:image/png;base64,@@@@',
    empty:'data:image/png;base64,',
    wrongType:dataUrl('png',jpeg),
    notAnImage:dataUrl('jpeg',Buffer.from('<script>alert(1)</script>')),
    tooLarge:dataUrl('jpeg',Buffer.concat([jpeg,Buffer.alloc(1024*1024)]))
  };
  for(const [name,image]of Object.entries(invalid))assert.equal((await save(admin,own,image)).status,400,name);
  assert.equal(stored(own).image,before);
  assert.deepEqual(files(),[]);
});

test('each complex has a limit of photo uploads per hour that plain edits do not use',async t=>{
  const {club,listed,save}=await fixture(t),admin=await club();
  for(let i=0;i<120;i++)assert.equal((await save(admin,own,photo)).status,200);
  assert.equal((await save(admin,own,photo)).status,429);
  assert.equal((await save(admin,own,(await listed(own)).image)).status,200);
});

test('a save based on an outdated court changes nothing',async t=>{
  const {db,stored,files}=await fixture(t),current=stored(own);
  const photos=courtImages({db,limit(){},fail(status,message){throw Object.assign(new Error(message),{status});}});
  await assert.rejects(photos.update({...current,name:'Otra'},'{"outdated":true}',photo),{status:409});
  assert.deepEqual(stored(own),current);
  assert.deepEqual(files(),[]);
});

test('the conversion previews by default and then moves legacy photos without changing their address',async t=>{
  const {db,base,listed,stored,setStored,files}=await fixture(t);
  setStored(own,photo);setStored(foreign,dataUrl('jpeg',jpeg));setStored(sibling,'data:image/png;base64,AAAA');
  const shown=(await listed(own)).image,photos=courtImages({db}),total=db.prepare('SELECT COUNT(*) AS n FROM courts').get().n;
  const audits=()=>db.prepare('SELECT COUNT(*) AS n FROM audit_log').get().n;
  assert.deepEqual(await photos.convertLegacy(),{total,legacy:3,convertible:2,converted:0,conflicts:0,invalid:[sibling]});
  assert.equal(stored(own).image,photo);
  assert.deepEqual(files(),[]);
  assert.deepEqual(await photos.convertLegacy({apply:true}),{total,legacy:3,convertible:2,converted:2,conflicts:0,invalid:[sibling]});
  assert.equal(stored(own).image,shown);
  assert.equal(stored(foreign).image,address(foreign,jpeg));
  assert.equal(stored(sibling).image,'data:image/png;base64,AAAA');
  assert.deepEqual(files().map(f=>f.complex_id).sort(),['padel-1','padel-3']);
  assert.deepEqual(Buffer.from(await (await fetch(`${base}/${shown}`)).arrayBuffer()),png);
  const audited=audits();
  assert.deepEqual(await photos.convertLegacy({apply:true}),{total,legacy:1,convertible:0,converted:0,conflicts:0,invalid:[sibling]});
  assert.equal(audits(),audited);
});

test('the conversion leaves alone a court edited after it was read',async t=>{
  const {db,stored,setStored,files}=await fixture(t);
  setStored(own,photo);
  let edited=false;
  const racing={exec:sql=>db.exec(sql),prepare(sql){
    if(!edited&&sql.startsWith('UPDATE courts')){edited=true;setStored(own,'assets/soccer.png');}
    return db.prepare(sql);
  }};
  const report=await courtImages({db:racing}).convertLegacy({apply:true});
  assert.equal(report.converted,0);
  assert.equal(report.conflicts,1);
  assert.equal(stored(own).image,'assets/soccer.png');
  assert.deepEqual(files(),[]);
});

test('both database schemas and the SQLite import know about court photos',()=>{
  assert.match(readFileSync(resolve(__dirname,'../postgres.sql'),'utf8'),/CREATE TABLE IF NOT EXISTS court_images\(.*FOREIGN KEY\(court_id,complex_id\) REFERENCES courts\(id,complex_id\)/);
  assert.ok(tables.indexOf('court_images')>tables.indexOf('courts'));
});

test('the frontend accepts court photo addresses produced by the server',async()=>{
  const {imageSource}=await import('../../client/src/shared/api.js');
  const stored=address(own,png);
  assert.equal(imageSource(stored),`/${stored}`);
  for(const unsafe of ['api/courts/../../x/image?v=abc',`api/courts/a/image?v=${version(png)}&x=1`,'api/courts/a/image?v=abc'])assert.equal(imageSource(unsafe),'/assets/padel-v1.webp',unsafe);
});

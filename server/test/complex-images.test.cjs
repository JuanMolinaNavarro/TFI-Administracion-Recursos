const {test}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {openDatabase}=require('../database.cjs');
const {createApp}=require('../index.cjs');
const {hashPassword}=require('../auth.cjs');

const password='Only-for-tests-RTL-1234';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=','base64');
const jpeg=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(32,1)]);
const webp=Buffer.concat([Buffer.from('RIFF'),Buffer.alloc(4,1),Buffer.from('WEBP'),Buffer.alloc(32,1)]);
const dataUrl=(mime,bytes)=>`data:image/${mime};base64,${bytes.toString('base64')}`;
const photo=dataUrl('png',png);

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
      return {status:response.status,body,headers:response.headers};
    };
  }
  const club=async(email='one@example.test')=>{const c=client();assert.equal((await c('/auth/login','POST',{email,password})).status,200);return c;};
  const platform=async()=>{const c=client();assert.equal((await c('/superadmin/auth/login','POST',{email:'rtl@example.test',password})).status,200);return c;};
  const listed=async id=>(await client()('/catalog')).body.complexes.find(c=>c.id===id);
  return {db,base,client,club,platform,listed};
}

test('a club admin replaces its own catalog image and the public catalog serves the new file',async t=>{
  const {base,club,listed}=await fixture(t),admin=await club(),otherBefore=await listed('padel-1');
  const saved=await admin('/admin/complex/image','PUT',{image:photo});
  assert.equal(saved.status,200);
  assert.match(saved.body.image,/^api\/complexes\/padel-3\/image\?v=[a-f0-9]{32}$/);
  assert.equal((await listed('padel-3')).image,saved.body.image);
  assert.deepEqual(await listed('padel-1'),otherBefore);
  const file=await fetch(`${base}/${saved.body.image}`);
  assert.equal(file.status,200);
  assert.equal(file.headers.get('content-type'),'image/png');
  assert.equal(file.headers.get('x-content-type-options'),'nosniff');
  assert.match(file.headers.get('cache-control'),/public.*immutable/);
  assert.equal(file.headers.get('set-cookie'),null);
  assert.deepEqual(Buffer.from(await file.arrayBuffer()),png);
});

test('a replaced image gets a new address and its old address is not cached as current',async t=>{
  const {base,club}=await fixture(t),admin=await club();
  const first=(await admin('/admin/complex/image','PUT',{image:photo})).body.image;
  const second=(await admin('/admin/complex/image','PUT',{image:dataUrl('jpeg',jpeg)})).body.image;
  assert.notEqual(second,first);
  const stale=await fetch(`${base}/${first}`);
  assert.equal(stale.headers.get('cache-control'),'no-store');
  assert.equal(stale.headers.get('content-type'),'image/jpeg');
});

test('images are only served for complexes that uploaded one',async t=>{
  const {base}=await fixture(t);
  assert.equal((await fetch(`${base}/api/complexes/padel-3/image?v=abc`)).status,404);
  assert.equal((await fetch(`${base}/api/complexes/missing/image?v=abc`)).status,404);
});

test('a club admin cannot change another complex',async t=>{
  const {club,listed}=await fixture(t),admin=await club(),own=await listed('padel-3'),other=await listed('padel-1');
  assert.equal((await admin('/admin/complex/image','PUT',{image:photo,complexId:'padel-1'})).status,400);
  assert.equal((await admin('/superadmin/complexes/padel-1/image','PUT',{image:photo})).status,401);
  assert.deepEqual(await listed('padel-1'),other);
  assert.deepEqual(await listed('padel-3'),own);
});

test('visitors and platform sessions cannot use the club route',async t=>{
  const {client,platform,listed}=await fixture(t),before=await listed('padel-3');
  assert.equal((await client()('/admin/complex/image','PUT',{image:photo})).status,401);
  assert.equal((await client()('/superadmin/complexes/padel-3/image','PUT',{image:photo})).status,401);
  assert.equal((await (await platform())('/admin/complex/image','PUT',{image:photo})).status,401);
  assert.deepEqual(await listed('padel-3'),before);
});

test('the platform team changes any complex and the change is audited',async t=>{
  const {db,platform,listed}=await fixture(t),rtl=await platform();
  const saved=await rtl('/superadmin/complexes/soccer-1/image','PUT',{image:dataUrl('webp',webp)});
  assert.equal(saved.status,200);
  assert.equal((await listed('soccer-1')).image,saved.body.image);
  assert.equal((await rtl('/superadmin/complexes/missing/image','PUT',{image:photo})).status,404);
  assert.equal((await rtl('/superadmin/complexes/soccer-1/image','PUT',{image:'assets/padel.png'})).status,400);
  const entry=db.prepare("SELECT actor FROM audit_log WHERE complex_id='soccer-1' AND action LIKE 'Imagen%'").all();
  assert.deepEqual(entry.map(e=>e.actor),['rtl@example.test']);
});

test('the server rejects anything that is not a real PNG, JPEG or WebP within the size limit',async t=>{
  const {db,club,listed}=await fixture(t),admin=await club(),before=await listed('padel-3');
  const invalid={
    missing:undefined,
    number:12,
    remote:'https://example.test/photo.png',
    asset:'assets/padel.png',
    svg:dataUrl('svg+xml',Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')),
    gif:dataUrl('gif',Buffer.from('GIF89a')),
    notBase64:'data:image/png;base64,@@@@',
    badPadding:`${photo.slice(0,-2)}=`,
    empty:'data:image/png;base64,',
    wrongType:dataUrl('png',jpeg),
    notAnImage:dataUrl('jpeg',Buffer.from('<script>alert(1)</script>')),
    tooLarge:dataUrl('jpeg',Buffer.concat([jpeg,Buffer.alloc(1024*1024)]))
  };
  for(const [name,image]of Object.entries(invalid))assert.equal((await admin('/admin/complex/image','PUT',{image})).status,400,name);
  assert.deepEqual(await listed('padel-3'),before);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM complex_images').get().n,0);
});

test('each complex has a limit of image changes per hour',async t=>{
  const {club}=await fixture(t),admin=await club();
  for(let i=0;i<30;i++)assert.equal((await admin('/admin/complex/image','PUT',{image:photo})).status,200);
  assert.equal((await admin('/admin/complex/image','PUT',{image:photo})).status,429);
});

test('the catalog image stays independent from court photos',async t=>{
  const {client,club}=await fixture(t),admin=await club();
  const courtBefore=(await client()('/catalog')).body.courts.find(c=>c.id==='padel-3-court-1');
  const {image}=(await admin('/admin/complex/image','PUT',{image:photo})).body;
  assert.deepEqual((await client()('/catalog')).body.courts.find(c=>c.id==='padel-3-court-1'),courtBefore);
  assert.equal((await admin('/admin/courts/padel-3-court-1','PUT',{...courtBefore,image})).status,400);
  assert.equal((await admin('/admin/courts','POST',{...courtBefore,name:'Cancha nueva'})).status,201);
});

test('the frontend accepts only image addresses produced by the server',async()=>{
  const {imageSource}=await import('../../client/src/shared/api.js');
  const stored='api/complexes/padel-3/image?v=0123456789abcdef0123456789abcdef';
  assert.equal(imageSource(stored),`/${stored}`);
  assert.equal(imageSource('assets/soccer.png'),'/assets/soccer.png');
  assert.equal(imageSource(photo),photo);
  for(const unsafe of ['https://example.test/a.png','api/complexes/../../x/image?v=abc','api/complexes/a/image?v=abc&x=1'])assert.equal(imageSource(unsafe),'/assets/padel.png',unsafe);
});

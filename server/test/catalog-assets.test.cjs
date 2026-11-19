const test=require('node:test');
const assert=require('node:assert/strict');
const {existsSync,readFileSync,statSync}=require('node:fs');
const {resolve}=require('node:path');
const root=resolve(__dirname,'../..');
const read=file=>readFileSync(resolve(root,file),'utf8');

test('catalog sources only reference optimized images that exist',()=>{
  const images=new Set(['courts.js','server/seed-tucuman.cjs','server/court-images.cjs','client/src/shared/api.js'].flatMap(file=>read(file).match(/assets\/[a-z0-9_]+(?:-v\d+)?\.(?:png|webp)/g)||[]));
  assert.ok(images.size>=12);
  for(const image of images){
    assert.match(image,/-v\d+\.webp$/);
    assert.ok(existsSync(resolve(root,image)),image);
    assert.ok(statSync(resolve(root,image)).size<=150*1024,image);
  }
});

test('versioned catalog images are cached long term',()=>{
  const rule=JSON.parse(read('vercel.json')).headers.find(item=>item.source.startsWith('/assets/'));
  assert.deepEqual(rule?.headers,[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}]);
});

test('the interface uses the animated brand wordmark instead of image logos',()=>{
  for(const file of ['client/src/admin/AdminApp.jsx','client/src/public/Footer.jsx','client/src/public/PublicApp.jsx','client/src/landing/LandingApp.jsx','client/src/superadmin/SuperAdminApp.jsx']){
    assert.doesNotMatch(read(file),/assets\/logo\.png|assets\/logo-v1\.webp|assets\/logo-mark\.webp/,file);
    assert.match(read(file),/<BrandWordmark\s*\/>/,file);
  }
  assert.ok(statSync(resolve(root,'assets/logo-v1.webp')).size<=20*1024);
});

test('the RTL mark is the favicon and appears in the footer, about page and loaders',()=>{
  const html=read('client/index.html');
  assert.match(html,/rel="icon" type="image\/svg\+xml" href="\/assets\/rtl-mark\.svg"/);
  assert.ok(existsSync(resolve(root,'assets/rtl-mark.svg')));
  assert.match(html,/id="boot-splash"[\s\S]*class="rtl-mark"/);
  assert.match(read('client/src/shared/components.jsx'),/function PageLoader[^\n]*<BrandMark /);
  assert.match(read('client/src/public/Footer.jsx'),/<BrandMark className="mini-footer-mark" \/>\s*<span className="mini-footer-brand-text">/);
  assert.match(read('client/src/public/About.jsx'),/<BrandMark className="about-mark" \/>/);
});

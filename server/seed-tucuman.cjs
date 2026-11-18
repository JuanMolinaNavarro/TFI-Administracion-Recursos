// Carga idempotente del catálogo de complejos de Tucumán (varias ciudades) en PostgreSQL.
// Uso: node server/seed-tucuman.cjs            -> inserta con DATABASE_URL
//      node server/seed-tucuman.cjs --sql      -> imprime el SQL equivalente (para pegarlo en Supabase)
// Los nombres, ciudades y direcciones provienen de directorios públicos; precios y cantidad de
// canchas son valores iniciales editables desde el panel. rating 0 = sin reseñas todavía.
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {runInNewContext}=require('node:vm');

const PADEL=['16:00','17:30','19:00','20:30','22:00'];
const FUTBOL=['16:00','17:00','18:00','19:00','20:00','21:00','22:00'];
const IMG={padel:'assets/padel.png',futbol:'assets/soccer.png',basquet:'assets/basketball.png'};
const LABEL={padel:'Pádel',futbol:'Fútbol 5',basquet:'Básquetbol'};
const real=(id,name,location,sport,price,features,courts,sportLabel)=>({id,name,location,sport,sportLabel:sportLabel||LABEL[sport],price,rating:0,image:IMG[sport],features,availableSlots:sport==='padel'?PADEL:FUTBOL,courts});
const NEW=[
  real('ping-pong-padel','Ping Pong Pádel','Concepción','padel',16000,['Francia 2100','Canchas al aire libre','Salón de eventos'],2),
  real('los-changos-futbol-5','Los Changos Fútbol 5','Banda del Río Salí','futbol',22000,['Mariano Moreno 147','Asador','Mesas y sillas'],2),
  real('el-complejo-futbol','El Complejo Fútbol','San Miguel de Tucumán','futbol',26000,['Santa Fe 3300','Fútbol 5, 8 y 11'],3,'Fútbol 5/8/11'),
  real('los-aguirre','Complejo Deportivo Los Aguirre','San Miguel de Tucumán','futbol',22000,['Iluminación nocturna'],3),
  real('play-5','Play 5','San Miguel de Tucumán','futbol',24000,['Césped sintético','Predio abierto'],3),
  real('sale-futbol-padel','Sale Fútbol & Pádel','San Miguel de Tucumán','futbol',24000,['San Luis 880','Fútbol y pádel'],3),
  real('la-posta-tucuman','La Posta Tucumán','San Miguel de Tucumán','padel',18000,['Canchas de pádel'],3),
  real('tucuman-padel-club','Tucumán Padel Club','San Miguel de Tucumán','padel',18000,['Canchas de pádel'],3),
  real('italia-padel-club','Italia Pádel Club','San Miguel de Tucumán','padel',17000,['Canchas de pádel'],3)
];
function catalog(){
  const base=runInNewContext(readFileSync(resolve(__dirname,'../courts.js'),'utf8')+'\nCOURTS_DATA').map(c=>({...c,courts:3,original:true}));
  return [...base,...NEW];
}
function courtsOf(c){
  return Array.from({length:c.courts},(_,i)=>{const n=i+1;
    return {...strip(c),id:`${c.id}-court-${n}`,complexId:c.id,complexName:c.name,name:`Cancha ${n}`,enabled:true,lighting:true,
      type:c.features.some(f=>/techad/i.test(f))?'Cubierta':'Descubierta',
      surface:c.sport==='basquet'?'Parquet':c.sport==='padel'?'Césped sintético':'Césped sintético',
      capacity:c.sport==='padel'?4:c.sport==='basquet'?10:/11/.test(c.sportLabel)&&!/5\/8/.test(c.sportLabel)?22:/7/.test(c.sportLabel)?14:10};});
}
function strip({courts,original,...rest}){return rest;}
function rows(){const out=[];for(const c of catalog())out.push({complex:strip(c),courts:courtsOf(c)});return out;}
const q=s=>"'"+String(s).replace(/'/g,"''")+"'";
function sql(){
  const paid=q(new Date(Date.now()+365*86400000).toISOString().slice(0,10)),now=q(new Date().toISOString());
  let s='BEGIN;\n';const all=[];
  for(const {complex,courts} of rows()){
    s+=`INSERT INTO rtl.complexes(id,data) VALUES(${q(complex.id)},${q(JSON.stringify(complex))}) ON CONFLICT(id) DO NOTHING;\n`;
    s+=`INSERT INTO rtl.subscriptions(complex_id,plan,status,paid_until,monthly_fee,updated_at) VALUES(${q(complex.id)},'basic','active',${paid},0,${now}) ON CONFLICT(complex_id) DO NOTHING;\n`;
    all.push(...courts.map(c=>{const {id,complexId,complexName,name,enabled,lighting,type,surface,capacity}=c;return `(${q(id)},${q(complex.id)},${q(JSON.stringify({id,complexId,complexName,name,enabled,lighting,type,surface,capacity}))})`;}));
  }
  s+=`INSERT INTO rtl.courts(id,complex_id,data) SELECT v.id,v.cid,(c.data::jsonb||v.o::jsonb)::text FROM (VALUES ${all.join(',')}) v(id,cid,o) JOIN rtl.complexes c ON c.id=v.cid ON CONFLICT(id) DO NOTHING;
`;
  return s+'COMMIT;\n';
}
async function seed(){
  const {openConfiguredDatabase}=require('./postgres.cjs');
  const db=await openConfiguredDatabase();
  try{
    if(db.kind!=='postgres')throw new Error('Definí DATABASE_URL: este script carga PostgreSQL.');
    const paid=new Date(Date.now()+365*86400000).toISOString().slice(0,10),now=new Date().toISOString();
    await db.transaction(async()=>{for(const {complex,courts} of rows()){
      await db.prepare('INSERT INTO complexes(id,data) VALUES(?,?) ON CONFLICT(id) DO NOTHING').run(complex.id,JSON.stringify(complex));
      await db.prepare("INSERT INTO subscriptions(complex_id,plan,status,paid_until,monthly_fee,updated_at) VALUES(?,'basic','active',?,0,?) ON CONFLICT(complex_id) DO NOTHING").run(complex.id,paid,now);
      for(const c of courts)await db.prepare('INSERT INTO courts(id,complex_id,data) VALUES(?,?,?) ON CONFLICT(id) DO NOTHING').run(c.id,complex.id,JSON.stringify(c));
    }});
    console.log('Catálogo cargado:',rows().length,'complejos.');
  }finally{await db.close();}
}
if(require.main===module){
  if(process.argv.includes('--sql'))process.stdout.write(sql());
  else seed().catch(e=>{console.error(e.message);process.exitCode=1;});
}
module.exports={rows,sql};

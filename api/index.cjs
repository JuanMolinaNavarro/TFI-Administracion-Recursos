// Vercel Serverless Function: reutiliza el mismo servidor HTTP (server/index.cjs) para toda la API.
const {createApp}=require('../server/index.cjs');
const {openConfiguredDatabase}=require('../server/postgres.cjs');

let ready;
function boot(){
  if(!ready)ready=(async()=>{
    if(!process.env.DATABASE_URL)throw new Error('Falta DATABASE_URL: en Vercel no hay disco persistente para SQLite.');
    const app=createApp({db:await openConfiguredDatabase()});
    return app.server.listeners('request')[0];
  })().catch(error=>{ready=undefined;throw error;});
  return ready;
}
module.exports=async(req,res)=>{
  try{(await boot())(req,res);}
  catch(error){
    console.error('Arranque fallido:',error.message);
    res.statusCode=500;res.setHeader('Content-Type','application/json; charset=utf-8');
    res.end(JSON.stringify({error:'El servicio no está disponible.'}));
  }
};

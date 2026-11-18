// Copia las imágenes públicas (assets/) a la salida estática de Vite para servirlas desde el CDN.
const {cpSync,mkdirSync}=require('node:fs');
const {resolve}=require('node:path');
const dist=resolve(__dirname,'../client/dist');
mkdirSync(dist,{recursive:true});
cpSync(resolve(__dirname,'../assets'),resolve(dist,'assets'),{recursive:true});

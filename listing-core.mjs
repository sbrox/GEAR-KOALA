import https from 'node:https';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
const hosts=['ebay.com','hibid.com','govdeals.com','govplanet.com','publicsurplus.com','proxibid.com','bidspotter.com','offerup.com','craigslist.org','auctionzip.com','maxsold.com'];
export function allowedUrl(raw){
 if(typeof raw!=='string'||raw.length>2048)throw Error('Enter a supported HTTPS listing URL.');
 let u;try{u=new URL(raw);}catch{throw Error('Invalid listing URL.');}
 const h=u.hostname.toLowerCase();
 if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443'||!hosts.some(x=>h===x||h.endsWith('.'+x)))throw Error('That URL is not a supported HTTPS marketplace.');
 return u;
}
export function publicAddress(address){
 if(isIP(address)===4){const [a,b]=address.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===2)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51)||a===203&&b===0);}
 // Only globally routed IPv6; reject mapped, local, multicast and documentation space.
 if(isIP(address)!==6)return false;const normalized=new URL('https://['+address+']/').hostname.slice(1,-1);
 return /^[23]/i.test(normalized)&&!/^2001:(?:db8|0:|:|10:|20:)/i.test(normalized)&&!/^2002:/i.test(normalized);
}
async function requestPage(u,deadline){
 const records=await Promise.race([lookup(u.hostname,{all:true}),new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('Listing request timed out.')),Math.max(1,deadline-Date.now()));t.unref?.();})]);
 if(!records.length||records.some(x=>!publicAddress(x.address)))throw Error('Listing destination is not public.');
 const ip=records[0];
 return new Promise((resolve,reject)=>{
  const req=https.get(u,{headers:{'user-agent':'GearKoala/0.2 (+https://gearkoala.com)','accept':'text/html'},lookup:(_host,options,cb)=>options?.all?cb(null,[ip]):cb(null,ip.address,ip.family)},res=>{
   if(res.statusCode>=300&&res.statusCode<400){res.resume();resolve({redirect:res.headers.location});return;}
   if(res.statusCode!==200||!String(res.headers['content-type']).includes('text/html')){res.resume();reject(Error('Marketplace did not return an accessible listing.'));return;}
   let size=0;const chunks=[];res.on('data',b=>{size+=b.length;if(size>1000000){req.destroy(Error('Listing response is too large.'));return;}chunks.push(b);});res.on('end',()=>resolve({html:Buffer.concat(chunks).toString('utf8')}));res.on('error',reject);
  });
  const timer=setTimeout(()=>req.destroy(Error('Listing request timed out.')),Math.max(1,deadline-Date.now()));req.on('close',()=>clearTimeout(timer));req.on('error',reject);
 });
}
export async function fetchListing(raw){let u=allowedUrl(raw);const deadline=Date.now()+7000;for(let redirects=0;redirects<=3;redirects++){if(Date.now()>deadline)throw Error('Listing request timed out.');const r=await requestPage(u,deadline);if(r.redirect){u=allowedUrl(new URL(r.redirect,u).href);continue;}return {html:r.html,url:u.href};}throw Error('Too many listing redirects.');}
function clean(s){return typeof s==='string'?s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,400):'';}
export function extractProduct(html,url){
 const u=allowedUrl(url);
 if(/catalog|auction_results|\/search|\/shop\/|\/sell-item\//i.test(u.pathname))throw Error('Open an individual item listing, not a catalog or search page.');
 if(/<title[^>]*>[^<]*(access denied|error page|just a moment|checking your browser|attention required|not found)/i.test(html))throw Error('Marketplace blocked listing extraction.');
 const nodes=[];for(const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const j=JSON.parse(m[1]);for(const x of Array.isArray(j)?j:[j])nodes.push(...(x?.['@graph']||[x]));}catch{}}
 const products=nodes.filter(x=>x&&[x['@type']].flat().includes('Product')&&clean(x.name));
 if(products.length!==1)throw Error('A single product could not be verified. Enter its title and price manually.');
 const product=products[0];let offers=Array.isArray(product.offers)?product.offers:[product.offers];let price=null,currency=null;
 if(offers.length===1){const offer=offers[0];if(offer&&offer['@type']==='Offer'&&offer.priceCurrency==='USD'&&/^(?:\d+)(?:\.\d{1,2})?$/.test(String(offer.price))&&Number(offer.price)>0&&Number(offer.price)<=10000000&&/\bInStock$/.test(offer.availability||'')){
  let same=true;if(offer.url){try{const o=new URL(offer.url,u);same=o.origin===u.origin&&o.pathname.replace(/\/$/,'')===u.pathname.replace(/\/$/,'');}catch{same=false;}}
  if(same){price=Number(offer.price);currency='USD';}
 }}
 return {ok:true,source:u.hostname,title:clean(product.name),price,currency,resolvedUrl:u.href,needsUserPrice:price===null,requiresReview:true,evidence:{method:'single_product_structured_data',price:price!==null}};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'Use GET.'});
 let u;try{u=allowedUrl(req.query?.url);}catch(e){return res.status(400).json({ok:false,error:e.message});}
 try{const page=await fetchListing(u.href);return res.status(200).json(extractProduct(page.html,page.url));}
 catch(e){console.warn(JSON.stringify({event:'listing_unavailable',source:u.hostname}));return res.status(422).json({ok:false,error:e.message,needsManualEntry:true});}
}

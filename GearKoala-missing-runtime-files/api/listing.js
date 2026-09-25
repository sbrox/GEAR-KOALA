const ALLOWED=[
  "ebay.com","www.ebay.com","hibid.com","www.hibid.com","govdeals.com","www.govdeals.com",
  "govplanet.com","www.govplanet.com","publicsurplus.com","www.publicsurplus.com",
  "proxibid.com","www.proxibid.com","bidspotter.com","www.bidspotter.com",
  "offerup.com","www.offerup.com","craigslist.org","www.craigslist.org","auctionzip.com","www.auctionzip.com"
];
const clean=s=>String(s||"").replace(/\s+/g," ").trim();
const money=v=>{let m=String(v||"").replace(/,/g,"").match(/(?:\$|USD\s*)?([0-9]+(?:\.[0-9]{1,2})?)/i);return m?Number(m[1]):null};
function meta(html,key,prop="property"){
  let a=[...html.matchAll(/<meta\b[^>]*>/gi)].map(x=>x[0]);
  for(const tag of a){
    let p=new RegExp(`${prop}=["']${key.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}["']`,"i");
    if(p.test(tag)){let m=tag.match(/content=["']([^"']*)["']/i);if(m)return clean(m[1].replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'"))}
  } return "";
}
function jsonld(html){
  let blocks=[...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  let out=[]; for(const b of blocks){try{let x=JSON.parse(b[1]);out.push(...(Array.isArray(x)?x:[x]))}catch{}}
  return out.flatMap(x=>x&&x["@graph"]?x["@graph"]:[x]).filter(Boolean);
}
function pickOffer(o){
  if(!o)return null; if(Array.isArray(o))o=o[0]; return o?.price ?? o?.lowPrice ?? o?.highPrice ?? null;
}
export default async function handler(req,res){
  res.setHeader("Cache-Control","s-maxage=300, stale-while-revalidate=600");
  try{
    const raw=Array.isArray(req.query.url)?req.query.url[0]:req.query.url;
    if(!raw)return res.status(400).json({ok:false,error:"Missing URL"});
    const u=new URL(raw);
    if(u.protocol!=="https:")return res.status(400).json({ok:false,error:"Only HTTPS listing URLs are supported"});
    const host=u.hostname.toLowerCase();
    if(!ALLOWED.some(d=>host===d||host.endsWith("."+d.replace(/^www\./,""))))return res.status(400).json({ok:false,error:"That marketplace is not supported yet"});
    let fetchUrl=u.toString(),adapter="generic";
    if(host==="govdeals.com"||host==="www.govdeals.com"){
      const m=u.pathname.match(/^\/en\/asset\/(\d+)\/(\d+)\/?$/i);
      if(m){fetchUrl=`https://prod-seo.govdeals.com/en/asset/${m[1]}/${m[2]}`;adapter="govdeals-seo";}
    }
    const r=await fetch(fetchUrl,{redirect:"follow",headers:{"user-agent":"Mozilla/5.0 (compatible; GearKoala/0.1; +https://gearkoala-v1.vercel.app)","accept":"text/html,application/xhtml+xml"}});
    if(!r.ok)return res.status(422).json({ok:false,error:`Marketplace returned ${r.status}`});
    const ct=r.headers.get("content-type")||""; if(!ct.includes("text/html"))return res.status(422).json({ok:false,error:"Listing did not return HTML"});
    const html=(await r.text()).slice(0,2_000_000), ld=jsonld(html);
    let product=ld.find(x=>["Product","Offer"].includes(x?.["@type"]))||{};
    let title=clean(product.name||meta(html,"og:title")||meta(html,"twitter:title","name")||(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]);
    let desc=clean(product.description||meta(html,"og:description")||meta(html,"description","name"));
    let image=product.image; if(Array.isArray(image))image=image[0]; if(image&&typeof image==="object")image=image.url; image=image||meta(html,"og:image");
    let price=money(pickOffer(product.offers))||money(meta(html,"product:price:amount"))||money(meta(html,"og:price:amount"));
    if(!price){
      const near=html.match(/"(?:price|currentPrice|buyItNowPrice|amount)"\s*:\s*"?\$?([0-9,.]+)/i);
      if(near)price=money(near[1]);
    }
    let currency=meta(html,"product:price:currency")||product?.offers?.priceCurrency||"USD";
    return res.status(200).json({ok:true,source:host.replace(/^www\./,""),originalUrl:u.toString(),resolvedUrl:r.url,adapter,title,description:desc.slice(0,600),image,price,currency,extraction:{title:!!title,price:!!price,image:!!image}});
  }catch(e){return res.status(422).json({ok:false,error:"GearKoala could not read that listing yet."})}
}
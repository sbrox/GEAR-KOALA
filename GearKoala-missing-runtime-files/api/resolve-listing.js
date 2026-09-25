
const SOURCE = {
  govplanet: /(^|\.)govplanet\.com$/i,
  govdeals: /(^|\.)govdeals\.com$/i,
  hibid: /(^|\.)hibid\.com$/i,
};

function cleanText(s="") {
  return s.replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/g," ").replace(/&amp;/g,"&")
    .replace(/\s+/g," ").trim();
}
function decodeSlug(url) {
  try {
    const u=new URL(url);
    return decodeURIComponent(u.pathname)
      .replace(/[+_-]+/g," ")
      .replace(/\b(item|asset|auction|for sale|online)\b/gi," ")
      .replace(/\s+/g," ").trim();
  } catch { return ""; }
}
function sourceFor(host) {
  if(SOURCE.govplanet.test(host)) return "GovPlanet";
  if(SOURCE.govdeals.test(host)) return "GovDeals";
  if(SOURCE.hibid.test(host)) return "HiBid";
  return "Other";
}
function meta(html, prop) {
  const escaped=prop.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const a=new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,'i').exec(html);
  const b=new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,'i').exec(html);
  return (a?.[1]||b?.[1]||"").trim();
}
function jsonLd(html) {
  const out=[];
  for(const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try { 
      const j=JSON.parse(m[1]); 
      if(Array.isArray(j)) out.push(...j); else out.push(j);
    } catch {}
  }
  return out.flatMap(x=>x?.["@graph"]||[x]);
}
function moneyFromText(text) {
  const patterns=[
    /(?:current\s+(?:bid|price)|winning\s+bid|price)\s*[:\-]?\s*(?:US\s*)?\$\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:US\s*)?\$\s*([\d,]+(?:\.\d{1,2})?)/
  ];
  for(const p of patterns){ const m=text.match(p); if(m) return Number(m[1].replace(/,/g,"")); }
  return null;
}
function inferFromText(text, slug) {
  const hay=(text+" "+slug).replace(/\s+/g," ");
  const known=[
    [/Assault Fitness\s+AirBike Elite/i,["Assault Fitness","AirBike Elite","air bike"]],
    [/Hammer Strength\s+Power Rack/i,["Hammer Strength","Power Rack","rack"]],
    [/Life Fitness\s+97T/i,["Life Fitness","97T","treadmill"]],
    [/Life Fitness\s+95TXP[\w-]*/i,["Life Fitness","95TXP","treadmill"]],
    [/Life Fitness\s+95X/i,["Life Fitness","95X","elliptical"]],
    [/Precor\s+C842i\/C846i/i,["Precor","C842i/C846i","recumbent bike"]],
    [/Concept\s*2\s+PM3/i,["Concept2","PM3","ski erg"]],
    [/Cybex\s+771AT/i,["Cybex","771AT","arc trainer"]],
  ];
  for(const [rx,v] of known) if(rx.test(hay)) return {brand:v[0],model:v[1],category:v[2],confidence:.97};
  return null;
}
async function fetchHtml(url){
  const controller=new AbortController();
  const t=setTimeout(()=>controller.abort(),8500);
  try{
    const r=await fetch(url,{
      redirect:"follow",
      signal:controller.signal,
      headers:{
        "user-agent":"Mozilla/5.0 (compatible; GearKoala/0.1; +https://gearkoala.com)",
        "accept":"text/html,application/xhtml+xml"
      }
    });
    return {ok:r.ok,status:r.status,url:r.url,html:await r.text()};
  } finally { clearTimeout(t); }
}

export default async function handler(req,res){
  res.setHeader("Cache-Control","s-maxage=300, stale-while-revalidate=600");
  const raw=(req.query?.url||req.body?.url||"").trim();
  if(!raw) return res.status(400).json({ok:false,error:"Missing listing URL"});
  let u; try{u=new URL(raw)}catch{return res.status(400).json({ok:false,error:"Invalid URL"})}
  const source=sourceFor(u.hostname);
  const slug=decodeSlug(raw);
  let fetched=null, title="", description="", image="", price=null, status=null, text="";
  try{
    fetched=await fetchHtml(raw);
    const html=fetched.html||"";
    title=meta(html,"og:title")||meta(html,"twitter:title")||((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)||[])[1]||"");
    description=meta(html,"og:description")||meta(html,"description");
    image=meta(html,"og:image");
    text=cleanText(html).slice(0,180000);
    for(const j of jsonLd(html)){
      const type=String(j?.["@type"]||"");
      if(/Product|Offer/i.test(type)){
        title=title||j.name||j.itemOffered?.name||"";
        const offer=j.offers||j;
        const p=offer?.price ?? offer?.lowPrice;
        if(p!=null && !Number.isNaN(Number(p))) price=Number(p);
        status=offer?.availability||status;
        image=image||(Array.isArray(j.image)?j.image[0]:j.image)||"";
        description=description||j.description||"";
      }
    }
    price=price ?? moneyFromText(text);
  }catch(e){ fetched={ok:false,status:0,error:String(e?.message||e)}; }

  // GovPlanet fallback: even when detail pages resist direct extraction,
  // use information exposed in the canonical URL and publicly indexable text.
  const inferred=inferFromText([title,description,text].join(" "),slug);
  const productTitle=(title||slug||"").replace(/\s+/g," ").trim();

  return res.status(200).json({
    ok:true, source, requestedUrl:raw, resolvedUrl:fetched?.url||raw,
    fetch:{ok:!!fetched?.ok,status:fetched?.status||0},
    title:productTitle, description, image, price, status,
    inferred,
    evidence:{
      title:!!productTitle,
      price:price!=null,
      product:!!inferred,
      method:fetched?.ok ? "server_fetch+metadata+structured_data+text" : "url_fallback"
    },
    needsUserPrice:price==null,
    needsScreenshot:!productTitle && !inferred
  });
}

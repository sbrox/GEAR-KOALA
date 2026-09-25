const GK_U="https://dyvzrboshanctbjiukvh.supabase.co",GK_K="sb_publishable_ZKuyrkd9Rv7L-4HUXv_v-g_Ka5l9hSD";let gkGear=[];
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)],norm=s=>String(s||"").toLowerCase();
async function loadGK(){try{let r=await fetch(GK_U+"/rest/v1/equipment?select=id,brand,model,category,subtype,equipment_family,aliases&order=brand.asc,model.asc",{headers:{apikey:GK_K,Authorization:"Bearer "+GK_K}});gkGear=await r.json();fillBrowse()}catch(e){}}
function fillBrowse(){let cats=[...new Set(gkGear.map(x=>x.category).filter(Boolean))].sort(),brands=[...new Set(gkGear.map(x=>x.brand).filter(Boolean))].sort();q("#browseCategory").innerHTML+=[...cats].map(x=>`<option>${x}</option>`).join("");q("#browseBrand").innerHTML+=brands.map(x=>`<option>${x}</option>`).join("");updateModels()}
function updateModels(){let c=q("#browseCategory").value,b=q("#browseBrand").value,a=gkGear.filter(x=>(!c||x.category===c)&&(!b||x.brand===b));q("#browseModel").innerHTML='<option value="">Not sure / any model</option>'+a.map(x=>`<option value="${x.id}">${x.brand} ${x.model}</option>`).join("")}
q("#browseCategory").onchange=updateModels;q("#browseBrand").onchange=updateModels;
qa(".entrytab").forEach(b=>b.onclick=()=>{qa(".entrytab").forEach(x=>x.classList.remove("active"));qa(".entrymode").forEach(x=>x.classList.remove("active"));b.classList.add("active");q("#"+b.dataset.mode+"Mode").classList.add("active");updateLotUI()});
q("#title").addEventListener("input",e=>{let v=norm(e.target.value).trim();if(v.length<2){q("#suggestions").innerHTML="";return}let terms=v.split(/\s+/),scored=gkGear.map(x=>{let hay=norm([x.brand,x.model,x.category,x.subtype,x.equipment_family,...(x.aliases||[])].join(" "));return {x,n:terms.filter(t=>hay.includes(t)).length}}).filter(z=>z.n).sort((a,b)=>b.n-a.n).slice(0,7);q("#suggestions").innerHTML=scored.map(({x})=>`<button type="button" data-label="${x.brand} ${x.model}"><b>${x.brand} ${x.model}</b><span>${x.category}${x.subtype?" · "+x.subtype:""}</span></button>`).join("");qa("#suggestions button").forEach(b=>b.onclick=()=>{q("#title").value=b.dataset.label;q("#suggestions").innerHTML="";updateLotUI()})});
q("#listingUrl").addEventListener("input",()=>{let v=q("#listingUrl").value.trim();gkExtracted=null;q("#title").value="";q("#price").value="";q("#priceHint").textContent="GearKoala will try to read this from the listing";q("#out").innerHTML="";if(v){q("#compStatus").textContent="Ready to read listing — source support varies."}});
q("#browseModel").addEventListener("change",()=>{let id=q("#browseModel").value,x=gkGear.find(y=>String(y.id)===id);if(x)q("#title").value=x.brand+" "+x.model;else {let c=q("#browseCategory").value,b=q("#browseBrand").value;q("#title").value=[b,c].filter(Boolean).join(" ")}});
loadGK();
let gkLinkBusy=false,gkExtracted=null;
async function readListing(){
  let u=q("#listingUrl").value.trim(); if(!u)return null;
  q("#compStatus").textContent="Reading listing…";
  try{
    let r=await fetch("/api/listing?url="+encodeURIComponent(u)),d=await r.json();
    if(!r.ok||!d.ok)throw Error(d.error||"Could not read listing");
    gkExtracted=d;
    if(d.title)q("#title").value=d.title;
    if(d.price){q("#price").value=d.price;q("#priceHint").textContent="read from listing · editable";}else q("#priceHint").textContent="not found in listing · enter current bid / asking price";
    q("#compStatus").textContent=`Listing read · ${d.source}${d.adapter==="govdeals-seo"?" · GovDeals adapter":""}${d.price?" · price found":" · add current bid / asking price"}`;
    q("#compStatus").className="compstatus livecomp";
    return d;
  }catch(e){
    q("#title").value=""; q("#out").innerHTML="";
    q("#compStatus").textContent=(e.message||"Could not read listing")+" · switch to Smart Search or enter the item manually; no score has been generated.";
    return null;
  }
}
q("#listingUrl").addEventListener("change",readListing);
const gkGo=q("#go");
gkGo.addEventListener("click",async e=>{
  let linkActive=q("#linkMode").classList.contains("active"),u=q("#listingUrl").value.trim();
  if(linkActive&&u&&!gkLinkBusy&&!gkExtracted){
    e.preventDefault();e.stopImmediatePropagation();gkLinkBusy=true;
    let d=await readListing();gkLinkBusy=false;
    if(d)gkGo.click();
  }
},true);
const params=new URLSearchParams(location.search);
if(params.get("url")){
  qa(".entrytab").forEach(x=>x.classList.remove("active"));qa(".entrymode").forEach(x=>x.classList.remove("active"));
  q('[data-mode="link"]').classList.add("active");q("#linkMode").classList.add("active");q("#listingUrl").value=params.get("url");
  if(params.get("price"))q("#price").value=params.get("price"); setTimeout(readListing,150);
}

function isLotLike(v){v=norm(v);return /dumbbell|plate|bumper|weight set|olympic weight/.test(v)}
function updateLotUI(){let v=q("#title")?.value||"",c=q("#browseCategory")?.value||"";q("#lotFields").classList.toggle("show",isLotLike(v+" "+c))}
q("#title").addEventListener("input",updateLotUI);q("#browseCategory").addEventListener("change",updateLotUI);
["lotQty","unitWeight"].forEach(id=>q("#"+id).addEventListener("input",()=>{let a=Number(q("#lotQty").value),b=Number(q("#unitWeight").value);if(a&&b&&!q("#totalWeight").dataset.manual)q("#totalWeight").value=(a*b).toFixed(0)}));
q("#totalWeight").addEventListener("input",()=>q("#totalWeight").dataset.manual="1");
function genericMatchText(){
 let v=norm(q("#title").value);if(/plate|bumper/.test(v))return "Generic plate valuation available · brand not required";
 if(/dumbbell/.test(v))return "Generic dumbbell valuation available · weight + condition can drive the estimate";
 return "";
}
q("#title").addEventListener("blur",()=>{let t=genericMatchText();if(t)q("#compStatus").textContent=t});

function identifyFromUrl(u){
 try{
   let x=new URL(u), path=decodeURIComponent(x.pathname).replace(/[-_]+/g," ").replace(/\b(for sale|sporting goods and equipment|lot)\b/gi," ");
   let hints=[
    [/assault fitness airbike elite|assault.*airbike.*elite/i,"Assault Fitness AssaultBike Elite"],
    [/nordic.*track.*treadmill/i,"NordicTrack treadmill"],
    [/life fitness.*treadmill/i,"Life Fitness treadmill"],
    [/hammer strength.*power rack/i,"Hammer Strength Power Rack"],
    [/concept2.*ski/i,"Concept2 SkiErg"],
    [/proform.*treadmill/i,"ProForm treadmill"]
   ];
   for(let [rx,val] of hints)if(rx.test(path))return val;
   return "";
 }catch(e){return ""}
}
q("#listingUrl").addEventListener("change",()=>{let v=q("#listingUrl").value.trim(),h=identifyFromUrl(v);if(h&&!q("#title").value){q("#title").value=h;updateLotUI();q("#compStatus").textContent="Product clue read from listing URL · GearKoala still needs the current bid / asking price if the marketplace blocks it."}});


async function resolveListingServerSide(rawUrl){
  const status=q("#compStatus");
  try{
    if(status) status.textContent="Reading listing…";
    const r=await fetch("/api/resolve-listing?url="+encodeURIComponent(rawUrl));
    if(!r.ok) throw new Error("resolver "+r.status);
    const d=await r.json();
    if(!d.ok) throw new Error(d.error||"Could not read listing");
    const inferredName=d.inferred ? [d.inferred.brand,d.inferred.model].filter(Boolean).join(" ") : "";
    if(q("#title") && (d.title||inferredName)) q("#title").value=inferredName||d.title;
    if(q("#price") && d.price!=null) q("#price").value=String(d.price);
    if(status){
      const bits=[d.source];
      if(d.inferred) bits.push("identified "+inferredName);
      if(d.price!=null) bits.push("price read");
      else bits.push("price not exposed — enter it or upload a screenshot");
      status.textContent=bits.join(" · ");
    }
    if(typeof updateLotUI==="function") updateLotUI();
    return d;
  }catch(e){
    const hint=(typeof identifyFromUrl==="function") ? identifyFromUrl(rawUrl) : "";
    if(hint && q("#title") && !q("#title").value) q("#title").value=hint;
    if(status) status.textContent=hint
      ? "Product clue read from URL · marketplace did not expose the current price. Enter price or upload screenshot."
      : "Could not read this listing automatically · paste the title/price or upload a screenshot.";
    if(typeof updateLotUI==="function") updateLotUI();
    return null;
  }
}
const _listingUrl=q("#listingUrl");
if(_listingUrl){
  _listingUrl.addEventListener("change", async ()=> {
    const u=_listingUrl.value.trim();
    if(u) await resolveListingServerSide(u);
  }, true);
}

const U="https://dyvzrboshanctbjiukvh.supabase.co",K="sb_publishable_ZKuyrkd9Rv7L-4HUXv_v-g_Ka5l9hSD";let C=[];const $=s=>document.querySelector(s),num=v=>Number(String(v||"").replace(/[^0-9.]/g,""))||0,money=n=>n?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n):"—";
async function api(path){let r=await fetch(U+"/rest/v1/"+path,{headers:{apikey:K,Authorization:"Bearer "+K}});if(!r.ok)throw Error(r.status);return r.json()}
async function load(){try{C=await api("equipment?select=*");$("#status").textContent="● LIVE · "+C.length+" MODELS";$("#status").className="live";let obs=await api("market_observations?select=id&limit=1000");$("#compStatus").textContent=`Market layer live · ${obs.length} observations`;$("#compStatus").className="compstatus livecomp"}catch(e){$("#status").textContent="● DATABASE OFFLINE";$("#status").className="bad"}}
function tokens(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(x=>x.length>1)}
function scoreCandidate(t,x){
 let q=tokens(t), fields=[x.brand,x.model,x.category,x.subtype,x.equipment_family,...(x.aliases||[])].filter(Boolean).map(String);
 let hay=tokens(fields.join(" ")), set=new Set(hay), overlap=q.filter(z=>set.has(z)).length;
 let exact=fields.some(f=>String(t).toLowerCase().includes(f.toLowerCase())&&f.length>=5)?4:0;
 let generic=x.generic_match?0:1;
 return overlap*3+exact+generic;
}
function candidates(t){return C.map(x=>({x,s:scoreCandidate(t,x)})).filter(o=>o.s>=4).sort((a,b)=>b.s-a.s)}
function exactFind(t){let a=candidates(t);return a.length?a[0].x:null}
function median(a){a=[...a].sort((x,y)=>x-y);let n=a.length;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2}
function arr(v){return Array.isArray(v)?v:[]}
function esc(s){return String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function airdyneAmbiguous(t){return /air\s*dyne|airdyne/i.test(t)&&!/ad\s*[24567]|pro.?comp|evolution/i.test(t)}
function lotLike(t,x){return /dumbbell|plate|bumper/i.test(t)||x?.valuation_mode==="lot_weight"||x?.valuation_mode==="hybrid"}
function clearResult(){let o=$("#out");if(o)o.innerHTML=""}
async function evaluate(){
 let raw=$("#title").value.trim(),p=num($("#price").value);
 if(!raw){$("#out").innerHTML='<div class="needs-data"><b>Tell GearKoala what the item is first.</b><p>A broad description is fine — exact model is optional.</p></div>';return}
 if(!p){$("#out").innerHTML='<div class="needs-data"><b>We still need the price.</b><p>If you pasted a listing and GearKoala could not read the current bid or asking price, enter it above.</p></div>';return}
 if(airdyneAmbiguous(raw)){
   let opts=C.filter(x=>x.brand==="Schwinn"&&/Airdyne/i.test(x.model));
   $("#out").innerHTML=`<div class="identify"><span class="result-kicker">MODEL CHECK</span><h3>Which Airdyne is this?</h3><p>This one matters: Airdyne generations have different drivetrains and values.</p><div class="idgrid">${opts.slice(0,6).map(x=>`<button class="idchoice" data-model="${esc(x.brand+" "+x.model)}"><b>${esc(x.model)}</b><span>${esc((x.gear_brief||x.short_description||"").slice(0,115))}</span></button>`).join("")}</div></div>`;
   document.querySelectorAll(".idchoice").forEach(b=>b.onclick=()=>{$("#title").value=b.dataset.model;evaluate()});return;
 }
 let x=exactFind(raw),comps=[];
 if(x){try{comps=await api(`market_observations?equipment_id=eq.${x.id}&select=observed_price,normalized_price,listing_status,observed_at,condition,source,match_type,match_confidence,is_bundle,verification_status&order=observed_at.desc&limit=50`)}catch(e){}}
 let comparable=comps.filter(c=>c.listing_status==="sold"&&!c.is_bundle&&!/new/i.test(c.condition||"")&&(c.match_type==="exact_model"||c.match_type==="model_family")&&c.verification_status==="verified");
 let total=num($("#totalWeight")?.value), pp=total?p/total:0;
 // Lot-based gear: show useful math, but do not fake a benchmark/score until evidence exists.
 if(lotLike(raw,x) && comparable.length<3){
   let name=x?`${x.brand} · ${x.model}`:"Generic / unknown gear";
   $("#out").innerHTML=`<div class="resulttop unscored"><div><span class="result-kicker">${esc(name)}</span><h3>Deal math <small>not scored yet</small></h3></div><strong class="verdict">MORE MARKET DATA NEEDED</strong></div>
   <div class="price-strip"><div><span>PRICE</span><b>${money(p)}</b></div><div><span>TOTAL WEIGHT</span><b>${total?total+" lb":"add weight"}</b></div><div><span>PRICE / LB</span><b>${pp?"$"+pp.toFixed(2):"—"}</b></div></div>
   ${x?`<div class="brief"><span>GEAR BRIEF</span><p>${esc(x.gear_brief||x.short_description||"")}</p>${x.market_note?`<em>${esc(x.market_note)}</em>`:""}</div>`:""}
   <div class="evidence"><span>WHY THERE IS NO GRAB SCORE YET</span><b>GearKoala does not have enough verified sold evidence for this category.</b><p>Your ${pp?"$"+pp.toFixed(2)+"/lb":"lot"} math is real. A 65-point placeholder would not be.</p></div>`;return;
 }
 if(!x){
   $("#out").innerHTML=`<div class="needs-data"><span class="result-kicker">PARTIAL IDENTIFICATION</span><b>We can work with this — but we don't have enough evidence to score it yet.</b><p>GearKoala did not find a confident catalog match for “${esc(raw)}.” Try a broader equipment type, add the brand/model if visible, or use Browse. We won't invent a Grab Score.</p></div>`;return;
 }
 let center=0,method="";
 if(comparable.length>=3){let prices=comparable.map(c=>+(c.normalized_price||c.observed_price)).filter(Boolean);center=median(prices);method=`Market estimate · ${prices.length} verified comparable sold observations`}
 else {
   let rates={"air bike":.66,rower:.68,"ski erg":.68,bike:.70,"spin bike":.35,"indoor cycle":.35,"squat stand":.65,"power rack":.64,dumbbells:.58};
   let anchor=+x.current_new_price||+x.msrp||0;
   if(anchor){center=anchor*(rates[x.category]||.56)*+$("#condition").value;method="Reference estimate · MSRP/new-price anchored · sold comps still needed"}
 }
 if(!center){
   $("#out").innerHTML=`<div class="resulttop unscored"><div><span class="result-kicker">${esc(x.brand+" · "+x.model)}</span><h3>Matched <small>not scored yet</small></h3></div><strong class="verdict">MORE MARKET DATA NEEDED</strong></div>
   <div class="brief"><span>GEAR BRIEF</span><p>${esc(x.gear_brief||x.short_description||"Product identified.")}</p>${x.market_note?`<em>${esc(x.market_note)}</em>`:""}</div>
   <div class="evidence"><span>WHY THERE IS NO GRAB SCORE YET</span><b>Product identified, valuation evidence incomplete.</b><p>GearKoala needs verified sold comps or a trustworthy new-price anchor before it judges this deal.</p></div>`;return;
 }
 let ratio=p/center,score=Math.round(Math.max(20,Math.min(99,120-ratio*70))),v=ratio<=.67?"POUNCE":ratio<=.82?"WORTH GRABBING":ratio<=1.02?"FAIR":"PASS / NEGOTIATE";
 let sources=[...new Set(comparable.map(c=>c.source))],notes=arr(x.used_buy_notes);
 let newContext=`<div class="price-strip"><div><span>ASKING</span><b>${money(p)}</b></div><div><span>REFERENCE RANGE</span><b>${money(center*.9)}–${money(center*1.1)}</b></div>${+x.current_new_price?`<div><span>NEW</span><b>${money(+x.current_new_price)}</b></div>`:""}</div>`;
 $("#out").innerHTML=`<div class="resulttop"><div><span class="result-kicker">${esc(x.brand+" · "+x.model)}</span><h3>${score} <small>Grab Score</small></h3></div><strong class="verdict">${v}</strong></div>${newContext}
 <div class="brief"><span>GEAR BRIEF</span><p>${esc(x.gear_brief||x.short_description||"Product profile is being built.")}</p>${x.market_note?`<em>${esc(x.market_note)}</em>`:""}</div>
 ${notes.length?`<div class="buycheck"><span>CHECK BEFORE YOU GRAB IT</span><ul>${notes.slice(0,5).map(n=>`<li>${esc(n)}</li>`).join("")}</ul></div>`:""}
 <div class="evidence"><span>WHY THIS SCORE</span><b>${esc(method)}</b><p>${comparable.length?`${comparable.length} usable sold comps${sources.length?` · ${sources.join(" + ")}`:""}`:"This score uses a product-price anchor and is labeled accordingly."}</p></div>`;
}
$("#go").onclick=evaluate;
["title","price","condition","lotQty","unitWeight","totalWeight","listingUrl"].forEach(id=>{let el=$("#"+id);if(el)el.addEventListener("input",clearResult)});
load();
const U="https://dyvzrboshanctbjiukvh.supabase.co",K="sb_publishable_ZKuyrkd9Rv7L-4HUXv_v-g_Ka5l9hSD";let C=[];const $=s=>document.querySelector(s),num=v=>parsePrice(v),money=n=>n?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n):"—";
async function api(path){let r=await fetch(U+"/rest/v1/"+path,{headers:{apikey:K,Authorization:"Bearer "+K}});if(!r.ok)throw Error(r.status);return r.json()}
let catalogAvailable=false,evaluationVersion=0;
async function load(){try{C=await api("equipment?select=*");catalogAvailable=true;if($("#status"))$("#status").textContent="● CATALOG · "+C.length+" MODELS";$("#compStatus").textContent="Catalog ready · sold evidence is checked per item";}catch(e){console.warn("GearKoala: catalog unavailable");if($("#status"))$("#status").textContent="● CATALOG UNAVAILABLE";$("#compStatus").textContent="Catalog unavailable. Please try again later.";}}
function parsePrice(value){const s=String(value??"").trim().replace(/^\$\s*/,"");if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(s))return 0;const n=Number(s.replace(/,/g,""));return Number.isFinite(n)&&n>0&&n<=10000000?n:0;}
function normalized(s){return String(s||"").toLowerCase().replace(/concept\s*[- ]?2/g,"concept2").replace(/[^a-z0-9+]+/g," ").trim();}
function containsPhrase(text,phrase){return (" "+normalized(text)+" ").includes(" "+normalized(phrase)+" ");}
function unsafeItem(t){return /\b(replacement|spare|parts?|repair|broken|damaged|untested|bundle|lot of|versus|vs|replica|knockoff|compatible|fits)\b|not working|needs work|monitor only|chain only|seat only|handle only/i.test(t);}
function modelFits(t,x){
 if(!containsPhrase(t,x.brand)||!containsPhrase(t,x.model))return false;
 // Bike and Bike+ (and unmentioned generations) must not collapse together.
 if(/\bbike\b/i.test(x.model)&&!/\+|plus/i.test(x.model)&&/bike\s*(?:\+|plus)/i.test(t))return false;
 const categories=[[/\b(treadmill|tredmill)\b/i,/treadmill|walking pad/i],[/\b(rower|rowing|waterrower)\b/i,/rower/i],[/\b(rack)\b/i,/rack|stand/i],[/\b(elliptical)\b/i,/elliptical|motion trainer|arc trainer/i]];
 return !categories.some(([query,category])=>query.test(t)&&!category.test(x.category||""));
}
function exactFind(t){
 if(unsafeItem(t))return null;
 const c2=concept2Match(t);if(c2)return c2.x;
 const matches=C.filter(x=>!x.generic_match&&modelFits(t,x));
 const keys=new Set(matches.map(x=>normalized(x.brand+" "+x.model)));
 return keys.size===1?matches[0]||null:null;
}
function median(a){a=[...a].sort((x,y)=>x-y);let n=a.length;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2}
function arr(v){return Array.isArray(v)?v:[]}
function esc(s){return String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function airdyneAmbiguous(t){return /air\s*dyne|airdyne/i.test(t)&&!/ad\s*[24567]|pro.?comp|evolution/i.test(t)}
function lotLike(t,x){return /dumbbell|plate|bumper/i.test(t)||x?.valuation_mode==="lot_weight"||x?.valuation_mode==="hybrid"}
function clearResult(){evaluationVersion++;let o=$("#out");if(o)o.innerHTML=""}
// Model D was renamed RowErg; PM5 is a monitor, not proof of a frame model.
// https://www.concept2.com/blog/the-rowerg-a-new-name-for-the-model-d-and-model-e
function concept2Identity(text) {
 const t=String(text||"").toLowerCase().replace(/concept\s*[- ]?2/g,"concept2");
 if(!/\bconcept2\b/.test(t)) return null;
 const monitor=(t.match(/\bpm\s*([1-5])\b/)||[])[1]||null;
 const model=(t.match(/\bmodel\s*([a-e])\b/)||[])[1]||null;
 const other=/ski\s*erg|bike\s*erg|dynamic|\bmodel\s*[abce]\b|\bd\s*\/\s*e\b|tall\s*(leg|seat)|20\s*(inch|in\b|["″])/.test(t);
 const rower=/row\s*erg|rower|rowing|\bmodel\s*[a-e]\b/.test(t);
 const accessory=unsafeItem(t)||/\b(monitor|seat|chain|handle|parts?|replacement)\s*(only|replacement)\b|\b(monitor only|pm\s*5 only)\b/.test(t);
 return {rower:rower&&!other&&!accessory,excluded:other||accessory,model:model==="d"?"model-d":/row\s*erg/.test(t)?"rowerg":null,monitor};
}
function concept2Record(x) {
 // Do not use aliases or the broad "Concept2 Ergs" family to infer compatibility.
 return concept2Identity(`${x.brand} ${x.model} ${x.generation||""} ${x.category||""}`);
}
function concept2Match(raw) {
 const identity=concept2Identity(raw);
 if(!identity?.rower) return null;
 const rows=C.filter(x=>concept2Record(x)?.rower);
 const preferred=identity.model==="model-d" ? `model d${identity.monitor?" pm"+identity.monitor:""}` : "rowerg";
 const x=rows.find(x=>x.model.toLowerCase()===preferred)||rows.find(x=>x.model.toLowerCase()==="rowerg");
 if(!x) return null;
 const label=identity.model ? `Concept2 · ${identity.model==="model-d"?"Model D":"RowErg"}${identity.monitor?" · PM"+identity.monitor:""}` : `Concept2 · rowing-machine family${identity.monitor?" · PM"+identity.monitor:""} (model unconfirmed)`;
 return {identity,x,rows,label};
}
function soldPrice(c) {
 const p=Number(c.normalized_price ?? c.observed_price);
 return Number.isFinite(p)&&p>0?p:0;
}
function verifiedSale(c) {
 return c.listing_status==="sold"&&c.verification_status==="verified"&&c.is_bundle===false&&
  !/\bnew\b|unused|parts only|not working|broken/i.test(`${c.condition||""} ${c.title||""}`.replace(/like[ -]new/gi,"used"))&&
  ["exact_model","model_family","exact","family"].includes(c.match_type)&&
  (!c.currency||c.currency==="USD")&&soldPrice(c)>0;
}
function saleKey(c) {
 // A catalog URL can contain multiple lots: never deduplicate on that URL alone.
 const url=String(c.listing_url||"").toLowerCase().split(/[?#]/)[0].replace(/\/$/,"");
 const lot=url.match(/\/lot\/(\d+)/),asset=url.match(/\/asset\/(\d+\/\d+)/);
 if(lot) return `${c.source}:lot:${lot[1]}`;
 if(asset) return `${c.source}:asset:${asset[1]}`;
 if(c.source_listing_id) return `${c.source}:id:${String(c.source_listing_id).replace(/-lot-?/i,"-")}`;
 return c.id;
}
function concept2Comps(match, observations) {
 const records=new Map(match.rows.map(x=>[x.id,x]));
 const tiers=[[],[],[]],seen=new Set(),wanted=match.identity;
 for(const c of observations) {
  if(!verifiedSale(c)) continue;
  const record=records.get(c.equipment_id);
  if(!record) continue;
  const fromTitle=concept2Identity(`Concept2 ${c.title||""}`),fromRecord=concept2Record(record);
  if(fromTitle?.excluded) continue;
  // Specific sale titles override catalog metadata (some RowErg rows contain PM3 sales).
  const titleHasFrame=/model\s*[a-e]|row\s*erg/i.test(c.title||"");
  const model=titleHasFrame ? fromTitle?.model : fromRecord.model;
  const monitor=(String(c.title||"").match(/\bPM\s*([1-5])\b/i)||[])[1]||
   (record.model.toLowerCase()==="rowerg" ? null : fromRecord.monitor);
  if(wanted.monitor ? monitor!==wanted.monitor : monitor!==null) continue;
  const level=wanted.model&&model===wanted.model&&["exact_model","exact"].includes(c.match_type)?0:
   wanted.model&&model&&["model-d","rowerg"].includes(model)&&wanted.monitor?1:2;
  tiers[level].push(c);
 }
 const selected=[];
 for(let i=0;i<tiers.length;i++) {
  for(const c of tiers[i]) {const key=saleKey(c);if(!key||!seen.has(key)){if(key)seen.add(key);selected.push(c);}}
  if(selected.length>=3) return {comps:selected,level:["exact compatible model","compatible Model D / RowErg generation","Concept2 rowing-machine family"][i]};
 }
 return {comps:selected,level:"Concept2 rowing-machine family"};
}
async function concept2Evidence(match) {
 const ids=match.rows.map(x=>x.id).join(","),all=[];
 // Filter eligibility on the server before paging so asking listings cannot hide sold evidence.
 const query=`market_observations?equipment_id=in.(${ids})&listing_status=eq.sold&verification_status=eq.verified&select=id,equipment_id,title,observed_price,normalized_price,listing_status,observed_at,sold_at,condition,source,source_listing_id,listing_url,match_type,is_bundle,verification_status,currency&order=observed_at.desc,id.asc`;
 for(let offset=0;;) {
  const page=await api(`${query}&limit=500&offset=${offset}`);all.push(...page);
  if(!page.length) break;
  offset+=page.length;
 }
 return concept2Comps(match,all);
}

function conditionClass(text){
 const t=String(text||"").toLowerCase();
 if(!t||/unknown|not tested|untested|as.is|needs|broken|damage|not working|does not|sticks|parts|unusable/i.test(t))return null;
 if(/like[ -]new|excellent|barely used|gently used/.test(t))return "excellent";
 if(/\bnew\b|unused|open box/.test(t))return null;
 if(/fair|heavy wear/.test(t))return "fair";
 if(/good|normal wear|tested.*working|fully functional/.test(t))return "good";
 return null;
}
function saleIdentity(c){
 try{const u=new URL(c.listing_url);if(u.protocol!=="https:")return null;let h=u.hostname.replace(/^www\./,"").replace(/^prod-seo\./,"");let m;
 if((h==="hibid.com"||h.endsWith(".hibid.com"))&&(m=u.pathname.match(/\/lot\/(\d+)/)))return {key:"hibid:"+m[1],source:"HiBid",url:u.href};
 if(h==="govdeals.com"&&(m=u.pathname.match(/\/asset\/(\d+\/\d+)/)))return {key:"govdeals:"+m[1],source:"GovDeals",url:u.href};
 if(h==="maxsold.com"&&(m=u.pathname.match(/\/listing\/(\d+)/)))return {key:"maxsold:"+m[1],source:"MaxSold",url:u.href};
 // Catalog links and seller pages are not individual sale provenance.
 return null;}catch{return null;}
}
function reliableEvidence(rows,x,match,condition,now=Date.now()){
 const seen=new Map();
 for(const c of rows){
  const identity=saleIdentity(c),date=Date.parse(c.sold_at),age=now-date;
  if(!identity||!verifiedSale(c)||c.currency!=="USD"||!["auction_sale","completed_sale"].includes(c.transaction_type)||!Number.isFinite(date)||age<0||age>365*86400000||conditionClass(c.condition)!==condition||!["exact","exact_model"].includes(c.match_type)||!modelFits(c.title,x))continue;
  if(match){const identity=concept2Identity(c.title);if(!match.identity.model||!match.identity.monitor||!identity?.rower||identity.monitor!==match.identity.monitor||identity.model!==match.identity.model)continue;}
  if(seen.has(identity.key)){const prev=seen.get(identity.key);if(prev&&soldPrice(prev)!==soldPrice(c))seen.set(identity.key,null);}else seen.set(identity.key,c);
 }
 const comps=[...seen.values()].filter(Boolean),prices=comps.map(soldPrice).sort((a,b)=>a-b),sources=new Set(comps.map(c=>saleIdentity(c).source));
 const low=prices[Math.floor((prices.length-1)*.25)],high=prices[Math.ceil((prices.length-1)*.75)];
 const dates=new Set(comps.map(c=>c.sold_at.slice(0,10)));
 const enough=comps.length>=5&&sources.size>=2&&dates.size>=2&&low>0&&high/low<=2;
 return {comps,enough,low,high,center:enough?median(prices):0};
}
async function observationsFor(ids){let all=[];for(let offset=0;offset<10000;){const page=await api(`market_observations?equipment_id=in.(${ids.join(",")})&listing_status=eq.sold&verification_status=eq.verified&select=*&order=sold_at.desc,id.asc&limit=500&offset=${offset}`);all.push(...page);if(!page.length)return all;offset+=page.length;}throw Error("Evidence limit reached");}
function abstain(label,reason,x){return `<div class="resulttop unscored"><div><span class="result-kicker">${esc(label)}</span><h3>Not scored</h3></div><strong class="verdict">MORE INFORMATION NEEDED</strong></div><div class="evidence"><b>I can’t value this reliably.</b><p>${esc(reason)}</p>${x?`<p>${esc(x.gear_brief||x.short_description||"")}</p>`:""}${+x?.current_new_price?`<p>Catalog retail reference: ${money(+x.current_new_price)}. This is not a used-value estimate or purchase recommendation.</p>`:""}</div>`;}
async function evaluate(){
 const version=++evaluationVersion;await catalogReady;if(version!==evaluationVersion)return;
 const raw=$("#title").value.trim(),p=parsePrice($("#price").value),out=$("#out");
 if(!raw){out.innerHTML=abstain("IDENTIFICATION NEEDED","Enter the brand and model, or choose a model in Browse.");return;}
 if(!p){out.innerHTML=abstain("CHECK THE PRICE","Enter a positive USD price, such as 350 or 1,250.50. Negative values and shorthand are not accepted.");return;}
 if(!catalogAvailable){out.innerHTML=abstain("DATA UNAVAILABLE","The catalog could not be loaded. Please try again later.");return;}
 if(unsafeItem(raw)){out.innerHTML=abstain("ITEM NEEDS REVIEW","Parts, accessories, bundles, damaged or untested equipment need separate identification and evidence. No complete-machine recommendation is generated.");return;}
 const match=concept2Match(raw),x=exactFind(raw);
 if(!x){out.innerHTML=abstain("IDENTIFICATION UNCERTAIN","I can’t identify this reliably. Confirm the brand, exact model and equipment type, or select the model in Browse. Similar words are not enough to establish compatibility.");return;}
 const label=match?.label||x.brand+" · "+x.model;
 if(match&&(!match.identity.model||!match.identity.monitor)){out.innerHTML=abstain(label,"Confirm the frame model and monitor generation before valuation. A family match alone does not justify a purchase verdict.",x);return;}
 if(lotLike(raw,x)){const total=parsePrice($("#totalWeight")?.value);out.innerHTML=abstain(label,"Confirm pair/set configuration and total weight. Comparable lot evidence is not sufficiently validated to score this item.",x)+(total?`<div class="price-strip"><div><span>PRICE / LB · arithmetic only</span><b>$${(p/total).toFixed(2)}</b></div></div>`:"");return;}
 out.innerHTML='<div class="needs-data">Checking compatible sold evidence…</div>';
 let rows;try{const ids=C.filter(r=>normalized(r.brand+" "+r.model)===normalized(x.brand+" "+x.model)).map(r=>r.id);rows=await observationsFor(ids);}catch(e){if(version===evaluationVersion){console.warn("GearKoala: sold evidence unavailable");out.innerHTML=abstain(label,"Sold evidence could not be loaded. This is a data-availability failure, not an estimate.",x);}return;}
 if(version!==evaluationVersion)return;
 const condition={"1":"excellent",".93":"good",".82":"fair"}[$("#condition").value],ev=reliableEvidence(rows,x,match,condition);
 if(!ev.enough){out.innerHTML=abstain(label,"There are not enough recent, independently sourced, individually traceable sold observations for this exact model and condition. Retail prices, unknown condition and broad family matches cannot establish a deal score.",x);return;}
 const ratio=p/ev.center,score=Math.round(Math.max(20,Math.min(99,120-ratio*70))),verdict=p<ev.low*.67?"POUNCE":p<ev.low*.82?"WORTH GRABBING":p<=ev.high?"WITHIN OBSERVED RANGE":"ABOVE OBSERVED RANGE";
 out.innerHTML=`<div class="resulttop"><div><span class="result-kicker">${esc(label)}</span><h3>${score} <small>Grab Score</small></h3></div><strong class="verdict">${verdict}</strong></div><div class="price-strip"><div><span>ASKING</span><b>${money(p)}</b></div><div><span>MIDDLE HALF OF OBSERVED SALES</span><b>${money(ev.low)}–${money(ev.high)}</b></div></div><div class="evidence"><b>${ev.comps.length} eligible sales · ${esc(condition)} condition · USD · past year</b><p>This is an observed sale range, not a guarantee. Inspect the equipment and account for fees, transport and local market differences.</p><ul>${ev.comps.map(c=>`<li><a href="${esc(saleIdentity(c).url)}" target="_blank" rel="noopener noreferrer">${esc(saleIdentity(c).source)} · ${esc(c.sold_at.slice(0,10))} · ${money(soldPrice(c))}</a></li>`).join("")}</ul></div>`;
}
$("#go").onclick=evaluate;
["title","price","condition","lotQty","unitWeight","totalWeight","listingUrl"].forEach(id=>{let el=$("#"+id);if(el)el.addEventListener("input",clearResult)});
const catalogReady=load();
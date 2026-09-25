const GKHU="https://dyvzrboshanctbjiukvh.supabase.co",GKHK="sb_publishable_ZKuyrkd9Rv7L-4HUXv_v-g_Ka5l9hSD";let homeGear=[];
const hq=s=>document.querySelector(s),hqa=s=>[...document.querySelectorAll(s)],hn=s=>String(s||"").toLowerCase();
async function homeLoad(){try{let r=await fetch(GKHU+"/rest/v1/equipment?select=id,brand,model,category,subtype,equipment_family,aliases&order=brand.asc,model.asc",{headers:{apikey:GKHK,Authorization:"Bearer "+GKHK}});homeGear=await r.json()}catch(e){}}
hqa(".home-entry").forEach(b=>b.onclick=()=>{hqa(".home-entry").forEach(x=>x.classList.remove("active"));hqa(".home-mode").forEach(x=>x.classList.remove("active"));b.classList.add("active");hq("#home"+(b.dataset.homeMode==="search"?"Search":"Link")).classList.add("active")});
hq("#title").addEventListener("input",e=>{let v=hn(e.target.value).trim();if(v.length<2){hq("#homeSuggestions").innerHTML="";return}let terms=v.split(/\s+/),a=homeGear.map(x=>{let hay=hn([x.brand,x.model,x.category,x.subtype,x.equipment_family,...(x.aliases||[])].join(" "));return{x,n:terms.filter(t=>hay.includes(t)).length}}).filter(z=>z.n).sort((a,b)=>b.n-a.n).slice(0,6);hq("#homeSuggestions").innerHTML=a.map(({x})=>`<button type="button" data-label="${x.brand} ${x.model}"><b>${x.brand} ${x.model}</b><span>${x.category}${x.subtype?" · "+x.subtype:""}</span></button>`).join("");hqa("#homeSuggestions button").forEach(b=>b.onclick=()=>{hq("#title").value=b.dataset.label;hq("#homeSuggestions").innerHTML=""})});
hq("#homeListingUrl").addEventListener("input",e=>{let u=e.target.value.trim();if(u)hq("#title").value=""});
homeLoad();
const homeGo=hq("#go");
homeGo.addEventListener("click",e=>{
  let linkActive=hq("#homeLink").classList.contains("active"),u=hq("#homeListingUrl").value.trim();
  if(linkActive&&u){
    e.preventDefault();e.stopImmediatePropagation();
    let qs=new URLSearchParams({url:u});let p=hq("#price").value.trim();if(p)qs.set("price",p);
    location.href="checker.html?"+qs.toString();
  }
},true);

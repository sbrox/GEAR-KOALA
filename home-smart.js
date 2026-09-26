const hq=s=>document.querySelector(s),hqa=s=>[...document.querySelectorAll(s)];
// Shared catalog picker keeps homepage search identical to Deal Checker while
// retaining the homepage's own suggestion container and layout.
bindCatalogSuggestions('#homeSuggestions');
hqa('.home-entry').forEach(b=>b.onclick=()=>{clearResult();hq('#title').value='';hq('#homeSuggestions').replaceChildren();hqa('.home-entry').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});hqa('.home-mode').forEach(x=>x.classList.remove('active'));hq('#home'+(b.dataset.homeMode==='search'?'Search':'Link')).classList.add('active');});
hq('#homeListingUrl').addEventListener('input',clearResult);
hq('#dealForm').addEventListener('submit',e=>{if(hq('#homeLink').classList.contains('active')){e.preventDefault();e.stopImmediatePropagation();const u=hq('#homeListingUrl').value.trim();if(!u){hq('#out').textContent='Enter a listing URL, or switch to equipment search.';return;}const params=new URLSearchParams({url:u});if(hq('#price').value.trim())params.set('price',hq('#price').value.trim());location.href='checker.html?'+params;}},true);

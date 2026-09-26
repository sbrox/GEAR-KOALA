import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allowedUrl,publicAddress,extractProduct} from '../listing-core.mjs';
test('both CommonJS API entry points load and reject unsupported URLs',async()=>{
 for(const path of ['../api/listing.js','../api/resolve-listing.js']){
  const {default:handler}=await import(path);
  const response={headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await handler({method:'GET',query:{url:'https://example.com/'}},response);
  assert.equal(response.code,400);assert.equal(response.body.ok,false);assert.equal(response.headers['Cache-Control'],'no-store');
 }
});
test('only supported credential-free HTTPS destinations',()=>{for(const u of ['http://hibid.com/lot/1','https://example.com','https://hibid.com.evil.test/lot/1','https://u:p@hibid.com/lot/1','https://hibid.com:444/lot/1','file:///etc/passwd',undefined,['https://hibid.com']])assert.throws(()=>allowedUrl(u));assert.equal(allowedUrl('https://foo.hibid.com/lot/1').hostname,'foo.hibid.com');});
test('private and special IP ranges rejected',()=>{for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','172.16.0.1','192.168.0.1','100.64.0.1','::1','::ffff:127.0.0.1','fc00::1','2001:db8::1','2002:7f00:1::'])assert.equal(publicAddress(ip),false,ip);assert.equal(publicAddress('8.8.8.8'),true);assert.equal(publicAddress('2606:4700:4700::1111'),true);});
const html=p=>'<script type="application/ld+json">'+JSON.stringify(p)+'</script>';
const product={'@type':'Product',name:'Rogue Echo Bike',offers:{'@type':'Offer',price:'350',priceCurrency:'USD',availability:'https://schema.org/InStock'}};
test('accept single product-bound current USD offer, never general dollar text',()=>{const u='https://hibid.com/lot/123';assert.equal(extractProduct(html(product),u).price,350);assert.throws(()=>extractProduct('<title>Catalog</title><p>Credit card limit $5,000</p>',u));assert.throws(()=>extractProduct(html(product),'https://proxibid.com/event-catalog/123'));assert.throws(()=>extractProduct('<title>Access Denied</title>'+html(product),u));assert.throws(()=>extractProduct(html([product,product]),u));});
test('missing currency, sold or ranged offers require manual price',()=>{for(const offers of [{...product.offers,priceCurrency:'AUD'},{...product.offers,availability:'https://schema.org/SoldOut'},{'@type':'AggregateOffer',lowPrice:100,highPrice:500},{...product.offers,url:'https://hibid.com/lot/456'}])assert.equal(extractProduct(html({...product,offers}),'https://hibid.com/lot/123').price,null);});

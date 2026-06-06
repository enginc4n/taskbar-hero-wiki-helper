var de=Object.defineProperty;var ue=(e,t,n)=>t in e?de(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var Q=(e,t,n)=>ue(e,typeof t!="symbol"?t+"":t,n);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))a(o);new MutationObserver(o=>{for(const s of o)if(s.type==="childList")for(const l of s.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&a(l)}).observe(document,{childList:!0,subtree:!0});function n(o){const s={};return o.integrity&&(s.integrity=o.integrity),o.referrerPolicy&&(s.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?s.credentials="include":o.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function a(o){if(o.ep)return;o.ep=!0;const s=n(o);fetch(o.href,s)}})();const O="https://www.taskbarherowiki.com/data",K="https://www.taskbarhero.wiki/data",G=new Map;async function I(e){return G.has(e)||G.set(e,fetch(e).then(t=>{if(!t.ok)throw new Error(`Failed to fetch ${e}: ${t.status}`);return t.json()})),G.get(e)}async function fe(){const[e,t,n,a,o]=await Promise.all([I(`${O}/items.json`),I(`${O}/heroes.json`),I(`${O}/effects.json`),I(`${O}/runes.json`),I(`${O}/meta.json`)]);return{items:e,heroes:t,effects:n,runes:a,meta:o}}async function pe(){const[e,t,n,a,o,s,l,r]=await Promise.all([I(`${K}/heroes.json`),I(`${K}/passive_skills.json`),I(`${K}/items.json`),I(`${K}/items_detail.json`),I(`${K}/gear_types.json`),I(`${K}/rune_tree.json`),I(`${K}/t/pets.json`),I(`${K}/t/pet_stats.json`)]);return{heroes:e,passives:t,items:n,itemsDetail:a,gearTypes:o,runeTree:s,pets:l,petStats:r}}async function me(){const[e,t]=await Promise.all([fe(),pe()]);return{...e,wiki:t}}const ve={weapon:["SWORD","AXE","BOW","CROSSBOW","SCEPTER","STAFF","HATCHET"],off_hand:["SHIELD","ARROW","ORB","BOLT","TOME"],armor:["ARMOR","HELMET","GLOVES","BOOTS"],accessory:["AMULET","EARING","RING","BRACER"]},W=["MAIN_WEAPON","SUB_WEAPON","HELMET","ARMOR","GLOVES","BOOTS","AMULET","EARING","RING","BRACER"],X={MAIN_WEAPON:"Weapon",SUB_WEAPON:"Off-hand",HELMET:"Helmet",ARMOR:"Armor",GLOVES:"Gloves",BOOTS:"Boots",AMULET:"Amulet",EARING:"Earring",RING:"Ring",BRACER:"Bracer"},oe={AttackDamage:1,AttackSpeed:2,CriticalChance:3,CriticalDamage:4,MaxHp:5,Armor:6,MovementSpeed:7,AreaOfEffect:8,BaseAttackCountReduction:9,CooldownReduction:10,FireResistance:12,ColdResistance:13,LightningResistance:14,ChaosResistance:15,DodgeChance:16,BlockChance:17,PhysicalDamagePercent:24,FireDamagePercent:25,ColdDamagePercent:26,LightningDamagePercent:27,ChaosDamagePercent:28,AddHpPerHit:33,DamageReduction:34,CastSpeed:49,AllElementalResistance:52,IncreaseProjectileDamage:53,IncreaseMeleeDamage:54,IncreaseAreaOfEffectDamage:55,HpRegenPerSec:23,HpLeech:21,Multistrike:20,ProjectileCount:22},ye=Object.fromEntries(Object.entries(oe).map(([e,t])=>[t,e])),se={grade:"ALL",category:"all",levelMin:1,levelMax:100,search:"",obtainableOnly:!1};function re(e,t){return e.filter(n=>{if(n.type!=="GEAR"||t.grade!=="ALL"&&n.grade!==t.grade||t.obtainableOnly&&n.obtainable===!1)return!1;const a=n.level??0;if(a<t.levelMin||a>t.levelMax)return!1;if(t.category!=="all"){const o=ve[t.category];if(!n.gearType||!o.includes(n.gearType))return!1}if(t.search.trim()){const o=t.search.trim().toLowerCase();if(!n.name.toLowerCase().includes(o))return!1}return!0})}function ge(e,t,n=60){return e.slice(0,t*n)}function Se(e){var n;const t=((n=e.stats)==null?void 0:n.inherent)??[];return t.length===0?"":t.map(a=>a.disp??`${a.stat} ${a.value}`).join(" · ")}function he(e){return`grade-${e.toLowerCase()}`}function be(e,t){var l;let n={...se},a=1;(l=t.meta.gearLevels)!=null&&l.length&&(n.levelMin=t.meta.gearLevels[0],n.levelMax=t.meta.gearLevels[t.meta.gearLevels.length-1]);const o=t.items.filter(r=>r.type==="GEAR");function s(){var p,v;const r=re(o,n),c=ge(r,a,60);e.innerHTML=`
      <div class="panel">
        <h2>Gear Database</h2>
        <p class="small">Loads from taskbarherowiki.com/data/items.json — client-side filter and pagination (same approach as taskbarhero.wiki/gear).</p>
        <div class="filters">
          <label>Rarity
            <select data-field="grade">
              <option value="ALL">All</option>
              ${t.meta.grades.map(d=>`<option value="${d}" ${n.grade===d?"selected":""}>${d[0]+d.slice(1).toLowerCase()}</option>`).join("")}
            </select>
          </label>
          <label>Type
            <select data-field="category">
              <option value="all">All</option>
              <option value="weapon">Weapon</option>
              <option value="off_hand">Off-hand</option>
              <option value="armor">Armor</option>
              <option value="accessory">Accessory</option>
            </select>
          </label>
          <label>Level min
            <input type="number" data-field="levelMin" value="${n.levelMin}" min="1" max="100" />
          </label>
          <label>Level max
            <input type="number" data-field="levelMax" value="${n.levelMax}" min="1" max="100" />
          </label>
          <label>Search
            <input type="search" data-field="search" value="${n.search}" placeholder="Item name" />
          </label>
          <label style="flex-direction:row;align-items:center;gap:0.5rem;margin-top:1.4rem;">
            <input type="checkbox" data-field="obtainableOnly" ${n.obtainableOnly?"checked":""} />
            Obtainable only
          </label>
        </div>
        <p class="small">${r.length.toLocaleString()} results · showing ${c.length.toLocaleString()}</p>
        <div class="gear-grid">
          ${c.map(d=>{const h=Se(d);return`
                <article class="gear-card${d.obtainable===!1?" unobtainable":""}">
                  <h3 class="${he(d.grade)}">${d.name}${d.variant?` (${d.variant})`:""}</h3>
                  <div class="meta">${d.grade} · Lv${d.level??"?"} · ${d.gearType??"Gear"}</div>
                  ${h?`<div class="meta">${h}</div>`:""}
                  ${d.obtainable===!1?'<div class="meta">No longer obtainable</div>':""}
                  ${d.slots?`<div class="meta">Sockets D${d.slots.decoration} E${d.slots.engraving} I${d.slots.inscription}</div>`:""}
                </article>`}).join("")}
        </div>
        ${c.length<r.length?`<div style="margin-top:1rem"><button class="primary" data-action="load-more">Load more (${(r.length-c.length).toLocaleString()} left)</button></div>`:""}
      </div>
    `,(p=e.querySelector('[data-field="category"]'))==null||p.addEventListener("change",d=>{n.category=d.target.value,a=1,s()});for(const d of e.querySelectorAll("[data-field]"))d.getAttribute("data-field")!=="category"&&d.addEventListener("input",()=>{const h=d.getAttribute("data-field");h==="obtainableOnly"?n.obtainableOnly=d.checked:h==="grade"?n.grade=d.value:h==="search"?n.search=d.value:h==="levelMin"?n.levelMin=Number(d.value):h==="levelMax"&&(n.levelMax=Number(d.value)),a=1,s()});(v=e.querySelector('[data-action="load-more"]'))==null||v.addEventListener("click",()=>{a+=1,s()})}s()}function Ae(e){const t=new Map;for(const n of e.petStats){const a=n.PetKey;if(a==null)continue;const o=t.get(a)??[];o.push(n),t.set(a,o)}return{heroByKey:new Map(e.heroes.map(n=>[n.HeroKey,n])),passiveByKey:new Map(e.passives.map(n=>[n.PassiveSkillKey,n])),itemById:new Map(e.items.map(n=>[n.id,n])),itemDetailById:new Map(Object.entries(e.itemsDetail)),gearTypeByName:new Map(e.gearTypes.map(n=>[n.GearType,n])),runeNodeByKey:new Map(e.runeTree.nodes.map(n=>[n.key,n])),petByKey:new Map(e.pets.map(n=>[n.PetKey,n])),petStatsByKey:t}}function Ee(e){const t={HeroKey:e.key,attributes:[]};for(const n of e.stats)t[n.stat]=n.value;for(const n of e.tree)for(const a of n.nodes)a.kind!=="passive"||!a.stat||a.stat==="NONE"||t.attributes.push({key:a.key,type:"PASSIVESKILL"});return t}function ke(e){const t=new Map;for(const n of e)for(const a of n.tree)for(const o of a.nodes){if(o.kind!=="passive"||!o.stat||o.stat==="NONE")continue;const s=parseFloat((o.perPoint??"+0").replace(/[^0-9.-]/g,""))||0;t.set(o.key,{PassiveSkillKey:o.key,STATTYPE:o.stat,MODTYPE:o.mod??"FLAT",Value:s})}return t}function Te(e){return{id:e.key,name:e.name,grade:e.grade,type:e.type,gear:e.gearType??null,level:e.level??null,deleted:e.obtainable===!1}}function Y(e){var o,s,l,r,c,p;if(!((s=(o=e.stats)==null?void 0:o.base)!=null&&s.length)&&!((r=(l=e.stats)==null?void 0:l.inherent)!=null&&r.length))return null;const t={GearKey:e.key},n=((c=e.stats)==null?void 0:c.base)??[];n[0]&&(t.BaseStat1_STATTYPE=n[0].stat,t.BaseStat1_MODTYPE=String(n[0].mod),t.BaseStat1_Value=n[0].value),n[1]&&(t.BaseStat2_STATTYPE=n[1].stat,t.BaseStat2_MODTYPE=String(n[1].mod),t.BaseStat2_Value=n[1].value);const a=((p=e.stats)==null?void 0:p.inherent)??[];for(let v=0;v<Math.min(3,a.length);v++){const d=a[v],h=v+1;t[`InherentStat${h}_STATTYPE`]=d.stat,t[`InherentStat${h}_MODTYPE`]=d.mod,t[`InherentStat${h}_Value`]=d.value}return{stats:t}}function $e(e,t){const n=new Map(e.itemById),a=new Map(e.itemDetailById),o=new Map(e.heroByKey),s=new Map(e.passiveByKey),l=new Map(e.runeNodeByKey);for(const r of t.items){n.set(r.key,Te(r));const c=Y(r);c&&a.set(String(r.key),c)}for(const r of t.heroes)o.set(r.key,Ee(r));for(const[r,c]of ke(t.heroes))s.has(r)||s.set(r,c);for(const r of t.runes.runes){if(!r.stat)continue;const c=(r.levels??[]).map(p=>({level:p.level,value:typeof p.value=="number"?p.value:parseFloat(String(p.value).replace(/[^0-9.-]/g,""))||0}));l.set(r.key,{key:r.key,stat:r.stat,levels:c})}return{...e,itemById:n,itemDetailById:a,heroByKey:o,passiveByKey:s,runeNodeByKey:l}}const ie={AttackDamage:{scale:1,fmt:"int"},MaxHp:{scale:1,fmt:"int"},Armor:{scale:1,fmt:"int"},AttackSpeed:{scale:100,fmt:"spd"},CastSpeed:{scale:100,fmt:"spd"},MovementSpeed:{scale:100,fmt:"move"},CriticalChance:{scale:1e3,fmt:"pct1"},CriticalDamage:{scale:1e3,fmt:"pctI"},CooldownReduction:{scale:1e3,fmt:"pct1"}},De={AreaOfEffect:1e3,IncreaseExpAmount:1e3,IncreaseGoldAmount:1e3},Ie={AllHeroAttackDamage:{stat:"AttackDamage",mod:"FLAT"},AllHeroAttackDamagePercent:{stat:"AttackDamage",mod:"ADDITIVE"},AllHeroArmor:{stat:"Armor",mod:"FLAT"},AllHeroArmorPercent:{stat:"Armor",mod:"ADDITIVE"},AllHeroAttackSpeed:{stat:"AttackSpeed",mod:"ADDITIVE"},AllHeroMoveSpeed:{stat:"MovementSpeed",mod:"ADDITIVE"}},we=[["AttackDamage","AttackDamage"],["AttackSpeed","AttackSpeed"],["CriticalChance","CriticalChance"],["CriticalDamage","CriticalDamage"],["MaxHp","MaxHp"],["Armor","Armor"],["MovementSpeed","MovementSpeed"],["CooldownReduction","CooldownReduction"],["CastSpeed","CastSpeed"]],le=["AttackDamage","AttackSpeed","CriticalChance","CriticalDamage","MaxHp","Armor","MovementSpeed","CooldownReduction","CastSpeed"];function Le(e){var t;return((t=ie[e])==null?void 0:t.scale)??1}function Me(e,t){if(!e.levels)return 0;const n=new Set;let a=0;for(const o of e.levels)o.level<=t&&!n.has(o.level)&&(n.add(o.level),a+=o.value??0);return a}function R(e){return e==="ADDITIVE"||e===1?"ADDITIVE":e==="MULTIPLICATIVE"||e===2?"MULTIPLICATIVE":"FLAT"}function Pe(e,t,n){const a=[],o=n.heroByKey.get(e.heroKey);if(o)for(const[r,c]of we)a.push({stat:r,mod:"FLAT",raw:o[c]??0,src:"base"});const s=new Map((t.attributeSaveDatas??[]).map(r=>[r.Key,r.Level]));for(const r of(o==null?void 0:o.attributes)??[]){if(r.type!=="PASSIVESKILL")continue;const c=s.get(r.key)??0;if(c<=0)continue;const p=n.passiveByKey.get(r.key);!p||p.STATTYPE==="NONE"||a.push({stat:p.STATTYPE,mod:R(p.MODTYPE),raw:(p.Value??0)*c,src:"attr"})}for(const r of t.RuneSaveData??[]){if(r.Level<=0)continue;const c=n.runeNodeByKey.get(r.RuneKey),p=c!=null&&c.stat?Ie[c.stat]:void 0;p&&c&&a.push({stat:p.stat,mod:p.mod,raw:Me(c,r.Level),src:"rune"})}if(n.petByKey&&n.petStatsByKey)for(const r of t.PetSaveData??[]){if(!r.IsUnlock)continue;const c=n.petByKey.get(r.PetKey),p=n.petStatsByKey.get((c==null?void 0:c.StatDataKey)??r.PetKey)??[];for(const v of p)!v.STATTYPE||v.STATTYPE==="NONE"||a.push({stat:v.STATTYPE,mod:R(v.MODTYPE),raw:v.Value??0,src:"pet"})}const l=new Map(t.itemSaveDatas.map(r=>[String(r.UniqueId),r]));for(const r of e.equippedItemIds){if(!r)continue;const c=l.get(String(r));if(!c)continue;const p=n.itemById.get(c.ItemKey),v=n.itemDetailById.get(c.ItemKey)??n.itemDetailById.get(String(c.ItemKey)),d=v==null?void 0:v.stats,h=p!=null&&p.gear?n.gearTypeByName.get(p.gear):void 0;if(d&&h&&(h.BaseStat1_STATTYPE&&h.BaseStat1_STATTYPE!=="NONE"&&a.push({stat:h.BaseStat1_STATTYPE,mod:R(h.BaseStat1_MODTYPE),raw:d.BaseStat1_Value??0,src:"gear"}),h.BaseStat2_STATTYPE&&h.BaseStat2_STATTYPE!=="NONE"&&a.push({stat:h.BaseStat2_STATTYPE,mod:R(h.BaseStat2_MODTYPE),raw:d.BaseStat2_Value??0,src:"gear"})),d)for(const w of[1,2,3]){const P=d[`InherentStat${w}_STATTYPE`];!P||P==="NONE"||a.push({stat:P,mod:R(d[`InherentStat${w}_MODTYPE`]),raw:d[`InherentStat${w}_Value`]??0,src:"gear"})}for(const w of c.EnchantData??[]){if(!w.StatType)continue;const P=ye[w.StatType];P&&a.push({stat:P,mod:w.ModType===1?"ADDITIVE":w.ModType===2?"MULTIPLICATIVE":"FLAT",raw:w.Value??0,src:"enchant"})}}return a}function Be(e,t){const n=Le(e);let a=(De[e]??0)/n,o=0,s=1;for(const l of t)l.stat===e&&(l.mod==="ADDITIVE"?o+=l.raw/1e3:l.mod==="MULTIPLICATIVE"?s*=1+l.raw/1e3:a+=l.raw/n);return(a+o*a)*s}function Z(e,t,n){const a=Pe(e,t,n),o={};for(const s of le)o[s]=Be(s,a);return o}function ee(e){return e.AttackDamage*e.AttackSpeed*(1+e.CriticalChance*(e.CriticalDamage-1))}function Ke(e,t){return le.map(n=>{const a=e[n],o=t[n];return{name:n,baseline:a,current:o,delta:o-a,deltaPct:a===0?o===0?0:100:(o/a-1)*100}})}function C(e,t){var a;switch(((a=ie[e])==null?void 0:a.fmt)??"int"){case"spd":return t.toFixed(2);case"pct1":return`${(t*100).toFixed(1)}%`;case"pctI":return`${Math.round(t*100)}%`;default:return Math.round(t).toLocaleString()}}function Oe(e){const t=e.delta>=0?"+":"",n=Number.isFinite(e.deltaPct)?` (${t}${e.deltaPct.toFixed(1)}%)`:"";return`${t}${C(e.name,Math.abs(e.delta))}${n}`}const q="emuMqG3bLYJ938ZDCfieWJ",Re={file_too_small:"File is too small to be an .es3 save.",decryption_failed:"Decryption failed: wrong password or not a TaskbarHero save. The password can change after a game update.",invalid_json:"Decrypted data is not valid JSON."};class H extends Error{constructor(n){super(Re[n]);Q(this,"code");this.name="SaveFileError",this.code=n}}function Ce(e){return e instanceof H}async function Ne(e,t){const n=await crypto.subtle.importKey("raw",new TextEncoder().encode(e),{name:"PBKDF2"},!1,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt:t,iterations:100,hash:"SHA-1"},n,{name:"AES-CBC",length:128},!1,["decrypt"])}async function _e(e,t=q){const n=e instanceof Uint8Array?e:new Uint8Array(e);if(n.length<=16)throw new H("file_too_small");const a=n.slice(0,16),o=n.slice(16),s=await Ne(t,a);let l;try{l=await crypto.subtle.decrypt({name:"AES-CBC",iv:a},s,o)}catch{throw new H("decryption_failed")}return new TextDecoder("utf-8").decode(l)}function F(e){if(e&&typeof e=="object"&&"value"in e){const t=e.value;if(typeof t=="string"){const n=t.trim();if(n.startsWith("{")||n.startsWith("["))try{return JSON.parse(n)}catch{return t}return t}return t}return e}function xe(e){let t;try{t=JSON.parse(e)}catch{throw new H("invalid_json")}return{PlayerSaveData:F(t.PlayerSaveData),AccountSaveData:F(t.AccountSaveData),SystemInfo:F(t.SystemInfo),_raw:t}}async function qe(e,t=q){const n=await _e(e,t.trim()||q);return xe(n)}let He=1e6;function _(e){return structuredClone(e)}function x(e){return{heroSaveDatas:[{heroKey:e,IsUnLock:!0,Level:1,Exp:0,equippedItemIds:new Array(W.length).fill(null)}],itemSaveDatas:[],RuneSaveData:[],attributeSaveDatas:[],PetSaveData:[],currenySaveDatas:[{Key:100001,Quantity:0}],commonSaveData:{arrangedHeroKey:[e]},inventorySaveDatas:[]}}function j(e,t){return e.heroSaveDatas.find(n=>n.heroKey===t)}function U(e){return W.indexOf(e)}function Ge(e,t,n,a,o){const s=U(n);if(a.parts&&a.parts!==n)throw new Error(`${a.name} cannot be equipped in ${n}`);const l=He++,r={UniqueId:l,ItemKey:a.key,EnchantData:[]};e.itemSaveDatas.push(r),t.equippedItemIds[s]=l,o.set(a.key,a)}function Fe(e){return e==="ADDITIVE"?1:e==="MULTIPLICATIVE"?2:0}function je(e,t){return{StatModKey:0,StatType:oe[e.stat]??0,ModType:Fe(e.mod),Value:t}}function ce(e,t){const n=t.gearGroup==="WEAPON"?"Weapon":t.gearGroup==="ARMOR"?"Armor":t.gearGroup==="ACCESSORY"?"Accessory":"All";return e.category==="INSCRIPTION"?e.groups.filter(a=>a.slot==="All"||a.slot===n):e.groups.filter(a=>a.slot===n)}function Ve(e){const t=e.slots??{decoration:0,engraving:0,inscription:0};return[{category:"DECORATION",count:t.decoration},{category:"ENGRAVING",count:t.engraving},{category:"INSCRIPTION",count:t.inscription}].filter(a=>a.count>0)}function Ye(e,t,n,a){const o=[];for(const s of n){if(s.materialKey==null)continue;const l=a.get(s.materialKey);if(!l)continue;const r=ce(l,t),c=r[s.groupIndex]??r[0];if(!c)continue;const p=s.roll==="min"?c.min:s.roll==="max"?c.max:(c.min+c.max)/2;o.push(je(c,p))}e.EnchantData=o}function te(e,t,n,a){const o=Math.max(0,Math.min(a,n)),s=e.attributeSaveDatas??[],l=s.findIndex(r=>r.Key===t);l>=0?o===0?s.splice(l,1):s[l].Level=o:o>0&&s.push({Key:t,Level:o}),e.attributeSaveDatas=s}function ae(e,t,n,a){const o=e.RuneSaveData??[],s=o.findIndex(r=>r.RuneKey===t),l=Math.max(0,Math.min(a,n));s>=0?l===0?o.splice(s,1):o[s].Level=l:l>0&&o.push({RuneKey:t,Level:l}),e.RuneSaveData=o}function V(e,t){var n,a;return((a=(n=e.RuneSaveData)==null?void 0:n.find(o=>o.RuneKey===t))==null?void 0:a.Level)??0}function Ue(e){return new Map(e.map(t=>[t.key,t]))}function We(e){return e.tree.flatMap(t=>t.nodes.filter(n=>n.kind==="passive"&&n.stat&&n.stat!=="NONE"))}function ne(e,t){const n=Ue(t);for(const a of e.itemSaveDatas)if(!n.has(a.ItemKey)){const o=t.find(s=>s.key===a.ItemKey);o&&n.set(a.ItemKey,o)}return n}function Je(e,t){var P,J,z;const n=$e(Ae(t.wiki),{items:t.items,heroes:t.heroes,runes:t.runes}),a={baseline:null,working:x(((P=t.heroes[0])==null?void 0:P.key)??101),heroKey:((J=t.heroes[0])==null?void 0:J.key)??101,refs:n,itemsByKey:ne(x(((z=t.heroes[0])==null?void 0:z.key)??101),t.items),effectsByKey:new Map(t.effects.map(u=>[u.key,u])),socketDraft:new Map};function o(){return t.heroes.find(u=>u.key===a.heroKey)}function s(){return j(a.working,a.heroKey)}function l(){const u=s();if(!u)return"";const m=Z(u,a.working,a.refs),A=ee(m),k=a.baseline?j(a.baseline,a.heroKey):null,i=k?Z(k,a.baseline,a.refs):m,g=ee(i),S=Ke(i,m).find($=>$.name==="AttackDamage"),b=A-g,E=g===0?0:(A/g-1)*100;return`
      <div class="stats-bar">
        <div class="stat-box">
          <div class="label">Attack Damage</div>
          <div class="value">${C("AttackDamage",m.AttackDamage)}</div>
          ${a.baseline&&S?`<div class="delta ${S.delta>=0?"positive":"negative"}">${Oe(S)}</div>`:""}
        </div>
        <div class="stat-box">
          <div class="label">Basic Attack DPS</div>
          <div class="value">${Math.round(A).toLocaleString()}</div>
          ${a.baseline?`<div class="delta ${b>=0?"positive":"negative"}">${b>=0?"+":""}${Math.round(b).toLocaleString()} (${E>=0?"+":""}${E.toFixed(1)}%)</div>`:""}
        </div>
        <div class="stat-box"><div class="label">Attack Speed</div><div class="value">${C("AttackSpeed",m.AttackSpeed)}</div></div>
        <div class="stat-box"><div class="label">Crit</div><div class="value">${C("CriticalChance",m.CriticalChance)} / ${C("CriticalDamage",m.CriticalDamage)}</div></div>
      </div>`}function r(){const u=s();return u?W.map(m=>{const A=u.equippedItemIds[U(m)],k=A?a.working.itemSaveDatas.find(T=>String(T.UniqueId)===String(A)):null,i=k?a.itemsByKey.get(k.ItemKey):void 0,g=i?`${i.name}${i.variant?` (${i.variant})`:""}`:"Empty";return`
        <div class="slot-row">
          <div><strong>${X[m]}</strong><div class="small">${g}</div></div>
          <div>
            <button data-action="pick-gear" data-part="${m}">Change</button>
            ${i?`<button data-action="edit-sockets" data-part="${m}">Sockets</button>`:""}
          </div>
        </div>`}).join(""):""}function c(){const u=o();return u?We(u).map(m=>{var k,i;const A=((i=(k=a.working.attributeSaveDatas)==null?void 0:k.find(g=>g.Key===m.key))==null?void 0:i.Level)??0;return`
          <div class="passive-row">
            <div><strong>${m.stat}</strong><div class="small">${m.perPoint??""} per level · max ${m.maxLevel??1}</div></div>
            <div>
              <button data-action="passive-dec" data-key="${m.key}">-</button>
              <span>${A}</span>
              <button data-action="passive-inc" data-key="${m.key}" data-max="${m.maxLevel??1}">+</button>
            </div>
          </div>`}).join(""):""}function p(){return t.runes.runes.slice(0,40).map(u=>{const m=V(a.working,u.key),A=u.maxLevel??1;return`
          <div class="rune-row">
            <div><strong>${u.name}</strong><div class="small">${u.stat??""}</div></div>
            <div>
              <button data-action="rune-dec" data-key="${u.key}">-</button>
              <span>${m}/${A}</span>
              <button data-action="rune-inc" data-key="${u.key}" data-max="${A}">+</button>
            </div>
          </div>`}).join("")}function v(){e.innerHTML=`
      <div class="toolbar">
        <label class="small">Load save (.es3)
          <input type="file" accept=".es3,.bak" data-action="load-save" />
        </label>
        <button data-action="new-build">New Build</button>
        <button data-action="set-baseline">Set Baseline</button>
        <label>Hero
          <select data-action="hero-select">
            ${t.heroes.map(u=>`<option value="${u.key}" ${u.key===a.heroKey?"selected":""}>${u.name}</option>`).join("")}
          </select>
        </label>
      </div>
      ${l()}
      <div class="sim-layout">
        <div class="panel">
          <h3>Gear</h3>
          <div class="slot-list">${r()}</div>
        </div>
        <div>
          <div class="panel" style="margin-bottom:1rem">
            <h3>Passives</h3>
            <div class="passive-list">${c()}</div>
          </div>
          <div class="panel">
            <h3>Runes</h3>
            <p class="small">Showing first 40 rune nodes.</p>
            <div class="rune-list">${p()}</div>
          </div>
        </div>
      </div>
      <div id="sim-modal"></div>
    `,w()}function d(u){const m=o();if(!m)return;let A={...se},k=1;const i=e.querySelector("#sim-modal");function g(S){var b;return!(S.type!=="GEAR"||S.parts&&S.parts!==u||(b=S.classes)!=null&&b.length&&!S.classes.includes(m.class))}function T(){var $,y;const S=t.items.filter(g),b=re(S,A),E=b.slice(0,k*40);i.innerHTML=`
        <div class="modal-backdrop" data-action="close-modal">
          <div class="modal">
            <div class="modal-header">
              <h3>Pick ${X[u]}</h3>
              <button data-action="close-modal">Close</button>
            </div>
            <div class="filters">
              <label>Grade<select data-field="grade"><option value="ALL">All</option>${t.meta.grades.map(f=>`<option value="${f}">${f}</option>`).join("")}</select></label>
              <label>Search<input data-field="search" value="${A.search}" /></label>
              <label style="flex-direction:row;align-items:center;gap:0.5rem;margin-top:1.4rem;"><input type="checkbox" data-field="obtainableOnly" ${A.obtainableOnly?"checked":""}/> Obtainable</label>
            </div>
            <div class="gear-grid">
              ${E.map(f=>`
                <article class="gear-card">
                  <h3>${f.name}${f.variant?` (${f.variant})`:""}</h3>
                  <div class="meta">${f.grade} Lv${f.level}</div>
                  <button data-action="equip" data-key="${f.key}">Equip</button>
                </article>`).join("")}
            </div>
            ${E.length<b.length?'<button data-action="more">More</button>':""}
          </div>
        </div>`,($=i.querySelector(".modal"))==null||$.addEventListener("click",f=>f.stopPropagation()),i.querySelectorAll('[data-action="close-modal"]').forEach(f=>{f.addEventListener("click",()=>{i.innerHTML=""})}),i.querySelectorAll('[data-action="equip"]').forEach(f=>{f.addEventListener("click",()=>{const L=Number(f.getAttribute("data-key")),D=a.itemsByKey.get(L)??t.items.find(N=>N.key===L),B=s();if(!D||!B)return;a.itemsByKey.set(D.key,D),Ge(a.working,B,u,D,a.itemsByKey);const M=Y(D);M&&a.refs.itemDetailById.set(String(D.key),M),i.innerHTML="",v()})}),(y=i.querySelector('[data-action="more"]'))==null||y.addEventListener("click",()=>{k+=1,T()}),i.querySelectorAll("[data-field]").forEach(f=>{f.addEventListener("input",()=>{const L=f.getAttribute("data-field");L==="grade"&&(A.grade=f.value),L==="search"&&(A.search=f.value),L==="obtainableOnly"&&(A.obtainableOnly=f.checked),k=1,T()})})}T()}function h(u){const m=s();if(!m)return;const A=m.equippedItemIds[U(u)],k=a.working.itemSaveDatas.find(E=>String(E.UniqueId)===String(A)),i=k?a.itemsByKey.get(k.ItemKey):void 0;if(!k||!i)return;const g=String(k.UniqueId);if(!a.socketDraft.has(g)){const E=[];for(const{category:$,count:y}of Ve(i))for(let f=0;f<y;f++)E.push({category:$,index:f,materialKey:null,groupIndex:0,roll:"max"});a.socketDraft.set(g,E)}const T=a.socketDraft.get(g),S=e.querySelector("#sim-modal");function b(){var E,$;S.innerHTML=`
        <div class="modal-backdrop" data-action="close-modal">
          <div class="modal">
            <div class="modal-header">
              <h3>Sockets — ${i.name}</h3>
              <button data-action="close-modal">Close</button>
            </div>
            ${T.map((y,f)=>{const L=t.effects.filter(M=>M.category===y.category),D=y.materialKey?a.effectsByKey.get(y.materialKey):null,B=D?ce(D,i):[];return`
                  <div class="socket-editor">
                    <strong>${y.category} ${y.index+1}</strong>
                    <label>Material
                      <select data-slot="${f}" data-field="material">
                        <option value="">— Empty —</option>
                        ${L.map(M=>`<option value="${M.key}" ${y.materialKey===M.key?"selected":""}>${M.name}</option>`).join("")}
                      </select>
                    </label>
                    ${B.length>1?`<label>Stat option<select data-slot="${f}" data-field="group">${B.map((M,N)=>`<option value="${N}" ${y.groupIndex===N?"selected":""}>${M.stat} ${M.disp??""}</option>`).join("")}</select></label>`:""}
                    <label>Roll<select data-slot="${f}" data-field="roll">
                      <option value="min" ${y.roll==="min"?"selected":""}>Min</option>
                      <option value="mid" ${y.roll==="mid"?"selected":""}>Mid</option>
                      <option value="max" ${y.roll==="max"?"selected":""}>Max</option>
                    </select></label>
                  </div>`}).join("")}
            <button class="primary" data-action="apply-sockets">Apply & Recompute</button>
          </div>
        </div>`,(E=S.querySelector(".modal"))==null||E.addEventListener("click",y=>y.stopPropagation()),S.querySelectorAll('[data-action="close-modal"]').forEach(y=>{y.addEventListener("click",()=>{S.innerHTML=""})}),S.querySelectorAll("[data-field]").forEach(y=>{y.addEventListener("change",()=>{const f=Number(y.getAttribute("data-slot")),L=y.getAttribute("data-field"),D=T[f];if(L==="material"){const B=y.value;D.materialKey=B?Number(B):null,D.groupIndex=0}else L==="group"?D.groupIndex=Number(y.value):L==="roll"&&(D.roll=y.value)})}),($=S.querySelector('[data-action="apply-sockets"]'))==null||$.addEventListener("click",()=>{!k||!i||(Ye(k,i,T,a.effectsByKey),S.innerHTML="",v())})}b()}function w(){var u,m,A,k;(u=e.querySelector('[data-action="load-save"]'))==null||u.addEventListener("change",async i=>{var T,S;const g=(T=i.target.files)==null?void 0:T[0];if(g)try{const b=await qe(await g.arrayBuffer(),q);a.working=_(b.PlayerSaveData),a.baseline=_(b.PlayerSaveData),a.heroKey=((S=a.working.heroSaveDatas.find(E=>E.IsUnLock))==null?void 0:S.heroKey)??a.heroKey,a.itemsByKey=ne(a.working,t.items);for(const E of a.working.itemSaveDatas){const $=a.itemsByKey.get(E.ItemKey),y=$?Y($):null;y&&a.refs.itemDetailById.set(String(E.ItemKey),y)}v()}catch(b){alert(Ce(b)?b.message:String(b))}}),(m=e.querySelector('[data-action="new-build"]'))==null||m.addEventListener("click",()=>{a.working=x(a.heroKey),a.baseline=_(a.working),v()}),(A=e.querySelector('[data-action="set-baseline"]'))==null||A.addEventListener("click",()=>{a.baseline=_(a.working),v()}),(k=e.querySelector('[data-action="hero-select"]'))==null||k.addEventListener("change",i=>{a.heroKey=Number(i.target.value),j(a.working,a.heroKey)||a.working.heroSaveDatas.push(...x(a.heroKey).heroSaveDatas),v()}),e.querySelectorAll('[data-action="pick-gear"]').forEach(i=>{i.addEventListener("click",()=>d(i.getAttribute("data-part")))}),e.querySelectorAll('[data-action="edit-sockets"]').forEach(i=>{i.addEventListener("click",()=>h(i.getAttribute("data-part")))}),e.querySelectorAll('[data-action="passive-inc"]').forEach(i=>{i.addEventListener("click",()=>{var b,E;const g=Number(i.getAttribute("data-key")),T=Number(i.getAttribute("data-max")),S=((E=(b=a.working.attributeSaveDatas)==null?void 0:b.find($=>$.Key===g))==null?void 0:E.Level)??0;te(a.working,g,S+1,T),v()})}),e.querySelectorAll('[data-action="passive-dec"]').forEach(i=>{i.addEventListener("click",()=>{var S,b;const g=Number(i.getAttribute("data-key")),T=((b=(S=a.working.attributeSaveDatas)==null?void 0:S.find(E=>E.Key===g))==null?void 0:b.Level)??0;te(a.working,g,T-1,999),v()})}),e.querySelectorAll('[data-action="rune-inc"]').forEach(i=>{i.addEventListener("click",()=>{const g=Number(i.getAttribute("data-key")),T=Number(i.getAttribute("data-max"));ae(a.working,g,V(a.working,g)+1,T),v()})}),e.querySelectorAll('[data-action="rune-dec"]').forEach(i=>{i.addEventListener("click",()=>{const g=Number(i.getAttribute("data-key"));ae(a.working,g,V(a.working,g)-1,999),v()})})}v()}async function ze(){const e=document.querySelector("#app");if(!e)return;e.innerHTML=`
    <header class="app-header">
      <h1>TBH Wiki Helper</h1>
      <nav class="tabs">
        <button data-tab="gear" class="active">Gear Database</button>
        <button data-tab="simulator">Build Simulator</button>
      </nav>
    </header>
    <main id="content"><div class="loading">Loading game data from taskbarherowiki.com and taskbarhero.wiki…</div></main>
  `;const t=e.querySelector("#content");let n="gear",a=null;function o(){a&&(n==="gear"?be(t,{items:a.items,meta:a.meta}):Je(t,{items:a.items,heroes:a.heroes,effects:a.effects,runes:a.runes,meta:a.meta,wiki:a.wiki}))}e.querySelectorAll("[data-tab]").forEach(s=>{s.addEventListener("click",()=>{n=s.getAttribute("data-tab"),e.querySelectorAll("[data-tab]").forEach(l=>l.classList.remove("active")),s.classList.add("active"),o()})});try{a=await me(),o()}catch(s){t.innerHTML=`<div class="error">Failed to load data: ${s instanceof Error?s.message:String(s)}</div>`}}ze();

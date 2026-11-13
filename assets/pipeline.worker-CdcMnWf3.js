(function(){var e=class extends Error{complete;constructor(e,t){super(e,t),this.name=`GAEBParseError`,this.complete=t?.complete??!1}},t=class extends Error{complete;constructor(e,t){super(e,t),this.name=`GAEBValidationError`,this.complete=t?.complete??!1}},n=class extends Error{complete;constructor(e,t){super(e,t),this.name=`GAEBVersionError`,this.complete=t?.complete??!1}};let r=new Uint32Array([1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298]),i=Array.from({length:256},(e,t)=>t.toString(16).padStart(2,`0`));function a(e,t){return e>>>t|e<<32-t}let o=new Uint32Array(64),s=new Uint32Array(8),c=new Uint8Array(128);function l(e,t){let n=o;for(let r=0,i=t;r<16;r++,i+=4)n[r]=e[i]<<24|e[i+1]<<16|e[i+2]<<8|e[i+3];for(let e=16;e<64;e++){let t=a(n[e-15],7)^a(n[e-15],18)^n[e-15]>>>3,r=a(n[e-2],17)^a(n[e-2],19)^n[e-2]>>>10;n[e]=n[e-16]+t+n[e-7]+r|0}let i=s,c=i[0],l=i[1],u=i[2],d=i[3],f=i[4],p=i[5],m=i[6],h=i[7];for(let e=0;e<64;e++){let t=a(f,6)^a(f,11)^a(f,25),i=f&p^~f&m,o=h+t+i+r[e]+n[e]|0,s=(a(c,2)^a(c,13)^a(c,22))+(c&l^c&u^l&u)|0;h=m,m=p,p=f,f=d+o|0,d=u,u=l,l=c,c=o+s|0}i[0]+=c,i[1]+=l,i[2]+=u,i[3]+=d,i[4]+=f,i[5]+=p,i[6]+=m,i[7]+=h}function u(e){s.set([1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225]);let t=e.length&-64;for(let n=0;n<t;n+=64)l(e,n);let n=e.length-t,r=n+9>64?128:64;c.fill(0),c.set(e.subarray(t)),c[n]=128;let a=Math.floor(e.length/536870912),o=e.length*8>>>0;c[r-8]=a>>>24,c[r-7]=a>>>16&255,c[r-6]=a>>>8&255,c[r-5]=a&255,c[r-4]=o>>>24,c[r-3]=o>>>16&255,c[r-2]=o>>>8&255,c[r-1]=o&255;for(let e=0;e<r;e+=64)l(c,e);let u=s,d=``;for(let e=0;e<8;e++)d+=i[u[e]>>>24]+i[u[e]>>>16&255]+i[u[e]>>>8&255],d+=i[u[e]&255];return d}let d=new TextEncoder;function f(e){return u(d.encode(e))}function p(e){return e.replace(/\s+/g,` `).trim()}function m(e){return(e??``).trim().toLowerCase().replace(/\.+$/,``)}function h(e){return e===null?``:String(e)}function g(e,t){return f(JSON.stringify([`conocto-pos-v1`,...e])).slice(0,t)}function ee(e){let t=m(e.unit),n=h(e.quantity),r=g([e.oz.trim()],16),i=g([`${p(e.shortText)}\n${p(e.longText)}`],16),a=g([n,t],16);return{id:g([r,i,a,e.positionType],10),oz:r,text:i,menge:a}}function te(e){let t=[],n=e=>{for(let r of e){for(let e of r.positions)t.push(e);n(r.sections)}};for(let t of e.lots)n(t.sections);return t}function ne(e){let t=new Map,n=new Map;for(let r of te(e)){let e=ee(r),i=(n.get(e.id)??0)+1;n.set(e.id,i),t.set(r,i===1?e:{...e,id:`${e.id}-${i}`})}return t}let re=`[\\p{L}\\p{N}]`;function _(e){let t=``,n=e=>{t.endsWith(e)||(t+=e)};for(let r of e.trim())r===`*`?n(`${re}*`):r===`#`?n(`\\d+`):/\s/.test(r)?n(`\\s+`):t+=r.replace(/[.+?^${}()|[\]\\/]/g,`\\$&`);return t}function v(e){if(e.length===0)return null;let t=[...e].sort((e,t)=>t.length-e.length).map(_);return RegExp(`(?<!${re})(?:${t.join(`|`)})(?!${re})`,`giu`)}function ie(e){return e.length===0?null:[...e].sort((e,t)=>t.length-e.length).map(_).join(`|`)}function ae(e,t,n){let r=Math.max(0,t-200),i=e.slice(r,t),a=[...i.matchAll(/[.!?;:]\s+(?=\p{Lu})/gu)].at(-1);a===void 0?r>0&&(r+=i.search(/\s\S/)+1):r+=a.index+a[0].length;let o=e[n-1]===`.`?n-1:n,s=Math.min(e.length,n+200),c=e.slice(o,s),l=/[.!?;](?=\s+\p{Lu}|\s*$)/u.exec(c),u=l===null?s:o+l.index+1;if(l===null&&s<e.length){let e=c.lastIndexOf(` `);e>0&&(u=o+e)}for(;r<t&&/\s/.test(e[r]);)r++;for(;u>n&&/\s/.test(e[u-1]);)u--;return{start:Math.min(r,t),end:Math.max(u,n)}}let oe=new Set([`-`,`‐`,`‑`]),se=/[\n\r\u2028\u2029]/,ce=/\s/;function le(e,t,n){for(let r=t+1;r<=e.length;r++){if(n?.has(r)===!0)return!0;if(r===e.length)return!1;let t=e[r];if(se.test(t))return!0;if(!ce.test(t))return!1}return!1}function ue(e,t){let n=``,r=[];for(let i=0;i<e.length;i++){let a=e[i];if(ce.test(a)||a===`­`||oe.has(a)&&le(e,i,t))continue;let o=a.toLowerCase();for(let e=0;e<o.length;e++)n+=o[e],r.push(i)}return{key:n,at:r}}let de=[`menge`,`einheit`,`art`],fe=[`normal`,`alternativ`,`bedarf`,`zulage`],pe=[`kurztext`,`langtext`,`pdf`],me=[`wichtig`,`material`,`masse`,`aus`],he=[`geld`,`menge`,`risiko`,`norm`,`frist`,`vob`];function y(e){return e.alle??e.eines??[]}let b=e=>typeof e==`object`&&!!e&&!Array.isArray(e),ge=/^[a-z0-9][a-z0-9-]{0,79}$/;function _e(e){return/^-?\d+(?:[.,]\d+)?$/.test(e.trim())?Number(e.trim().replace(`,`,`.`)):null}let x=e=>typeof e==`string`&&ge.test(e)?e:null;function ve(e){if(!Array.isArray(e)||e.length===0||e.length>50)return null;let t=e.filter(e=>typeof e==`string`).map(e=>e.trim()).filter(e=>e!==``&&e.length<=200);return t.length===e.length?t:null}function ye(e){if(e===void 0)return{};if(!b(e)||Object.keys(e).length>20)return null;let t={};for(let[n,r]of Object.entries(e)){if(x(n)===null)return null;if(typeof r==`number`&&Number.isFinite(r))t[n]=r;else if(typeof r==`boolean`)t[n]=r;else if(typeof r==`string`&&r.length<=200)t[n]=r;else{let e=ve(r);if(e===null)return null;t[n]=e}}return t}function be(e){let t=de.find(t=>t===e.feld);if(t===void 0)return null;if(e.ist===`leer`)return{feld:t,ist:`leer`};let n=ve(e.ist);return n===null||t===`menge`&&!n.every(e=>_e(e)!==null)||t===`art`&&!n.every(e=>fe.some(t=>t===e))?null:{feld:t,ist:n}}function xe(e){if(!b(e))return null;if(typeof e.begriff==`string`){let t=e.begriff.trim();return t.length<=200?{begriff:t}:null}if(b(e.menge)){let{einheit:t}=e.menge;return typeof t==`string`&&t.trim()!==``?{menge:{einheit:t.trim().slice(0,20)}}:{menge:{}}}if(b(e.norm))return{norm:{}};if(e.liste!==void 0){let t=x(e.liste);return t===null?null:{liste:t}}if(b(e.einheit)){let t=e.einheit.gruppe;return typeof t==`string`&&t.trim()!==``&&t.length<=200?{einheit:{gruppe:t.trim()}}:null}if(e.feld!==void 0)return be(e);if(e.eingebaut!==void 0){let t=x(e.eingebaut),n=ye(e.parameter);return t===null||n===null?null:Object.keys(n).length>0?{eingebaut:t,parameter:n}:{eingebaut:t}}return null}function S(e){if(!Array.isArray(e)||e.length>12)return null;let t=e.map(xe);return t.every(e=>e!==null)?t:null}function Se(e){return e===`satz`||e===`feld`?e:b(e)&&typeof e.zeichen==`number`&&Number.isInteger(e.zeichen)&&e.zeichen>=1&&e.zeichen<=2e3?{zeichen:e.zeichen}:null}function Ce(e){if(!b(e))return null;let t=e.alle===void 0?void 0:S(e.alle),n=e.eines===void 0?void 0:S(e.eines);if(t===null||n===null||t===void 0==(n===void 0))return null;let r=e.nicht===void 0?[]:S(e.nicht),i=Se(e.bereich),a=Array.isArray(e.wo)?pe.filter(t=>e.wo.includes(t)):[];if(r===null||i===null||a.length===0)return null;let o=t??n??[],s=[...o,...r].filter(e=>`eingebaut`in e).length;return s>0&&(s>1||o.length>1||r.length>0)?null:{...t===void 0?{eines:n}:{alle:t},...r.length>0?{nicht:r}:{},bereich:i,wo:a}}function we(e){if(!b(e))return null;let t=he.find(t=>t===e.kategorie),n=[`hinweis`,`beachten`].find(t=>t===e.schwere),r=typeof e.text==`string`?e.text.trim():``;if(t===void 0||n===void 0||r===``)return null;let i={kategorie:t,schwere:n,text:r.slice(0,1e3)},a=b(e.norm)?e.norm:null,o=typeof a?.verweis==`string`?a.verweis.trim():``,s=[`bestaetigt`,`zu_bestaetigen`].find(e=>e===a?.stand);return o===``?i:{...i,norm:{verweis:o.slice(0,200),stand:s??`zu_bestaetigen`}}}function Te(e){if(!b(e))return null;let{hervorheben:t,verknuepfen:n,pruefhinweis:r}=e;if(typeof t==`string`){let e=me.find(e=>e===t);return e===void 0?null:{hervorheben:e}}if(r!==void 0){let e=we(r);return e===null?null:{pruefhinweis:e}}if(b(n)){if(n.ziel===`pdf`)return{verknuepfen:{ziel:`pdf`}};let e=Ce(n.ziel);if(e===null)return null;let t=Array.isArray(n.gleich)?[`abschnitt`,`einheit`].filter(e=>n.gleich.includes(e)):[];return t.length===0?null:{verknuepfen:{ziel:e,gleich:t}}}return null}function Ee(e,t){return t.find(t=>t===e)??null}function De(e){if(!b(e)||e.schema!==`conocto-rule-v1`)return null;let{id:t,version:n,name:r,bemerkung:i}=e;if(typeof t!=`string`||!ge.test(t)||typeof n!=`number`||!Number.isInteger(n)||n<1||typeof r!=`string`||r.trim()===``)return null;let a=Ee(e.geltung,[`allgemein`,`unternehmen`]),o=Ce(e.bedingung),s=Te(e.wirkung),c=Ee(e.status,[`entwurf`,`freigegeben`,`aus`]),l=Ee(e.herkunft,[`nutzer`,`mining`,`ki`])??`nutzer`;if(o===null||s===null||a===null||c===null)return null;let u=o.wo.length===1&&o.wo[0]===`pdf`,d=`verknuepfen`in s&&s.verknuepfen.ziel===`pdf`;return o.wo.includes(`pdf`)&&(!u||!d)||d&&!u?null:{schema:`conocto-rule-v1`,id:t,version:n,name:r.trim().slice(0,200),bedingung:o,wirkung:s,geltung:a,status:c,herkunft:l,...typeof i==`string`&&i.trim()!==``?{bemerkung:i.trim().slice(0,1e3)}:{}}}function Oe(e){if(!b(e)||e.schema!==`conocto-rule-v1`||!Array.isArray(e.regeln))return[];let t=[];for(let n of e.regeln){let e=De(n);e!==null&&!t.some(t=>t.id===e.id)&&t.push(e)}return t}let ke=RegExp(`(?<![\\p{L}\\p{N}.,])(\\d{1,3}(?:\\.\\d{3})+|\\d+)(?:,\\d+)?\\s?(m³|m²|m3|m2|cbm|qm|lfdm|lfm|km|cm|mm|m|to|t|kg|Stück|Stck|Stk|St|psch|Std|h|l|ha|Wo|Mt)\\.?(?![\\p{L}\\p{N}])`,`gu`);function C(e){let t=e.trim().replace(/²/g,`2`).replace(/³/g,`3`).replace(/\.+$/,``).toLowerCase();return{cbm:`m3`,qm:`m2`,stück:`st`,stck:`st`,stk:`st`,lfdm:`lfm`}[t]??t}let Ae=new Map;function je(e){let t=Ae.get(e);return t===void 0&&(t=e.trim()===``?null:v([e]),Ae.set(e,t)),t}let Me=new WeakMap;function Ne(e){let t=Me.get(e);if(t===void 0){let n=e.filter(e=>e.trim()!==``);t=n.length===0?null:v(n),Me.set(e,t)}return t}function Pe(e,t){let n=[];if(e===null)return n;for(let r of t.matchAll(e)){let e=r.index;r[0].length>0&&n.push({start:e,end:e+r[0].length})}return n}let w=e=>`einheit`in e||`feld`in e;function Fe(e,t,n=[],r={}){if(`begriff`in e)return Pe(je(e.begriff),t);if(`liste`in e){let n=r.listen?.get(e.liste);return n===void 0?[]:Pe(Ne(n),t)}if(`menge`in e){let n=[],r=e.menge.einheit===void 0?null:C(e.menge.einheit);for(let e of t.matchAll(ke))(r===null||C(e[2])===r)&&n.push({start:e.index,end:e.index+e[0].length});return n}return`norm`in e?[...n]:[]}function T(e,t,n={}){if(t===void 0)return!1;if(`einheit`in e){let r=n.einheitGruppen?.get(e.einheit.gruppe);if(r===void 0||t.einheit===null)return!1;let i=C(t.einheit);return i!==``&&r.some(e=>C(e)===i)}if(!(`feld`in e))return!1;if(e.feld===`menge`){if(e.ist===`leer`)return t.menge===null;let n=t.menge;return n!==null&&e.ist.some(e=>_e(e)===n)}if(e.feld===`einheit`){let n=t.einheit===null?``:C(t.einheit);return e.ist===`leer`?n===``:n!==``&&e.ist.some(e=>C(e)===n)}return e.ist!==`leer`&&e.ist.includes(t.art)}let Ie=(e,t)=>e.start>=t.start&&e.end<=t.end,Le=(e,t)=>e.start<t.end&&t.start<e.end;function Re(e,t,n){let{bereich:r}=e;return r===`feld`?{start:0,end:t.length}:r===`satz`?ae(t,n.start,n.end):{start:Math.max(0,n.start-r.zeichen),end:Math.min(t.length,n.end+r.zeichen)}}function ze(e,t){return t===`kurztext`?e.kurztext:t===`langtext`?e.langtext:e.pdf??``}function Be(e,t,n,r,i){let a=ze(r,n);if(a===``||t.length===0)return[];let o=r.normen?.[n]??[],s=t.map(e=>Fe(e,a,o,i)),c=(e.nicht??[]).filter(e=>!w(e)).flatMap(e=>Fe(e,a,o,i)),l=e.alle!==void 0,u=l?s.reduce((e,t)=>t.length<e.length?t:e):s.flat().sort((e,t)=>e.start-t.start),d=[];for(let t of u){if(d.some(e=>Ie(t,e)))continue;let r=Re(e,a,t),i=s.map(e=>e.filter(e=>Ie(e,r)));if(!(l?i.every(e=>e.length>0):i.some(e=>e.length>0))||c.some(e=>Le(e,r)))continue;let o=i.flat().sort((e,t)=>e.start-t.start);if(d.push({feld:n,start:r.start,end:r.end,marks:o}),e.bereich===`feld`)break}return d}let Ve={feld:`position`,start:0,end:0,marks:[]};function He(e,t,n={}){let r=y(e),[i]=r;if(i!==void 0&&`eingebaut`in i){let r=n.eingebaut?.get(i.eingebaut);return r===void 0?[]:[...r(t,i.parameter??{},e.wo)]}if((e.nicht??[]).some(e=>w(e)&&T(e,t.angaben,n)))return[];let a=r.filter(w),o=r.filter(e=>!w(e)),s=a.filter(e=>T(e,t.angaben,n)),c=()=>e.wo.flatMap(r=>Be(e,o,r,t,n));if(e.alle!==void 0)return s.length<a.length?[]:o.length>0?c():a.length>0?[Ve]:[];let l=c();return s.length>0?[...l,Ve]:l}new Set(`aller alle allem einer eines einem einen dieser diese dieses sind wird werden nach über
  unter sowie oder auch ohne beim gemäß inkl einschl einschließlich ggf bzw mind etwa
  zwischen gesamt insgesamt herstellen liefern einbauen ausführen bauseits nicht keine`.split(/\s+/));let Ue=[[`vorbemerkungen`,String.raw`vorbemerk`],[`aia`,String.raw`\baia\b|informationsanforderung`],[`bap`,String.raw`\bbap\b|abwicklungsplan`],[`plan`,String.raw`\bbe\b|baustelleneinrichtung`],[`anhang-baubeschreibung`,String.raw`\banh[aä]ng|\banlage`],[`gutachten`,String.raw`gutachten|baugrund|geotechn|schadstoff|kampfmittel|bodenuntersuch`],[`terminplan`,String.raw`terminplan|bauzeitenplan|bauablaufplan|ablaufplan|\bterminrahmen`],[`baubeschreibung`,String.raw`baubeschreibung|leistungsbeschreibung|erläuterungsbericht`],[`vertrag`,String.raw`\b[zbe]vb\b|vertragsbedingung|\bztv|technische vertragsbedingung|`+String.raw`aufforderung zur angebotsabgabe|bewerbungsbedingung|angebotsschreiben`],[`formblatt`,String.raw`formblatt|vordruck|\befb\b|erklärung|eigenerklärung`],[`lv`,String.raw`leistungsverzeichnis|\blv\b`],[`plan`,String.raw`plan|pläne|grundriss|schnitt|ansicht|lageplan|übersicht|längsschnitt|`+String.raw`querschnitt|bauwerksplan|detail`],[`foto`,String.raw`foto|bild|\bimg[_ -]?\d|\bdsc[_ -]?\d`]],E=String.raw`[\p{L}\p{N}]`,We=`(?:(?<!${E})(?=${E})|(?<=${E})(?!${E}))`;Ue.map(([e,t])=>[e,new RegExp(t.replaceAll(String.raw`\b`,We),`u`)]),RegExp(`^${E}$`,`u`);function Ge(e){return e instanceof Error?`${e.name}: ${e.message}`:String(e)}function Ke(r){return r instanceof n?{code:`version`,message:r.message,complete:r.complete}:r instanceof t?{code:`validation`,message:r.message,complete:r.complete}:r instanceof e?{code:`parse`,message:r.message,complete:r.complete}:{code:`unknown`,message:qe,complete:!0,detail:Ge(r)}}let qe=`Beim Lesen der Datei ist ein unerwarteter Fehler aufgetreten. Bitte die Datei erneut laden oder prüfen, ob sie sich in der Ausschreibungssoftware öffnen lässt.`;var Je=`merkmal,wert,stichworte,ausser,bemerkung
Erkennung,,beton*|stahlbeton*|ortbeton*|spannbeton*|leichtbeton*|normalbeton*|schwerbeton*|faserbeton*|stahlfaserbeton*|sichtbeton*|transportbeton*|wu-beton*|C#/#|LC#/#|XC#|XD#|XS#|XF#|XA#|XM#,betonstahl*|betonpumpe*|betonpflaster*|betonstein*,"Entwurf: Klassen nach DIN EN 206 zeigen Beton auch ohne das Wort an; Betonpflaster und Betonsteine zählen nicht"
Art,Normalbeton,normalbeton*|C#/#,,Entwurf: C-Klasse = Normalbeton (DIN EN 206; Schwerbeton hat ebenfalls C-Klassen)
Art,Leichtbeton,leichtbeton*|LC#/#,,Entwurf: LC-Klasse = Leichtbeton (DIN EN 206)
Art,Schwerbeton,schwerbeton*,,Entwurf
Art,Spannbeton,spannbeton*|vorgespannt*,,Entwurf
Art,Faserbeton,faserbeton*|stahlfaserbeton*,,Entwurf
Bauweise,Ortbeton,ortbeton*,,Entwurf
Bauweise,Fertigteil,fertigteil*|betonfertigteil*|stahlbetonfertigteil*,,Entwurf
Bauweise,Halbfertigteil,halbfertigteil*|elementdecke*|elementwand*|filigrandecke*|doppelwand*,,Entwurf
Bewehrung,enthalten,bewehrt*|einschl. bewehrung|einschließlich bewehrung|inkl. bewehrung|inklusive bewehrung|mit bewehrung,,Entwurf
Bewehrung,gesondert,bewehrung gesondert*|bewehrung wird gesondert*|bewehrung siehe*|bewehrung separat*,,Entwurf: „ohne Bewehrung“ kann auch unbewehrt heißen
Bewehrung,unbewehrt,unbewehrt*,,Entwurf
Stahl/Fasern,Stahl,betonstahl*|bewehrungsstahl*|betonstabstahl*|stabstahl*,betonstahlmatte*,Geprüft (Nico 10.11.): nur Angabe für die Betonsortenliste; Bewehrungspositionen selbst werden nicht ausgewertet
Stahl/Fasern,Matten,betonstahlmatte*|bewehrungsmatte*|lagermatte*|listenmatte*,,Geprüft (Nico 10.11.)
Stahl/Fasern,Fasern,stahlfaser*|kunststofffaser*|pp-faser*|faserbeton*|glasfaser*,,Geprüft (Nico 10.11.): Fasern als Bewehrung im Beton
`,Ye=`merkmal,wert,stichworte,ausser,bemerkung
Erkennung,,betonstahl*|bewehrungsstahl*|betonstabstahl*|betonstahlmatte*|lagermatte*|listenmatte*|B#A|B#B|BSt #,,Entwurf: Positionen mit Betonstahl gelten als Bewehrungspositionen
`;function Xe(e,t=`,`){let n=[],r=``,i=!1;for(let a=0;a<e.length;a++){let o=e[a];i?o===`"`?e[a+1]===`"`?(r+=`"`,a++):i=!1:r+=o:o===`"`?i=!0:o===t?(n.push(r),r=``):r+=o}return n.push(r),n.map(e=>e.trim())}function D(e){let t=e.replace(/^\uFEFF/,``).split(/\r?\n/).map((e,t)=>({text:e,number:t+1})).filter(e=>e.text.trim()!==``);if(t.length===0)return[];let n=t[0].text,r=n.includes(`;`)&&!n.includes(`,`)?`;`:`,`,i=Xe(n,r).map(e=>e.toLowerCase());return t.slice(1).map(e=>{let t=Xe(e.text,r);return{line:e.number,get(e){let n=i.indexOf(e.toLowerCase());return n<0?``:t[n]??``}}})}function Ze(e){return e.split(`|`).map(e=>e.trim().toLowerCase()).filter(e=>e!==``)}function O(e){return e.split(`|`).map(e=>e.trim()).filter(e=>e!==``)}function Qe(e,t,n){let r=[];for(let i of e.matchAll(t)){let e=i[0].replace(/\s+/g,` `).trim();if(n?.test(e)===!0)continue;let t=i.index??0;r.push({text:e,start:t,end:t+i[0].length})}return r}function $e(e){return e.length===0?null:RegExp(`^(?:${e.map(_).join(`|`)})$`,`iu`)}function et(e){return e.toLowerCase().replace(/ä/g,`ae`).replace(/ö/g,`oe`).replace(/ü/g,`ue`).replace(/ß/g,`ss`).replace(/[^a-z0-9]+/g,` `).trim().split(` `).map((e,t)=>t===0?e:e.charAt(0).toUpperCase()+e.slice(1)).join(``)}function tt(e){return e.charAt(0).toUpperCase()+e.slice(1)}function nt(e){let t=O(e.get(`stichworte`)),n=v(t);return n===null?null:{pattern:n,ausser:$e(O(e.get(`ausser`))),stichworte:t,zeile:e.line}}function rt(e,t){let n=e.replace(/\.csv$/i,``),r=et(n),i=[],a=new Map;for(let e of D(t)){let t=e.get(`merkmal`);if(t===``)continue;if(t.toLowerCase()===`erkennung`){let t=nt(e);t!==null&&i.push(t);continue}let n=nt(e);if(n===null)continue;let o=r+tt(et(t)),s=a.get(o)??{name:t,werte:[]},c=e.get(`wert`);s.werte.push({wert:c===``?null:c,matcher:n}),a.set(o,s)}return{id:r,datei:e,name:tt(n.replace(/[-_]+/g,` `)),erkennung:i,merkmale:[...a].map(([e,{name:t,werte:n}])=>({key:e,name:t,werte:n}))}}let it=null;function k(){return it??=Object.entries(Object.assign({"../docs/domain/reference/material/beton.csv":Je,"../docs/domain/reference/material/betonstahl.csv":Ye})).sort(([e],[t])=>e.localeCompare(t)).map(([e,t])=>rt(e.split(`/`).pop()??e,t)),it}function A(e,t){let n=e[t];return typeof n==`string`?n===``?null:n:typeof n==`number`?String(n):typeof n==`boolean`?n?`ja`:`nein`:null}function j(e,t){let n=e[t];return Array.isArray(n)?n.filter(e=>typeof e==`string`&&e!==``):[]}function at(e){let t=e._spans;return Array.isArray(t)?t.filter(e=>{if(typeof e!=`object`||!e)return!1;let t=e;return typeof t.key==`string`&&typeof t.label==`string`&&typeof t.start==`number`&&typeof t.end==`number`&&t.end>t.start}):[]}function ot(e,t,n){let r=t.get(e.id)??null;if(r===null)return null;let i=n.get(r.id);if(i!==void 0)return i;let a=null;for(let e=r;e!==null;e=t.get(e.id)??null)e.kind===`section`&&(a=e);return n.set(r.id,a),a}var st=`gruppe,schreibweisen,quelle_version
Stück,stk|stck|st|stueck|stück,
Tonne,t|to,
Stunde,h|std|stunde|stunden|std.,
Pauschal,psch.|pau.,
`;let ct={"¹":`1`,"²":`2`,"³":`3`};function lt(e){if(e==null)return null;let t=e.replace(/[¹²³]/g,e=>ct[e]).replace(/\s+/g,``).replace(/\.+$/,``).toLowerCase();return t===``?null:t}function ut(){let e=new Map;for(let t of D(st)){let n=t.get(`gruppe`);if(n===``)continue;let r=Ze(t.get(`schreibweisen`)).map(e=>lt(e)).filter(e=>e!==null);if(r.length===0)continue;let i={name:n,spellings:r};for(let t of r)e.set(t,i)}return e}let M=null;function dt(e){return M??=ut(),M.get(e)}function ft(){return M??=ut(),[...new Set(M.values())]}function N(e){let t=lt(e);return t===null?null:dt(t)?.name??t}let pt={m2:`m²`,m3:`m³`};function P(e){return pt[e]??e}let mt={prepare:({index:e})=>t=>{let{attributes:n}=e.positions[t],r=j(n,`platzhalter`);if(r.length===0)return[];let i=n.platzhalterAnzahl;return[{title:typeof i==`number`&&i>1?`${i} offene Stellen (${r.join(`, `)})`:r.join(`, `),span:at(n).find(e=>e.key===`platzhalter`)}]}},ht={prepare:({index:e})=>{let t=new Map;for(let n of e.positions){let e=N(n.unit),r=lt(n.unit);if(e===null||r===null)continue;let i=t.get(e)??new Set;i.add(n.unit??r),t.set(e,i)}let n=new Map;for(let[e,r]of t)r.size>1&&n.set(e,[...r].sort((e,t)=>e.localeCompare(t,`de`)));return t=>{let{unit:r}=e.positions[t],i=N(r);if(i===null)return[];let a=n.get(i);return a===void 0?[]:[{title:`„${r}" — im LV auch als ${a.filter(e=>e!==r).map(e=>`„${e}"`).join(`, `)}`,group:{label:`${P(i)}: mehrere Schreibweisen (${a.join(`, `)})`,part:`„${r}"`}}]}}};function gt(e){let t=e.find(e=>e.id===`beton`),n=e.find(e=>e.id===`betonstahl`),r=t?.merkmale.find(e=>e.key===`betonBewehrung`);return t===void 0||n===void 0||r===void 0||t.erkennung.length===0||n.erkennung.length===0?null:{beton:t.name,betonstahl:n.name,bewehrungKey:r.key}}function _t(e,t){let n=e.slice(0,t).join(`, `);return e.length>t?`${n} und ${e.length-t} weitere`:n}function vt(e,t,n){let r=new Map,i=gt(t);if(i===null)return r;let{index:a,parents:o}=e,s=new Map,c=e=>ot(a.nodes[e],o,s)?.id??``,l=new Map,u=[];for(let e=0;e<a.size;e++){let{attributes:t,oz:n}=a.positions[e],r=j(t,`material`),o=r.includes(i.beton);if(r.includes(i.betonstahl)&&!o){let t=c(e),r=l.get(t);r===void 0?l.set(t,[n]):r.push(n)}o&&A(t,`positionsart`)===`bauteil`&&A(t,`beton`)!==null&&j(t,i.bewehrungKey).length===0&&u.push(e)}for(let e of u){let t=l.get(c(e))??[];r.set(e,{title:t.length>0?`Keine Angabe zur Bewehrung — Betonstahl im Abschnitt: ${_t(t,n)}`:`Keine Angabe zur Bewehrung, auch kein Betonstahl im Abschnitt`})}return r}let yt=new Map([[`offene-stelle`,mt],[`einheit-schreibweise`,ht],[`bewehrung`,{missing:()=>gt(k())===null?`Materialtabellen docs/domain/reference/material/beton.csv und betonstahl.csv enthalten noch keine Einträge.`:null,prepare:(e,t)=>{let n=t[`positionen-im-titel`];if(typeof n!=`number`)throw Error(`Parameter „positionen-im-titel“ fehlt in der Regel.`);let r=vt(e,k(),n);return e=>{let t=r.get(e);return t===void 0?[]:[t]}}}]]);var bt=`{
  "schema": "conocto-rule-v1",
  "regeln": [
    {
      "schema": "conocto-rule-v1",
      "id": "frist-in-tagen",
      "version": 1,
      "name": "Frist in Tagen",
      "bedingung": {
        "eines": [
          { "begriff": "# Tage" },
          { "begriff": "# Werktage" },
          { "begriff": "# Kalendertage" }
        ],
        "bereich": "satz",
        "wo": ["langtext"]
      },
      "wirkung": { "hervorheben": "wichtig" },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Beispielregel für den Grundstock. Hebt Fristangaben wie „14 Tage“ hervor."
    },
    {
      "schema": "conocto-rule-v1",
      "id": "vertragsstrafe",
      "version": 1,
      "name": "Vertragsstrafe",
      "bedingung": {
        "eines": [
          { "begriff": "Vertragsstrafe*" },
          { "begriff": "Konventionalstrafe*" }
        ],
        "bereich": "satz",
        "wo": ["kurztext", "langtext"]
      },
      "wirkung": { "hervorheben": "wichtig" },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Beispielregel für den Grundstock."
    },
    {
      "schema": "conocto-rule-v1",
      "id": "betonstahl-zu-ortbeton",
      "version": 1,
      "name": "Betonstahl zu Ortbeton",
      "bedingung": {
        "alle": [{ "begriff": "Betonstahl*" }],
        "bereich": "feld",
        "wo": ["kurztext"]
      },
      "wirkung": {
        "verknuepfen": {
          "ziel": {
            "alle": [{ "begriff": "Ortbeton*" }],
            "bereich": "feld",
            "wo": ["kurztext", "langtext"]
          },
          "gleich": ["abschnitt"]
        }
      },
      "geltung": "allgemein",
      "status": "entwurf",
      "herkunft": "nutzer",
      "bemerkung": "Beispiel für eine Verknüpfungsregel. Schlägt vor, Betonstahl mit den Ortbeton-Positionen desselben Abschnitts zu verbinden."
    },
    {
      "schema": "conocto-rule-v1",
      "id": "v1-bedarfsposition",
      "version": 1,
      "name": "Bedarfs- oder Alternativposition",
      "bedingung": {
        "alle": [{ "feld": "art", "ist": ["bedarf", "alternativ"] }],
        "bereich": "feld",
        "wo": ["kurztext", "langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "vob",
          "schwere": "beachten",
          "text": "Die Position ist als Bedarfs- oder Alternativposition ausgewiesen. Ob sie beauftragt wird, steht bei Angebotsabgabe nicht fest.",
          "norm": { "verweis": "VOB/A § 7 Abs. 1 Nr. 4", "stand": "bestaetigt" }
        }
      },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer"
    },
    {
      "schema": "conocto-rule-v1",
      "id": "v2-stundenlohn",
      "version": 1,
      "name": "Stundenlohnarbeiten",
      "bedingung": {
        "eines": [
          { "einheit": { "gruppe": "Stunde" } },
          { "begriff": "stundenlohn*" },
          { "begriff": "regiearbeit*" },
          { "begriff": "regiestunde*" }
        ],
        "bereich": "feld",
        "wo": ["kurztext", "langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "vob",
          "schwere": "hinweis",
          "text": "Die Position wird nach Zeit abgerechnet. Bei größerem Umfang lohnt der Blick auf Anteil und Abgrenzung zur Hauptleistung.",
          "norm": {
            "verweis": "VOB/A § 7 Abs. 1 Nr. 4 Satz 2 · Abrechnung: VOB/B § 15",
            "stand": "bestaetigt"
          }
        }
      },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Einheit aus der Gruppe „Stunde“ (einheiten-gruppen.csv) oder ein Stundenlohn-Wort im Text."
    },
    {
      "schema": "conocto-rule-v1",
      "id": "v3-produktname",
      "version": 1,
      "name": "Produktname ohne „oder gleichwertig“",
      "bedingung": {
        "alle": [{ "liste": "hersteller" }],
        "bereich": { "zeichen": 80 },
        "wo": ["kurztext", "langtext"],
        "nicht": [
          { "begriff": "gleichwertig*" },
          { "begriff": "o. glw." },
          { "begriff": "o.glw." },
          { "begriff": "o. glw" },
          { "begriff": "o.glw" },
          { "begriff": "o. gl." }
        ]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "vob",
          "schwere": "beachten",
          "text": "Ein Hersteller- oder Produktname ohne den Zusatz „oder gleichwertig“ schränkt den Wettbewerb ein.",
          "norm": {
            "verweis": "VOB/A § 7 Abs. 2 · bei EU-Vergaben zusätzlich VgV § 31 Abs. 6",
            "stand": "bestaetigt"
          }
        }
      },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Namen aus hersteller-produktnamen.csv. Der Zusatz gilt nur bis 80 Zeichen vor oder hinter dem Namen."
    },
    {
      "schema": "conocto-rule-v1",
      "id": "v4-risiko",
      "version": 1,
      "name": "Risiko auf Auftragnehmer",
      "bedingung": {
        "alle": [{ "liste": "risiko" }],
        "bereich": "satz",
        "wo": ["langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "risiko",
          "schwere": "beachten",
          "text": "Der Text schiebt ein Risiko auf den Auftragnehmer. Ob es sich kalkulieren lässt, gehört geprüft.",
          "norm": { "verweis": "VOB/A § 7 Abs. 1 Nr. 3", "stand": "bestaetigt" }
        }
      },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Formulierungen aus risiko-formulierungen.csv."
    },
    {
      "schema": "conocto-rule-v1",
      "id": "v5-menge-einheit",
      "version": 1,
      "name": "Menge oder Einheit fehlt",
      "bedingung": {
        "eines": [
          { "feld": "menge", "ist": "leer" },
          { "feld": "menge", "ist": ["0"] },
          { "feld": "einheit", "ist": "leer" }
        ],
        "bereich": "feld",
        "wo": ["kurztext", "langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "menge",
          "schwere": "beachten",
          "text": "Ohne Menge oder Einheit lässt sich die Position nicht bepreisen — der Ansatz muss von woanders kommen.",
          "norm": { "verweis": "VOB/A § 7 Abs. 1 Nr. 1", "stand": "bestaetigt" }
        }
      },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer"
    },
    {
      "schema": "conocto-rule-v1",
      "id": "v6-verweis",
      "version": 1,
      "name": "Verweis auf Dokument",
      "bedingung": {
        "eines": [
          { "liste": "verweis-anlage" },
          { "liste": "verweis-plan" },
          { "liste": "verweis-gutachten" }
        ],
        "bereich": "feld",
        "wo": ["langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "risiko",
          "schwere": "hinweis",
          "text": "Der Text verweist auf ein Dokument außerhalb des LV. Prüfen, ob es in den Vergabeunterlagen vorliegt.",
          "norm": { "verweis": "VOB/A § 7 Abs. 1 Nr. 2", "stand": "bestaetigt" }
        }
      },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Wortlisten verweis-anlage, verweis-plan, verweis-gutachten aus wortlisten.csv. Ein Verweis auf eine andere Position zählt nicht."
    },
    {
      "schema": "conocto-rule-v1",
      "id": "v7-offene-stelle",
      "version": 1,
      "name": "Offene Textergänzung",
      "bedingung": {
        "alle": [
          {
            "eingebaut": "offene-stelle",
            "parameter": { "punktreihe-mindestlaenge": 5 }
          }
        ],
        "bereich": "feld",
        "wo": ["langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "risiko",
          "schwere": "beachten",
          "text": "Im Langtext steht eine Lücke, die der Bieter ausfüllen soll. Sie ist Teil des Angebots."
        }
      },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Eingebaut: Eingabefelder aus der Datei zählen immer, Punkt- oder Unterstrichreihen ab der Mindestlänge, dazu die Wortlisten bieterangabe und offenes-feld (wortlisten.csv). Kein Norm-Verweis."
    },
    {
      "schema": "conocto-rule-v1",
      "id": "v8-nebenleistung",
      "version": 1,
      "name": "Ausgeschriebene Nebenleistung",
      "bedingung": {
        "alle": [{ "eingebaut": "nebenleistung" }],
        "bereich": "feld",
        "wo": ["langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "vob",
          "schwere": "hinweis",
          "text": "Eine Leistung, die nach VOB/C bereits Nebenleistung ist, hat eine eigene Position — auf Doppelvergütung prüfen.",
          "norm": {
            "verweis": "VOB/C, ATV DIN 18299 Abschnitt 4.1",
            "stand": "zu_bestaetigen"
          }
        }
      },
      "geltung": "allgemein",
      "status": "aus",
      "herkunft": "nutzer",
      "bemerkung": "Noch ohne Logik. Braucht vob-nebenleistungen.csv."
    },
    {
      "schema": "conocto-rule-v1",
      "id": "v9-besondere-leistung",
      "version": 1,
      "name": "Besondere Leistung ohne Position",
      "bedingung": {
        "alle": [{ "eingebaut": "besondere-leistung" }],
        "bereich": "feld",
        "wo": ["langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "vob",
          "schwere": "hinweis",
          "text": "Der Text erwähnt eine Besondere Leistung, für die keine eigene Position vorgesehen ist.",
          "norm": {
            "verweis": "VOB/C, ATV DIN 18299 Abschnitt 4.2",
            "stand": "zu_bestaetigen"
          }
        }
      },
      "geltung": "allgemein",
      "status": "aus",
      "herkunft": "nutzer",
      "bemerkung": "Noch ohne Logik. Braucht vob-nebenleistungen.csv."
    },
    {
      "schema": "conocto-rule-v1",
      "id": "v10-homogenbereiche",
      "version": 1,
      "name": "Erdarbeiten ohne Homogenbereiche",
      "bedingung": {
        "alle": [{ "eingebaut": "homogenbereiche" }],
        "bereich": "feld",
        "wo": ["langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "norm",
          "schwere": "beachten",
          "text": "Erdarbeiten ohne Angabe von Homogenbereichen — seit der Fassung 2015 lösen sie die Bodenklassen ab.",
          "norm": {
            "verweis": "VOB/C, DIN 18300 Abschnitt 0",
            "stand": "zu_bestaetigen"
          }
        }
      },
      "geltung": "allgemein",
      "status": "aus",
      "herkunft": "nutzer",
      "bemerkung": "Noch ohne Logik. Braucht die Zuordnung zu den Erdarbeiten (Entscheidung 0044)."
    },
    {
      "schema": "conocto-rule-v1",
      "id": "g3-einheit-schreibweise",
      "version": 1,
      "name": "Einheit uneinheitlich",
      "bedingung": {
        "alle": [{ "eingebaut": "einheit-schreibweise" }],
        "bereich": "feld",
        "wo": ["kurztext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "menge",
          "schwere": "hinweis",
          "text": "Dieselbe Einheit steht in der Datei in mehreren Schreibweisen — meist ein Zeichen für zusammengeführte Teil-LVs."
        }
      },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Eingebaut: vergleicht die Einheiten im ganzen LV. Kennzahl aus der Datei, kein Norm-Verweis."
    },
    {
      "schema": "conocto-rule-v1",
      "id": "m1-bewehrung",
      "version": 1,
      "name": "Beton ohne Bewehrung",
      "bedingung": {
        "alle": [
          {
            "eingebaut": "bewehrung",
            "parameter": { "positionen-im-titel": 3 }
          }
        ],
        "bereich": "feld",
        "wo": ["kurztext", "langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "risiko",
          "schwere": "hinweis",
          "text": "Die Betonposition nennt eine Festigkeitsklasse, sagt aber nichts zur Bewehrung. Oft steht sie in einer eigenen Position — ein Blick lohnt, ob sie dort erfasst ist."
        }
      },
      "geltung": "allgemein",
      "status": "aus",
      "herkunft": "nutzer",
      "bemerkung": "Eingebaut: liest die Materialtabellen beton.csv und betonstahl.csv und nennt den Betonstahl im selben Hauptabschnitt."
    },
    {
      "schema": "conocto-rule-v1",
      "id": "pdf-oz",
      "version": 1,
      "name": "OZ im Dokument",
      "bedingung": {
        "alle": [
          {
            "eingebaut": "oz-im-pdf",
            "parameter": { "menge-hinter-oz": 80 }
          }
        ],
        "bereich": "feld",
        "wo": ["pdf"]
      },
      "wirkung": { "verknuepfen": { "ziel": "pdf" } },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Eingebaut: findet OZ aus dem LV im Text des PDF, nur wenn sie genau eine Position treffen. Kurzformen nur nach „Pos.“ oder „OZ“. Eine Menge bis zu so vielen Zeichen hinter der OZ steht zum Vergleich daneben."
    },
    {
      "schema": "conocto-rule-v1",
      "id": "pdf-menge",
      "version": 1,
      "name": "Menge im Dokument",
      "bedingung": {
        "alle": [
          {
            "eingebaut": "menge-im-pdf",
            "parameter": { "kleinste-ganze-zahl": 10 }
          }
        ],
        "bereich": "satz",
        "wo": ["pdf"]
      },
      "wirkung": { "verknuepfen": { "ziel": "pdf" } },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Eingebaut: findet Menge und Einheit aus dem LV im Text des PDF. Eindeutig über Wert und Einheit oder über eigene Wörter aus dem Kurztext im Satzteil. Ganze Zahlen darunter sind zu allgemein."
    },
    {
      "schema": "conocto-rule-v1",
      "id": "pdf-beton",
      "version": 1,
      "name": "Beton im Dokument",
      "bedingung": {
        "alle": [
          {
            "eingebaut": "beton-im-pdf",
            "parameter": { "hoechstens-positionen": 3 }
          }
        ],
        "bereich": "satz",
        "wo": ["pdf"]
      },
      "wirkung": { "verknuepfen": { "ziel": "pdf" } },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Eingebaut: findet Betonsorten aus dem LV im Text des PDF (Festigkeits-, Expositions- und Feuchtigkeitsklasse wörtlich gleich). Eindeutig, wenn nur eine Position die Sorte hat, sonst über eigene Wörter aus dem Kurztext, zuerst vor der Klasse. Mehr Positionen als der Wert: kein Vorschlag."
    },
    {
      "schema": "conocto-rule-v1",
      "id": "pdf-text",
      "version": 1,
      "name": "Kurztext im Dokument",
      "bedingung": {
        "alle": [
          {
            "eingebaut": "text-im-pdf",
            "parameter": { "kleinste-laenge": 12 }
          }
        ],
        "bereich": "satz",
        "wo": ["pdf"]
      },
      "wirkung": { "verknuepfen": { "ziel": "pdf" } },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Eingebaut: findet den Kurztext einer Position wörtlich im Text des PDF. Groß/klein, Satzzeichen, Zeilenumbrüche und Umlaute zählen nicht. Nur Kurztexte mit mindestens zwei Wörtern und so vielen Zeichen, die genau eine Position hat."
    }
  ]
}
`,xt=`name,stichworte,quelle_version
Knauf,,Entwurf Claude
Saint-Gobain Rigips,Rigips,Entwurf Claude
Saint-Gobain Isover,Isover,Entwurf Claude
Saint-Gobain Weber,weber,Entwurf Claude
Rockwool,,Entwurf Claude
Kingspan,,Entwurf Claude
Xella,Ytong|Silka|Multipor,Entwurf Claude
Wienerberger,Poroton|Terca,Entwurf Claude
Heidelberg Materials,,Entwurf Claude
Dyckerhoff,,Entwurf Claude
Holcim,,Entwurf Claude
Schöck,Isokorb|Tronsole,Entwurf Claude
Halfen,,Entwurf Claude
Pfeifer,,Entwurf Claude
Max Frank,Egcobox,Entwurf Claude
Peri,,Entwurf Claude
Doka,,Entwurf Claude
Hilti,,Entwurf Claude
Fischer,,Entwurf Claude
Würth,,Entwurf Claude
Sika,Sikaflex,Entwurf Claude
MC-Bauchemie,,Entwurf Claude
PCI,,Entwurf Claude
Schomburg,,Entwurf Claude
Remmers,,Entwurf Claude
Ardex,,Entwurf Claude
Mapei,,Entwurf Claude
Sopro,,Entwurf Claude
Baumit,,Entwurf Claude
Quick-Mix,,Entwurf Claude
Kemper System,,Entwurf Claude
Bauder,,Entwurf Claude
Sto,,Entwurf Claude
Caparol,,Entwurf Claude
Keim,,Entwurf Claude
Brillux,,Entwurf Claude
Schlüter-Systems,Schlüter|Ditra,Entwurf Claude
Wedi,,Entwurf Claude
Schüco,,Entwurf Claude
Hörmann,,Entwurf Claude
Velux,,Entwurf Claude
Geberit,,Entwurf Claude
Viega,Profipress,Entwurf Claude
Grohe,,Entwurf Claude
Rehau,,Entwurf Claude
Uponor,,Entwurf Claude
ACO,,Entwurf Claude
Kessel,,Entwurf Claude
Hauraton,,Entwurf Claude
OBO,,Entwurf
`,St=`formulierung,quelle_version
trägt der AN,docs/domain/vob-pruefungen.md
trägt der Auftragnehmer,docs/domain/vob-pruefungen.md
unabhängig von den angetroffenen Verhältnissen,docs/domain/vob-pruefungen.md
`,Ct=`liste,stichworte,bemerkung
verweis-anlage,laut anlage*|laut anlage* #|gemäß anlage*|gemäß anlage* #|gemaess anlage*|gemaess anlage* #|siehe anlage*|siehe anlage* #|nach anlage*|nach anlage* #,"V6: Verweis auf eine Anlage außerhalb des LV"
verweis-plan,laut plan*|laut zeichnung*|laut detail*|laut schalplan*|laut bewehrungsplan*|gemäß plan*|gemäß zeichnung*|gemäß detail*|gemäß schalplan*|gemäß bewehrungsplan*|gemaess plan*|gemaess zeichnung*|gemaess detail*|gemaess schalplan*|gemaess bewehrungsplan*|siehe plan*|siehe zeichnung*|siehe detail*|siehe schalplan*|siehe bewehrungsplan*|nach plan*|nach zeichnung*|nach detail*|nach schalplan*|nach bewehrungsplan*,"V6: Verweis auf einen Plan außerhalb des LV"
verweis-gutachten,laut gutachten*|laut bodengutachten*|laut baugrundgutachten*|gemäß gutachten*|gemäß bodengutachten*|gemäß baugrundgutachten*|gemaess gutachten*|gemaess bodengutachten*|gemaess baugrundgutachten*|siehe gutachten*|siehe bodengutachten*|siehe baugrundgutachten*|nach gutachten*|nach bodengutachten*|nach baugrundgutachten*,"V6: Verweis auf ein Gutachten außerhalb des LV"
bieterangabe,bieterangabe*|vom bieter einzutragen|vom bieter zutragen|vom bieter anzugeben|durch den bieter einzutragen|durch den bieter zutragen|bieter trägt ein,"V7: ausformulierte Aufforderung an den Bieter"
offenes-feld,fabrikat|hersteller|typ|erzeugnis,"V7: Feldname, hinter dem nach einem Doppelpunkt nichts oder nur eine Lücke steht („Fabrikat: ....“)"
`;let F=`docs/domain/reference`;function wt(){let e=new Map;e.set(`hersteller`,{file:`${F}/hersteller-produktnamen.csv`,words:D(xt).flatMap(e=>e.get(`name`)===``?[]:[e.get(`name`),...O(e.get(`stichworte`))])}),e.set(`risiko`,{file:`${F}/risiko-formulierungen.csv`,words:D(St).map(e=>e.get(`formulierung`)).filter(e=>e!==``)});for(let t of D(Ct)){let n=t.get(`liste`);if(n===``)continue;let r=e.get(n)?.words??[],i=t.get(`bemerkung`);e.set(n,{file:`${F}/wortlisten.csv`,words:[...r,...O(t.get(`stichworte`))],...i===``?{}:{note:i}})}return e}let Tt=wt();function Et(e){return Tt.get(e)?.file??`${F}/wortlisten.csv`}let Dt={listen:new Map([...Tt].map(([e,t])=>[e,t.words])),einheitGruppen:new Map(ft().map(e=>[e.name,e.spellings]))};function Ot(e){try{return Oe(JSON.parse(e)).map(e=>({...e,geltung:`allgemein`}))}catch{return[]}}let kt=Ot(bt),At=Dt;function jt(e,t){for(let n of kt){let[r]=y(n.bedingung);if(r!==void 0&&`eingebaut`in r&&r.eingebaut===e)return r.parameter?.[t]}}function Mt(e){let t=at(e.attributes).filter(e=>e.key===`normen`).map(({start:e,end:t})=>({start:e,end:t}));return{kurztext:e.shortText,langtext:e.longText,normen:{langtext:t},angaben:{menge:e.quantity,einheit:e.unit,art:Nt[e.positionType]}}}let Nt={NORMAL:`normal`,ALTERNATIV:`alternativ`,BEDARF:`bedarf`,ZULAGENPOSITION:`zulage`},Pt=e=>`pruefhinweis`in e.wirkung;function Ft(e){return e.filter(Pt)}let It=Ft(kt);function Lt(e){return/^([a-z]\d+)(?:-|$)/i.exec(e)?.[1].toUpperCase()??``}function Rt(e,t,n){for(let r of y(e.bedingung)){if(`eingebaut`in r){let e=n.get(r.eingebaut);return e===void 0?`Noch nicht umgesetzt.`:e.missing?.()??null}if(`liste`in r&&(t.listen?.get(r.liste)?.length??0)===0)return`Wortliste „${r.liste}“ in ${Et(r.liste)} enthält noch keine Einträge.`;if(`einheit`in r&&(t.einheitGruppen?.get(r.einheit.gruppe)?.length??0)===0)return`Einheiten-Gruppe „${r.einheit.gruppe}“ fehlt in docs/domain/reference/einheiten-gruppen.csv.`}return null}let zt={NORMAL:`Normalposition`,BEDARF:`Bedarfsposition`,ALTERNATIV:`Alternativposition`,ZULAGENPOSITION:`Zulagenposition`};function Bt(e,t){return`einheit`in e?`Einheit ${t.unit??`–`} (${e.einheit.gruppe})`:`feld`in e?e.feld===`art`?zt[t.positionType]:e.feld===`menge`?e.ist===`leer`?`keine Menge`:`Menge ${String(t.quantity)}`:e.ist===`leer`?`keine Einheit`:`Einheit ${t.unit??`–`}`:null}function Vt(e,t,n,r,i){let a=[],o=new Set,s=e=>{let t=e.toLowerCase();e===``||o.has(t)||(o.add(t),a.push(e))},c;for(let r of t){if(r.feld===`position`)continue;let t=r.feld===`kurztext`?n.kurztext:n.langtext;for(let n of r.marks){let i=t.slice(n.start,n.end).replace(/\s+/g,` `);s(i),c===void 0&&r.feld===`langtext`&&(c={key:e.id,start:n.start,end:n.end,label:i})}}if(t.some(e=>e.feld===`position`))for(let t of y(e.bedingung))T(t,n.angaben,i)&&s(Bt(t,r)??``);return{title:a.length>0?a.join(`, `):e.name,span:c}}function Ht(e,t,n,r,i){let{index:a}=t,o=[],[s]=y(e.bedingung);if(s!==void 0&&`eingebaut`in s){let e=i.get(s.eingebaut);if(e===void 0)return o;let n=e.prepare(t,s.parameter??{});for(let e=0;e<a.size;e++)for(let t of n(e))o.push({...t,slot:e});return o}for(let t=0;t<a.size;t++){let i=He(e.bedingung,n[t],r);i.length!==0&&o.push({...Vt(e,i,n[t],a.positions[t],r),slot:t})}return o}function Ut(e,t,n=It,r=new Map,i=At,a=yt){let o={index:e,summary:t,parents:r},s=[],c=[],l=null;for(let t of n){if(t.status!==`freigegeben`)continue;let n=t.wirkung.pruefhinweis,r,u=[];try{r=Rt(t,i,a),r===null&&(l??=e.positions.map(Mt),u=Ht(t,o,l,i,a).map(({slot:r,...i})=>({...i,id:t.id,category:n.kategorie,severity:n.schwere,positionId:e.nodes[r].id})))}catch(e){r=`Regel abgebrochen: ${e instanceof Error?e.message:`unbekannt`}`,u=[]}let d=r===null;if(d)for(let e of u)s.push(e);c.push({id:t.id,code:Lt(t.id),label:t.name,category:n.kategorie,severity:n.schwere,hint:n.text,ruleRef:n.norm?.verweis??``,refConfirmed:n.norm?.stand===`bestaetigt`,active:d,inactiveReason:r,count:d?u.length:0})}return{flags:s,rules:c}}function I(e){return e.replace(/\s+/g,` `).trim()}function Wt(e,t,n){let r=[];for(let i of e.matchAll(t)){let e=n(i);if(e===null||e===``)continue;let t=i.index??0;r.push({value:e,start:t,end:t+i[0].length,label:I(i[0])})}return r}function L(e,t){let n=[],r=new Set,i=[];for(let a of t)r.has(a.value)||(r.add(a.value),n.push(a.value)),i.push({key:e,start:a.start,end:a.end,label:a.label??a.value});return{values:n,spans:i}}function Gt(e){return e.filter(t=>!e.some(e=>e!==t&&e.start<=t.start&&e.end>=t.end&&e.end-e.start>t.end-t.start))}function Kt(e){let t=[...e].sort((e,t)=>e.start-t.start||t.end-e.end),n=[],r=-1;for(let e of t)e.start<r||(n.push(e),r=e.end);return n}let qt=[{value:`Termin`,pattern:/\b(?:\d{1,2}\.\s?\d{1,2}\.\s?\d{2,4}|kw\s?\d{1,2}(?:\/\d{2,4})?|q[1-4]\/\d{2,4}|[1-4]\.\s?quartal\s+\d{4})\b/gi},{value:`Bauzeit`,pattern:/\b(?:bauzeit|bauzeitenplan|ausführungszeitraum|ausfuehrungszeitraum|fertigstellung(?:stermin)?|zwischentermin|vertragsfrist|einzelfrist)\w*/gi},{value:`Winterbau`,pattern:/\b(?:winterbau|winterbaumaßnahm\w*|winterbaumassnahm\w*|frostperiode|winterperiode)/gi},{value:`Vorleistung`,pattern:/\b(?:vorleistung\w*|vorgewerk\w*|nach\s+fertigstellung\s+der\s+vorleistung\w*)/gi},{value:`Arbeiten unter Verkehr`,pattern:/\b(?:unter\s+(?:fließendem\s+|fliessendem\s+|rollendem\s+)?verkehr|bei\s+laufendem\s+betrieb|unter\s+betrieb)/gi},{value:`Nacht- und Wochenendarbeit`,pattern:/\b(?:nachtarbeit|nachtschicht|wochenendarbeit|sonntagsarbeit|feiertagsarbeit)\w*/gi},{value:`Bauablauf`,pattern:/\b(?:bauabschnitt\w*|bauphase\w*|taktplan\w*|sperrpause\w*)/gi}];function Jt(e){let t=[];for(let n of qt)for(let r of e.matchAll(n.pattern)){let e=r.index??0;t.push({value:n.value,start:e,end:e+r[0].length,label:I(r[0])})}return t.sort((e,t)=>e.start-t.start)}let Yt={id:`fristen`,extract(e){let{values:t,spans:n}=L(`fristen`,Jt(e.longText));return{attributes:t.length===0?{}:{fristen:t},spans:n}}},R=`(?:mm|cm|dm|m)`,z=`(?:kg|t|to)`,B=`\\d+(?:[.,]\\d+)?`;function V(e,t){return RegExp(`(?:${e})\\s*[:=]?\\s*${Xt}${B}\\s*${t}\\b`,`gi`)}let Xt=`(?:(?:von|mit|ca\\.|mind\\.|min\\.|max\\.)\\s*)?`,H=`(?:e[mnrs]?)?`;function U(e,t){return RegExp(`\\b(?:${e})\\s*[:=]\\s*${B}\\s*${t}\\b`,`gi`)}function W(e,t){return RegExp(`(?<!\\d)(?<!\\d[.,])${B}\\s*${e}\\s*(?:${t})\\b`,`gi`)}let Zt=[{key:`dicke`,einheit:R,patterns:[V(`dicke|dick|stärke|staerke`,R),U(`d`,R),W(R,`dick${H}`)]},{key:`hoehe`,einheit:R,patterns:[V(`höhe|hoehe|hoch`,R),U(`h`,R),W(R,`hoch|hohe[mnrs]?`)]},{key:`laenge`,einheit:R,patterns:[V(`länge|laenge|lang`,R),U(`l`,R),W(R,`lang${H}`)]},{key:`breite`,einheit:R,patterns:[V(`breite|breit`,R),U(`b`,R),W(R,`breit${H}`)]},{key:`gewicht`,einheit:z,patterns:[V(`gewicht|schwer`,z),U(`g|m`,z),W(z,`schwer${H}`)]}];function Qt(e,t){let n=RegExp(`${B}\\s*${t}\\b`,`i`).exec(e);return n===null?null:I(n[0]).toLowerCase()}function $t(e,t){let n=[];for(let r of t.patterns)for(let i of e.matchAll(r)){let e=Qt(i[0],t.einheit);if(e===null)continue;let r=i.index??0;n.push({value:e,start:r,end:r+i[0].length,label:I(i[0])})}n.sort((e,t)=>e.start-t.start||t.end-e.end);let r=[];for(let e of n){let t=r.at(-1);(t===void 0||e.start>=t.end)&&r.push(e)}return r}function en(e,t=``){let n={},r=[];for(let i of Zt){let a=$t(e,i);if(a.length>0){let e=L(i.key,a);n[i.key]=e.values[0],r.push(...e.spans);continue}let o=$t(t,i)[0];o!==void 0&&(n[i.key]=o.value)}return{attributes:n,spans:r}}let tn={id:`masse`,extract(e){return en(e.longText,e.shortText)}};function G(e,t){return Qe(e,t.pattern,t.ausser)}function nn(e,t){return t.flatMap(t=>G(e,t))}function rn(e,t){e.includes(t)||e.push(t)}function an(e,t){let n={},r=[];for(let i of t){let t=nn(e.longText,i.erkennung);if(t.length!==0||nn(e.shortText,i.erkennung).length!==0){n.material??=[],rn(n.material,i.name);for(let t of i.merkmale){let i=[];for(let{wert:n,matcher:a}of t.werte){let o=G(e.longText,a),s=G(e.shortText,a);for(let e of[...s,...o])rn(i,n??e.text);for(let e of o){let i=`${t.name}: ${n??e.text}`;r.push({key:`material`,start:e.start,end:e.end,label:i})}}i.length>0&&(n[t.key]=i)}for(let e of t)r.push({key:`material`,start:e.start,end:e.end,label:i.name})}}return{attributes:n,spans:r}}let on={id:`material`,extract:e=>an(e,k())},sn=/\b(?:DIN\s+(?:V\s+|SPEC\s+)?)?(?:EN\s+)?(?:ISO\s+)?\d{2,5}(?:-\d+)*\b/g,cn=/\b(?:DIN|EN|ISO)\b/,ln=/\b(?:VOB\/[ABC]|ATV(?:\s+DIN\s+\d{4,5})?|ZTV[- ][A-Za-zÄÖÜäöüß-]+(?:\s+\d{2,4})?)/g,un=/^:\d{4}(?:-\d{2})?/;function dn(e){let t=I(e[0]);return cn.test(t)?t.toUpperCase():null}function fn(e,t){let n=un.exec(e.slice(t.end));if(n===null)return t;let r=t.end+n[0].length;return{...t,end:r,label:I(e.slice(t.start,r))}}function pn(e){return Gt([...Wt(e,sn,dn),...Wt(e,ln,e=>I(e[0]).toUpperCase())]).map(t=>fn(e,t)).sort((e,t)=>e.start-t.start)}let mn={id:`normen`,extract(e){let{values:t,spans:n}=L(`normen`,pn(e.longText));return{attributes:t.length===0?{}:{normen:t},spans:n}}},hn=`Textergänzung`,K;function gn(){if(K!==void 0)return K;let e=Number(jt(`offene-stelle`,`punktreihe-mindestlaenge`));return K=Number.isInteger(e)&&e>0?RegExp(`\\.{${e},}|_{${e},}|…{${Math.ceil(e/3)},}`,`g`):null,K}function _n(e){let t=ie(e);return t===null?null:RegExp(`(?<![\\p{L}\\p{N}])(?:${t})\\s*:\\s*(?=\\s*(?:\\.{3,}|_{3,}|…|$))`,`giu`)}let vn;function yn(){let e=e=>Dt.listen?.get(e)??[];return vn??={bitte:e(`bieterangabe`).length===0?null:v(e(`bieterangabe`)),feld:_n(e(`offenes-feld`))},vn}function bn(e,t){let n=I(e.slice(xn(e,t),t));return n===``?`Offene Textergänzung`:`${n} …`}function xn(e,t){let n=Math.max(0,t-40),r=e.slice(n,t),i=Math.max(r.lastIndexOf(`. `),r.lastIndexOf(`
`));return i<0?n:n+i+1}function Sn(e,t=[]){let n=[...Cn(e,t),...wn(e,t)],{bitte:r,feld:i}=yn();if(r!==null)for(let t of Qe(e,r,null))n.push({value:`Bieterangabe`,start:t.start,end:t.end,label:t.text});if(i!==null)for(let t of e.matchAll(i)){let e=t.index??0;n.push({value:`Offenes Feld`,start:e,end:e+t[0].length,label:I(t[0])})}return n.sort((e,t)=>e.start-t.start)}function Cn(e,t){return t.map(t=>{let n=bn(e,t.start);if(!(t.end<=t.start))return{value:hn,start:t.start,end:t.end,label:n};let r=xn(e,t.start);for(;r<t.start&&/\s/.test(e[r]);)r++;return{value:hn,start:r,end:t.start,label:n}})}function wn(e,t){let n=gn();if(n===null)return[];let r=[];for(let i of e.matchAll(n)){let n=i.index??0,a=n+i[0].length;t.some(e=>n<Math.max(e.end,e.start+1)&&a>e.start)||r.push({value:`Punktreihe`,start:n,end:a,label:bn(e,n)})}return r}let Tn={id:`platzhalter`,extract(e){let t=Sn(e.longText,e.inputFields),{values:n,spans:r}=L(`platzhalter`,t);return n.length===0?{attributes:{},spans:[]}:{attributes:{platzhalter:n,platzhalterAnzahl:t.length},spans:r}}},En=[{value:`Positionsverweis`,pattern:/\b(?:siehe|wie|vgl\.?|gemäß|gemaess|analog)\s+(?:pos\.?|position)\s*[\w.\-/]*/gi},{value:`Anlage`,pattern:/\b(?:laut|gemäß|gemaess|siehe|nach)\s+anlage\s*[\w.\-/]*/gi},{value:`Vorbemerkung`,pattern:/\b(?:laut|gemäß|gemaess|siehe|nach)\s+(?:vorbemerkung|vorbemerkungen)[\w.\-/]*/gi},{value:`Planunterlage`,pattern:/\b(?:laut|gemäß|gemaess|siehe|nach)\s+(?:plan|planung|zeichnung|detail|schalplan|bewehrungsplan)[\w.\-/]*/gi},{value:`Gutachten`,pattern:/\b(?:laut|gemäß|gemaess|siehe|nach)\s+(?:gutachten|bodengutachten|baugrundgutachten)/gi},{value:`Leistungsbeschreibung`,pattern:/\b(?:laut|gemäß|gemaess|siehe|nach)\s+(?:leistungsbeschreibung|baubeschreibung)/gi}];function Dn(e){let t=[];for(let n of En)for(let r of e.matchAll(n.pattern)){let e=r.index??0;t.push({value:n.value,start:e,end:e+r[0].length,label:I(r[0])})}return t.sort((e,t)=>e.start-t.start)}let On=[mn,on,tn,Tn,{id:`verweise`,extract(e){let{values:t,spans:n}=L(`verweise`,Dn(e.longText));return{attributes:t.length===0?{}:{verweise:t},spans:n}}},Yt];function kn(e,t=On){let n={},r=[];for(let i of t){let t=i.extract(e);Object.assign(n,t.attributes),r.push(...t.spans)}return{attributes:n,spans:Kt(r)}}function q(e){return e.toLowerCase().replace(/\s+/g,` `).trim()}function An(e){let t=q(e.shortText),n=q(e.longText);return{short:t,long:n,all:`${t} ${n}`.trim(),unit:e.unit===null?null:q(e.unit)}}function jn(e){return e.short===``?e.all:e.short}function J(e,t){return t.some(t=>e.includes(t))}function Y(e,t){let n=new Set;for(let r of e.matchAll(t))n.add(r[0]);return[...n]}let Mn=[{label:`WU-Beton`,keywords:[`wu-beton`,`wu beton`,`wasserundurchlässig`]},{label:`Sichtbeton`,keywords:[`sichtbeton`]},{label:`Fertigteil`,keywords:[`fertigteil`,`halbfertigteil`,`elementdecke`]},{label:`Ortbeton`,keywords:[`ortbeton`]},{label:`Brandschutz`,keywords:[`brandschutz`,`feuerwiderstand`,`f90`,`r90`]},{label:`Schallschutz`,keywords:[`schallschutz`,`schalldämm`]},{label:`Wärmedämmung`,keywords:[`wärmedämm`,`dämmung`]},{label:`Abdichtung`,keywords:[`abdichtung`,`bitumenbahn`]},{label:`Rückbau`,keywords:[`rückbau`,`abbruch`,`demontage`]},{label:`Schadstoff`,keywords:[`asbest`,`schadstoff`,`kontaminiert`]},{label:`Winterbau`,keywords:[`winterbau`,`frostschutz`,`beheizung`]},{label:`Bestand`,keywords:[`bestand`,`altbau`,`bestandsbauteil`],ausser:[`bestandteil`]}],Nn=/\bcem\s?[iv]{1,3}(?:\/[a-c])?\b/g;function Pn(e){return e.map(e=>e.replace(/\s+/g,` `).toUpperCase())}function Fn(e){let t=new Set;for(let n of Mn){let r=(n.ausser??[]).reduce((e,t)=>e.replaceAll(t,` `),e.all);n.keywords.some(e=>r.includes(e))&&t.add(n.label)}for(let n of Pn(Y(e.all,Nn)))t.add(n);return[...t]}let In=[`stundenlohn`,`regiearbeit`,`regiestunde`],Ln=[`vorhalten`,`vorhaltung`],Rn=[`werkplanung`,`ausführungsplanung`,`montageplanung`],zn=[`gutachten`,`bestandsaufnahme`],Bn=[`baustelleneinrichtung`,`baustelle einrichten`,`baustelle räumen`,`bauzaun`,`baustrom`,`bauwasser`,`baustellenverkehr`,`bürocontainer`,`aufenthaltscontainer`,`sanitärcontainer`,`krananlage`,`turmdrehkran`,`sicherheitseinrichtung`],Vn=[...In,`vorarbeiter`,`facharbeiter`,`werker`,`polier`,`bauhelfer`],Hn=[...Rn,`werk- und montageplanung`,`schalplanung`,`bewehrungsplanung`,`statische berechnung`,`statischer nachweis`,`standsicherheitsnachweis`,`nachweisführung`,...zn,`aufmaß erstellen`],Un=[`nebenleistung`,`besondere leistung`,...Ln,`andienung`,`baustellendokumentation`,`schlussreinigung`,`bauendreinigung`],Wn=new Set([`m`,`m2`,`m²`,`m3`,`m³`,`mm`,`cm`,`km`,`stk`,`st`,`stck`,`stück`,`psch`,`t`,`to`,`kg`,`l`]),Gn=new Set([`h`,`std`,`std.`,`min`,`d`,`tag`,`wo`,`mon`,`mt`]);function Kn(e){let t=jn(e);if(J(t,Bn))return`baustelleneinrichtung`;if(J(t,Vn))return`personal`;if(J(t,Hn))return`planung`;if(J(t,Un))return`nebenleistung`;let n=e.unit;return n!==null&&Gn.has(n)?`personal`:n!==null&&Wn.has(n)?`bauteil`:`sonstige`}let qn=[`C8/10`,`C12/15`,`C16/20`,`C20/25`,`C25/30`,`C30/37`,`C35/45`,`C40/50`,`C45/55`,`C50/60`,`C55/67`,`C60/75`,`C70/85`,`C80/95`,`C90/105`,`C100/115`],Jn=[`LC8/9`,`LC12/13`,`LC16/18`,`LC20/22`,`LC25/28`,`LC30/33`,`LC35/38`,`LC40/44`,`LC45/50`,`LC50/55`,`LC55/60`,`LC60/66`,`LC70/77`,`LC80/88`],Yn=new Set([...qn,...Jn].map(e=>e.toLowerCase()));function Xn(e){return Yn.has(e.toLowerCase().replace(/\s+/g,``))}let Zn=/\b(?:lc|c)\s?\d{1,3}\/\d{1,3}\b/g,Qn=/\bx0\b|\bx[cdsfam][1-4]\b/g,$n=/\bw[ofa]\b/g,er=/\bcl\s?([01])[,.](\d{1,2})\b/g,tr=/\b(?:sf[1-3]|f[1-6])\b|\bkonsistenz(?:klasse)?\s*[:=]?\s*(?:s[1-5]|c[0-4])\b/g,nr=/\b(?:gr(?:ö|oe)(?:ß|ss)tkorn|d\s?max|gk)\s*[:=]?\s*(?:d\s?max\s*[:=]?\s*)?(\d{1,2})(?:[,.]\d)?\s*(?:mm)?(?![\d/])/g;function X(e){return e.map(e=>e.replace(/\s+/g,``).toUpperCase())}function rr(e){return[...new Set(e)]}function ir(e){return rr([...e.matchAll(er)].map(e=>`Cl ${e[1]},${e[2].padEnd(2,`0`)}`))}function ar(e){return rr([...e.matchAll(tr)].map(e=>(/(?:sf|s|c|f)\d$/.exec(e[0])?.[0]??e[0]).toUpperCase()))}function or(e){return rr([...e.matchAll(nr)].map(e=>`${Number(e[1])} mm`))}function sr(e){return{beton:X(Y(e,Zn).filter(Xn))[0]??null,expo:X(Y(e,Qn)),feuchtigkeitsklasse:X(Y(e,$n)),chloridklasse:ir(e),konsistenz:ar(e),groesstkorn:or(e)}}function cr(e){let t=sr(e),{beton:n,expo:r,feuchtigkeitsklasse:i}=t,a={};return n!==null&&(a.beton=n),r.length>0&&(a.expo=r),i.length>0&&(a.feuchtigkeitsklasse=i),n===null&&r.length===0?a:(t.chloridklasse.length>0&&(a.chloridklasse=t.chloridklasse),t.konsistenz.length>0&&(a.konsistenz=t.konsistenz),t.groesstkorn.length>0&&(a.groesstkorn=t.groesstkorn),a)}let lr={id:`fallback`,extract:e=>cr(e.text.all)},ur=[{label:`Polier`,keywords:[`polier`]},{label:`Vorarbeiter`,keywords:[`vorarbeiter`]},{label:`Facharbeiter`,keywords:[`facharbeiter`,`geselle`]},{label:`Werker`,keywords:[`werker`,`bauhelfer`,`helfer`]}],dr={id:`personal`,positionsart:`personal`,extract(e){let t=e.text.all;return{qualifikation:ur.find(e=>e.keywords.some(e=>t.includes(e)))?.label??null,zeiteinheit:e.item.unit}}},fr=[{label:`Statik`,keywords:[`statische berechnung`,`statischer nachweis`,`standsicherheit`]},{label:`Bewehrungsplanung`,keywords:[`bewehrungsplanung`,`bewehrungsplan`]},{label:`Schalplanung`,keywords:[`schalplanung`,`schalplan`]},{label:`Werkplanung`,keywords:Rn},{label:`Gutachten`,keywords:zn}],pr={id:`planung`,positionsart:`planung`,extract(e){let t=e.text.all;return{planungsart:fr.find(e=>e.keywords.some(e=>t.includes(e)))?.label??null}}},mr=[{label:`Einrichten`,keywords:[`einrichten`,`liefern und aufstellen`,`antransport`]},{label:`Vorhalten`,keywords:Ln},{label:`Räumen`,keywords:[`räumen`,`abbauen`,`abtransport`]}],hr=[dr,pr,{id:`baustelleneinrichtung`,positionsart:`baustelleneinrichtung`,extract(e){let t=e.text.all;return{einrichtungsart:mr.find(e=>e.keywords.some(e=>t.includes(e)))?.label??null}}}];var gr=class{nonBauteil=new Map;registerNonBauteil(e){this.nonBauteil.set(e.positionsart,e)}resolveBauteil(){return lr}resolveByPositionsart(e){return this.nonBauteil.get(e)??lr}};function _r(){let e=new gr;for(let t of hr)e.registerNonBauteil(t);return e}var vr=class{registry;constructor(e={}){this.registry=e.registry??_r()}classify(e){let t=An(e),n=Kn(t),r=kn({shortText:e.shortText,longText:e.longText,unit:e.unit,inputFields:e.inputFields,text:t}),i={positionsart:n,keywords:Fn(t),...r.attributes};if(n!==`bauteil`){let a=this.registry.resolveByPositionsart(n),o={item:e,text:t,positionsart:n};return this.result({...i,...a.extract(o)},a.id,r.spans)}let a=this.registry.resolveBauteil(),o={item:e,text:t,positionsart:n};return this.result({...i,...a.extract(o)},a.id,r.spans)}result(e,t,n){return{attributes:e,meta:{classifier:`rule`,ruleset:t,version:2,confidence:1},spans:n}}};function yr(e,t){let{attributes:n,meta:r,spans:i}=t.classify({oz:e.oz,shortText:e.shortText,longText:e.longText,unit:e.unit,inputFields:e.inputFields});return{...e,attributes:{...n,_meta:r,...i.length>0?{_spans:i}:{}}}}function br(e,t){return{...e,positions:e.positions.map(e=>yr(e,t)),sections:e.sections.map(e=>br(e,t))}}function xr(e,t){return{...e,sections:e.sections.map(e=>br(e,t))}}function Sr(e,t){return{...e,lots:e.lots.map(e=>xr(e,t))}}let Cr=null;function wr(e){return e===void 0?(Cr??=new vr,Cr):new vr(e)}let Tr=[`X0`,`XC`,`XD`,`XS`,`XF`,`XA`,`XM`];function Er(e){let t=e===`X0`?`X0`:e.slice(0,2),n=Tr.indexOf(t);return(n<0?Tr.length:n)*10+(Number(e.slice(2))||0)}function Dr(e){return[...e].sort((e,t)=>Er(e)-Er(t))}function Or(e,t,n){return[e,Dr(t).join(`, `),n.join(`, `)].filter(e=>e!==``).join(` · `)}let Z;function kr(){if(Z!==void 0)return Z;let e=k().find(e=>e.id===`beton`);return Z=e===void 0?null:{name:e.name,bauweise:e.merkmale.find(e=>e.name===`Bauweise`)?.key??null,stahlFasern:e.merkmale.find(e=>e.name===`Stahl/Fasern`)?.key??null},Z}function Ar(e){let t=kr();return t!==null&&j(e.attributes,`material`).includes(t.name)}function jr(e){let t=A(e.attributes,`beton`);return t===null?Ar(e)&&N(e.unit)===`m3`?`Ohne Festigkeitsklasse`:null:Or(t,j(e.attributes,`expo`),j(e.attributes,`feuchtigkeitsklasse`))}let Mr={bauteil:`Bauteil`,personal:`Personal`,planung:`Planung`,baustelleneinrichtung:`Baustelleneinrichtung`,nebenleistung:`Nebenleistung`,sonstige:`Sonstige`},Nr={NORMAL:`Normalposition`,ALTERNATIV:`Alternativposition`,BEDARF:`Bedarfsposition`,ZULAGENPOSITION:`Zulageposition`},Pr=[`NORMAL`,`ALTERNATIV`,`BEDARF`,`ZULAGENPOSITION`];function Fr(e){return t=>[...t].sort((t,n)=>{let r=e.indexOf(t),i=e.indexOf(n);return r<0&&i<0?t.localeCompare(n,`de`):r<0?1:i<0?-1:r-i})}let Ir=k().find(e=>e.id===`beton`)?.name;function Q(e){return e===null?[]:[e]}let $=[{id:`positionsart`,label:`Positionsart`,get:e=>Q(A(e.attributes,`positionsart`)),optionLabel:e=>Mr[e]??e,sortValues:Fr(Object.keys(Mr))},{id:`beton`,label:`Druckfestigkeit`,get:e=>Q(A(e.attributes,`beton`)),material:Ir},{id:`expo`,label:`Exposition`,get:e=>j(e.attributes,`expo`),material:Ir},{id:`betonsorte`,label:`Betonsorte`,get:e=>Q(jr(e)),material:Ir,subLabel:`Sorte`},{id:`material`,label:`Material`,get:e=>j(e.attributes,`material`)},...k().flatMap(e=>e.merkmale.map(t=>({id:t.key,label:`${t.name} (${e.name})`,get:e=>j(e.attributes,t.key),material:e.name,subLabel:t.name,sortValues:Fr(t.werte.flatMap(({wert:e})=>e===null?[]:[e]))}))),{id:`keywords`,label:`Besonderheiten`,get:e=>j(e.attributes,`keywords`)},{id:`normen`,label:`Normen`,get:e=>j(e.attributes,`normen`)},{id:`fristen`,label:`Zeitbezug`,get:e=>j(e.attributes,`fristen`)},{id:`platzhalter`,label:`Offene Stellen`,get:e=>j(e.attributes,`platzhalter`)},{id:`positionstyp`,label:`Positionstyp`,get:e=>[e.positionType],optionLabel:e=>Nr[e]??e,sortValues:Fr(Pr)},{id:`einheit`,label:`Einheit`,get:e=>Q(N(e.unit)),optionLabel:P}];new Map($.map(e=>[e.id,e]));function Lr(e){let t=A(e.attributes,`beton`)??``;return{facetValues:$.map(t=>t.get(e)),quantity:e.quantity??0,haystack:ue([e.shortText,e.oz,t,e.longText].join(`
`)).key}}var Rr=class{used=new Set;hashes;constructor(e){this.hashes=e}next(e,t,n){let r=`${e}:${t===``?n:t}`;if(!this.used.has(r))return this.used.add(r),r;let i=2;for(;this.used.has(`${r}#${i}`);)i++;let a=`${r}#${i}`;return this.used.add(a),a}};function zr(e,t){return e===``||t===``?e:e===t?``:e.startsWith(`${t}.`)?e.slice(t.length+1):e}function Br(e){return(e.quantity??0)*(e.unitPrice??0)}function Vr(e,t,n,r){return{id:t.next(`position`,e.oz,`${n}`),kind:`position`,code:e.oz,ownCode:zr(e.oz,r),label:e.shortText===``?null:e.shortText,positionCount:1,totalPrice:Br(e),children:[],position:{oz:e.oz,shortText:e.shortText,longText:e.longText,unit:e.unit,quantity:e.quantity,unitPrice:e.unitPrice,positionType:e.positionType,attributes:e.attributes,hashes:t.hashes.get(e)??ee(e)}}}function Hr(e){let t=0,n=0;for(let r of e)t+=r.positionCount,n+=r.totalPrice;return{positionCount:t,totalPrice:n}}function Ur(e,t,n,r){let i=t.next(`section`,e.number,`${n}`),a=[...e.sections.map((n,r)=>Ur(n,t,r,e.number)),...e.positions.map((n,r)=>Vr(n,t,r,e.number))];return{id:i,kind:`section`,code:e.number,ownCode:zr(e.number,r),label:e.label,...e.text===void 0?{}:{text:e.text},...Hr(a),children:a,position:null}}function Wr(e,t,n){let r=t.next(`lot`,e.number,`${n}`),i=e.sections.map((n,r)=>Ur(n,t,r,e.number));return{id:r,kind:`lot`,code:e.number,ownCode:e.number,label:e.label,...e.text===void 0?{}:{text:e.text},...Hr(i),children:i,position:null}}function Gr(e){let t=new Rr(ne(e)),n=e.lots.map((e,n)=>Wr(e,t,n));return{id:`project`,kind:`project`,code:``,ownCode:``,label:e.projectName,...Hr(n),children:n,position:null}}function Kr(e,t=[]){e.kind===`position`&&t.push(e);for(let n of e.children)Kr(n,t);return t}function qr(e){let t=new Map,n=(e,r)=>{t.set(e.id,r);for(let t of e.children)n(t,e)};return n(e,null),t}function Jr(e){let t=Kr(e).filter(e=>e.position!==null),n=t.length,r=Array(n),i=Array(n),a=new Float64Array(n),o=new Float64Array(n),s=new Float64Array(n),c=new Map;for(let e=0;e<n;e++){let n=t[e],l=n.position;r[e]=l,i[e]=Lr(l),a[e]=l.quantity??NaN,o[e]=l.unitPrice??NaN,s[e]=n.totalPrice,c.set(n.id,e)}return{size:n,nodes:t,positions:r,facts:i,quantity:a,unitPrice:o,totalPrice:s,slotOf:c}}function Yr(e){let t=1/0,n=-1/0;for(let r=0;r<e.length;r++){let i=e[r];Number.isFinite(i)&&(i<t&&(t=i),i>n&&(n=i))}return Number.isFinite(t)?{min:t,max:n}:null}function Xr(e){let t=0;for(let n=0;n<e.length;n++)Number.isFinite(e[n])&&(t+=e[n]);return t}function Zr(e){let t=$.map(()=>new Map);for(let n of e.facts)for(let e=0;e<t.length;e++){let r=t[e];for(let t of n.facetValues[e])r.set(t,(r.get(t)??0)+1)}let n=new Map;return $.forEach((e,r)=>{let i=t[r],a=e.sortValues===void 0?[...i.keys()].sort((e,t)=>e.localeCompare(t,`de`)):e.sortValues([...i.keys()]);n.set(e.id,new Map(a.map(e=>[e,i.get(e)??0])))}),{positionCount:e.size,facets:n,quantity:Yr(e.quantity),unitPrice:Yr(e.unitPrice),totalPrice:Xr(e.totalPrice)}}function Qr(e,t){return t()}let $r=new Set([`mm`,`cm`,`dm`,`m`,`m2`,`m3`,`km`,`kg`,`g`,`t`,`to`,`l`,`ltr`,`stk`,`stck`,`st`,`h`,`std`,`min`,`kn`,`mpa`,`n`]),ei=new Set(`der.die.das.den.dem.des.ein.eine.einer.eines.einem.einen.und.oder.sowie.als.wie.mit.ohne.für.fuer.von.vom.zur.zum.zu.aus.auf.bei.beim.im.in.an.am.nach.über.ueber.unter.je.pro.ist.sind.wird.werden.bis.auch.nur.dabei.daran.dazu.sowohl.ggf.bzw.inkl.incl.einschl.usw`.split(`.`));function ti(e){let t=[];for(let n of e.toLowerCase().split(/[^0-9a-zäöüß²³]+/)){if(n===``)continue;if(/^\d/.test(n)){t.push(`#`);let e=n.replace(/^[\d.,]+/,``);e!==``&&t.push($r.has(ni(e))?`#e`:e);continue}let e=ni(n);if($r.has(e)){t.push(`#e`);continue}ei.has(n)||n.length<2||t.push(n)}return t}function ni(e){return e.replace(/²/g,`2`).replace(/³/g,`3`)}function ri(e){if(e.length<2)return new Set(e);let t=new Set;for(let n=0;n<e.length-1;n++)t.add(`${e[n]} ${e[n+1]}`);return t}function ii(e,t){if(e.size===0||t.size===0)return 0;let[n,r]=e.size<=t.size?[e,t]:[t,e],i=0;for(let e of n)r.has(e)&&i++;return i/(e.size+t.size-i)}function ai(e,t){if(e.length===0)return NaN;if(e.length===1)return e[0];let n=(e.length-1)*t,r=Math.floor(n),i=Math.ceil(n);return e[r]+(e[i]-e[r])*(n-r)}function oi(e){let t=[...e].filter(e=>Number.isFinite(e)).sort((e,t)=>e-t);return t.length===0?null:{count:t.length,min:t[0],q1:ai(t,.25),median:ai(t,.5),q3:ai(t,.75),max:t[t.length-1]}}let si=new Set([`_meta`,`_spans`,`platzhalterAnzahl`]),ci=new Set([`einheit`]),li=` · `;function ui(e){let t=new Map;for(let[n,r]of Object.entries(e.attributes))if(!si.has(n)){if(Array.isArray(r)){let e=r.filter(e=>typeof e==`string`&&e!==``);e.length>0&&t.set(n,[...e].sort((e,t)=>e.localeCompare(t,`de`)).join(li));continue}typeof r==`boolean`?t.set(n,r?`ja`:`nein`):typeof r==`number`?t.set(n,String(r)):typeof r==`string`&&r!==``&&t.set(n,r)}let n=N(e.unit);return n!==null&&t.set(`einheit`,P(n)),t.set(`positionstyp`,e.positionType),t}function di(e){return[...e].sort((e,t)=>e[0]<t[0]?-1:+(e[0]>t[0])).map(([e,t])=>`${e}=${t}`).join(`|`)}function fi(e){let t=ui(e),n=ti(e.shortText),r=ti(e.longText),i=ri(n),a=ri(r);return{bucket:N(e.unit)??`—`,kurz:i,lang:a,alle:[...new Set([...i,...a])],signature:`${n.join(` `)} ${r.join(` `)} ${di(t)}`,merkmale:t,empty:n.length===0&&r.length===0}}function pi(e,t){let n=e.kurz.size>0&&t.kurz.size>0?ii(e.kurz,t.kurz):null,r=e.lang.size>0&&t.lang.size>0?ii(e.lang,t.lang):null;return n===null?r??0:r===null?n:.6*n+.4*r}function mi(e,t){return t===void 0?0:e===t?1:!e.includes(` · `)&&!t.includes(` · `)?0:ii(new Set(e.split(li)),new Set(t.split(li)))}function hi(e,t){let n=0,r=0;for(let[i,a]of e.merkmale)ci.has(i)||(r++,n+=mi(a,t.merkmale.get(i)));for(let n of t.merkmale.keys())ci.has(n)||e.merkmale.has(n)||r++;return r===0?null:n/r}function gi(e,t){let n=pi(e,t),r=hi(e,t);return r===null?n:.7*n+.3*r}var _i=class{parent;constructor(e){this.parent=new Int32Array(e);for(let t=0;t<e;t++)this.parent[t]=t}find(e){let t=e;for(;this.parent[t]!==t;)t=this.parent[t];let n=e;for(;this.parent[n]!==t;){let e=this.parent[n];this.parent[n]=t,n=e}return t}union(e,t){let n=this.find(e),r=this.find(t);n!==r&&(this.parent[r]=n)}};function vi(e,t={}){let n=t.threshold??.62;if(e.size===0)return{clusters:[],clustered:0,total:0,threshold:n};let r=[],i=new Map,a=new Map;for(let t=0;t<e.size;t++){let n=fi(e.positions[t]);if(n.empty)continue;let o=`${n.bucket} ${n.signature}`,s=a.get(o);if(s!==void 0){r[s].slots.push(t);continue}let c=r.length;r.push({slots:[t],profile:n}),a.set(o,c);let l=i.get(n.bucket);l===void 0?i.set(n.bucket,[c]):l.push(c)}let o=new _i(r.length),s=[];for(let e of i.values())e.length>1&&yi(r,e,n,o,s);return bi(e,r,o,s,n)}function yi(e,t,n,r,i){let a=new Map;t.forEach((t,n)=>{for(let r of e[t].profile.alle){let e=a.get(r);e===void 0?a.set(r,[n]):e.push(n)}});let o=new Map;for(let s=0;s<t.length;s++){o.clear();let c=e[t[s]].profile;for(let e of c.alle){let t=a.get(e);if(!(t===void 0||t.length>256))for(let e of t)e>s&&o.set(e,(o.get(e)??0)+1)}let l=Math.min(2,c.alle.length),u=256;for(let[a,d]of o){if(d<l||r.find(t[s])===r.find(t[a]))continue;if(u--<=0)break;let o=gi(c,e[t[a]].profile);o<n||(r.union(t[s],t[a]),i.push({a:t[s],score:o}))}}}function bi(e,t,n,r,i){let a=new Map;t.forEach((e,t)=>{let r=n.find(t),i=a.get(r);i===void 0?a.set(r,[t]):i.push(t)});let o=new Map,s=(e,t)=>{let n=o.get(e);n===void 0?o.set(e,{sum:t,count:1}):(n.sum+=t,n.count++)};for(let e of r)s(n.find(e.a),e.score);t.forEach((e,t)=>{for(let r=1;r<e.slots.length;r++)s(n.find(t),1)});let c=[],l=0;for(let[n,r]of a){let i=r.flatMap(e=>t[e].slots).sort((e,t)=>e-t);if(i.length<2)continue;l+=i.length;let a=o.get(n);c.push(xi(e,i,a===void 0?1:a.sum/a.count))}return c.sort((e,t)=>t.positionIds.length-e.positionIds.length),{clusters:c,clustered:l,total:e.size,threshold:i}}function xi(e,t,n){let r=t.map(t=>e.positions[t]),i=t.map(t=>e.nodes[t].id),{gemeinsameMerkmale:a,unterscheidendeMerkmale:o}=Si(r);return{id:`cluster:${i[0]}`,positionIds:i,label:Ci(r),gemeinsameMerkmale:a,unterscheidendeMerkmale:o,unitPrice:oi(t.map(t=>e.unitPrice[t])),quantity:oi(t.map(t=>e.quantity[t])),similarity:n}}function Si(e){let t=new Map,n=new Map;for(let r of e)for(let[e,i]of ui(r)){let r=t.get(e);r===void 0?t.set(e,new Set([i])):r.add(i),n.set(e,(n.get(e)??0)+1)}let r={},i=[];for(let[a,o]of t)o.size===1&&n.get(a)===e.length?r[a]=[...o][0]:i.push([a,o.size]);return new Set(e.map(e=>e.shortText)).size>1&&i.push([`kurztext`,2]),i.sort((e,t)=>t[1]-e[1]||e[0].localeCompare(t[0],`de`)),{gemeinsameMerkmale:r,unterscheidendeMerkmale:i.map(([e])=>e)}}function Ci(e){let t=new Map;for(let n of e){let e=n.shortText.trim();e!==``&&t.set(e,(t.get(e)??0)+1)}let n=null,r=0;for(let[e,i]of t)(i>r||i===r&&n!==null&&e.length<n.length)&&(n=e,r=i);return n??`Ohne Kurztext`}function wi(e,t,n=null){let r=Sr(e,wr()),i=Gr(r),a=Jr(i),o=Zr(a),s=Qr(`Beziehungen`,()=>vi(a));return{tree:i,projectName:r.projectName,client:r.client,fileName:t,fileId:n,summary:o,check:Ut(a,o,It,qr(i)),relations:s}}self.onmessage=e=>{let{draft:t,fileName:n,fileId:r}=e.data,i;try{i={ok:!0,result:wi(t,n,r)}}catch(e){i={ok:!1,...Ke(e)}}self.postMessage(i)}})();
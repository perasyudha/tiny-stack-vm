let{readdirSync:D,readFileSync:F,mkdirSync:M,writeFileSync:W}=process.getBuiltinModule('fs')
let s,m,o,c,sp,cp,ip,pc,ol,t,n,a,r,R
const P="0qı8:BCK        AAAAAAA9AAA9AAA AAA             °¸¸°0           9@              8818",
V="a+b;a-b;Math.imul(a,b);a/b;a%b;(a>>>0)/(b>>>0);(a>>>0)%(b>>>0);-a;a&b;a|b;a^b;~a;a<<b;a>>b;a>>>b;0;a==b;a<b;(a>>>0)<(b>>>0)".split(';').map(e=>eval('(a,b)=>'+e))
R=(p,i)=>{s=new Int32Array(520);m=s.subarray(260);o=Buffer.alloc(65536);c=new Int32Array(64);sp=cp=ip=pc=ol=t=0;n=p.length
for(;;){
if(t++==1e6)return 10
let x=p[pc],q=P.charCodeAt(x)-48
if(!(q>=0))return x<256?5:9
if(pc+(q>>6)>=n)return 9
let nx=pc+1+(q>>6),pp=q>>3&7
if(sp<pp)return 2
if(sp-pp+(q&7)>256)return 3
if(x>47&x<51)r=p.readInt16LE(nx-2)
pc=nx
if(V[x-16]){a=s[sp-pp];if(x>18&x<23&&!s[sp-1])return 4;s[sp-pp]=V[x-16](a,s[sp-1]);sp-=pp-1;continue}
switch(x){
case 0:return 0
case 1:s[sp++]=p.readInt8(nx-1);break
case 2:s[sp++]=p.readInt32LE(nx-4);break
case 3:sp--;break
case 4:case 6:s[sp]=s[sp+1-(x>>1)];sp++;break
case 5:[s[sp-2],s[sp-1]]=[s[sp-1],s[sp-2]];break
case 7:[s[sp-3],s[sp-2],s[sp-1]]=[s[sp-2],s[sp-1],s[sp-3]];break
case 48:case 49:case 50:if(x<49||!s[--sp]^x>49)pc=nx+r;break
case 51:if(cp==64)return 7;c[cp++]=nx;pc=p.readUInt16LE(nx-2);break
case 52:if(!cp)return 8;pc=c[--cp];break
case 64:case 65:a=s[sp-1]>>>0;if(a>255)return 6;if(x<65)s[sp-1]=m[a];else m[a]=s[sp-2],sp-=2;break
case 80:a=''+s[sp-1];if(ol+a.length>65536)return 11;ol+=o.write(a,ol);sp--;break
case 81:if(ol>65535)return 11;o[ol++]=s[--sp];break
case 82:s[sp++]=i[ip++]??-1;break
case 83:return s[--sp]&255
}}}
let{MAKEFUN_INPUT_DIR:I='/input',MAKEFUN_OUTPUT_DIR:O='/output'}=process.env
for(let id of D(I).sort()){let d=I+'/'+id,e=O+'/'+id,z=R(F(d+'/program.bin'),F(d+'/input.bin'));M(e,{recursive:!0});W(e+'/stdout.bin',o.subarray(0,ol));W(e+'/exit.txt',''+z)}

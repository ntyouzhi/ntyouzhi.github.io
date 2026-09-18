const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'assets', 'tech', 'bike.html');
const outputPath = path.join(root, 'assets', 'tech', 'sharpener.html');
let source = fs.readFileSync(sourcePath, 'utf8');
const parts = [
{id:1,name:'外壳与机架',en:'HOUSING & FRAME',system:'支承系统',color:'#5f91a8',brief:'支承内部零件，并保护使用者。',detail:'刚性机架固定装笔孔、滚刀轴和齿圈；外壳挡住高速转动的零件。模型用半透明侧板展示内部结构。',observe:'旋转模型，观察前后支承如何保持滚刀轴线稳定。',anchor:[.05,1.55,.62],offset:[0,.75,.9]},
{id:2,name:'活动盖板',en:'SLIDING FRONT COVER',system:'夹持推进系统',color:'#de7684',brief:'向外拉开后便于放入铅笔，松手后由弹簧拉回。',detail:'活动盖板沿两根导杆前后滑动。盖板拉开时夹爪张开，松手后弹簧使夹笔器持续把铅笔送向滚刀。',observe:'拆分结构，寻找两根导杆与回位弹簧。',anchor:[-1.25,1.02,.58],offset:[-1.25,.35,.5]},
{id:3,name:'夹笔器',en:'PENCIL CHUCK',system:'夹持推进系统',color:'#c75f71',brief:'夹紧铅笔，并让铅笔稳定、持续地向前。',detail:'三块夹爪均匀围住铅笔。弹簧回拉活动盖板时，夹笔器带着铅笔缓慢靠近滚刀。',observe:'正视装笔孔，比较三块夹爪与铅笔的相对位置。',anchor:[-1.43,1.02,.3],offset:[-1.45,-.2,-.1]},
{id:4,name:'装笔孔与导向套',en:'PENCIL GUIDE',system:'夹持推进系统',color:'#4d7c97',brief:'限定铅笔进入的方向，使笔芯对准滚刀中心。',detail:'导向套的中心孔与滚刀切削区同轴，减少铅笔晃动和偏斜。',observe:'切换正面视图，检查装笔孔、铅笔和滚刀是否同轴。',anchor:[-.91,1.02,-.58],offset:[-.8,.2,-.85]},
{id:5,name:'螺旋滚刀',en:'HELICAL CUTTER',system:'执行系统',color:'#c68535',brief:'旋转并绕铅笔运动，连续削去木材。',detail:'滚刀表面的螺旋刀刃像连续斜面。它一边自转，一边随刀架绕铅笔轴线公转，使切削更均匀。',observe:'运行演示，重点看螺旋刀刃的自转方向。',anchor:[-.05,1.04,.38],offset:[0,.85,.55]},
{id:6,name:'齿轮与主轴',en:'GEARS & SHAFT',system:'传动系统',color:'#9d7c48',brief:'改变转动方向，把摇柄运动传给滚刀。',detail:'摇柄带动主轴和刀架转动；滚刀小齿轮与固定内齿圈啮合，让滚刀同时产生自转与公转。',observe:'从侧面观察大齿圈、小齿轮和滚刀轴的啮合关系。',anchor:[.72,1.02,.55],offset:[.75,.55,.6]},
{id:7,name:'摇柄',en:'CRANK HANDLE',system:'输入系统',color:'#3f819b',brief:'把手的圆周运动输入卷笔刀。',detail:'手握旋钮摇动曲柄，主轴获得转矩。较长的曲柄相当于轮轴，可以用较小的力产生足够转矩。',observe:'运行输入系统，观察旋钮、曲柄和主轴同步转动。',anchor:[1.55,1.62,.2],offset:[1.45,.8,.25]},
{id:8,name:'储屑盒',en:'SHAVINGS DRAWER',system:'支承系统',color:'#d96978',brief:'收集落下的木屑，抽出后便于清理。',detail:'透明储屑盒位于滚刀下方，木屑靠重力落入盒内，避免散落到桌面。',observe:'观察储屑盒为什么要布置在滚刀正下方。',anchor:[.05,.36,.62],offset:[0,-.7,.65]},
{id:9,name:'铅笔',en:'PENCIL',system:'执行系统',color:'#bd3f45',brief:'被夹持、导向并送入切削区的加工对象。',detail:'铅笔沿装笔孔进入。木杆被滚刀逐层削去，露出的笔芯形成圆锥形尖端。',observe:'运行完整过程，观察铅笔怎样前进、木屑怎样落下。',anchor:[-2.02,1.02,.18],offset:[-1.2,0,0]}
];
const systems = [
{key:'power',name:'输入系统',icon:'hand',ids:[7],color:'#3f819b',short:'摇柄 · 人力输入',brief:'把手的圆周运动转化为主轴转动。',detail:'手对旋钮施力，曲柄增大力矩并带动主轴连续转动。',demo:'摇动手柄',steps:['手推动旋钮','曲柄绕轴转动','主轴获得转矩'],view:'perspective'},
{key:'support',name:'支承系统',icon:'frame',ids:[1,8],color:'#5f91a8',short:'外壳 · 机架 · 储屑盒',brief:'固定、保护并收集木屑。',detail:'机架保持各轴同心，外壳隔离运动部件，储屑盒接住落下的木屑。',demo:'结构承托',steps:['机架定位','外壳保护','木屑落入盒中'],view:'perspective'},
{key:'control',name:'夹持推进系统',icon:'focus',ids:[2,3,4],color:'#c75f71',short:'盖板 · 夹爪 · 导向',brief:'夹紧铅笔并持续送入切削区。',detail:'活动盖板、回位弹簧和夹爪共同完成夹持与自动进给，导向套保持铅笔对准中心。',demo:'夹紧与进给',steps:['拉开盖板','夹爪夹住铅笔','弹簧持续推进'],view:'front'},
{key:'transmission',name:'传动系统',icon:'gear',ids:[6],color:'#9d7c48',short:'主轴 · 齿圈 · 小齿轮',brief:'把摇柄转动传递并变换为滚刀复合运动。',detail:'主轴带动刀架公转；滚刀小齿轮沿固定齿圈滚动，使滚刀同时自转。',demo:'齿轮啮合',steps:['主轴转动','刀架公转','小齿轮带动滚刀自转'],view:'side'},
{key:'execution',name:'执行系统',icon:'gear',ids:[5,9],color:'#c68535',short:'螺旋滚刀 · 铅笔',brief:'滚刀连续切削木杆，形成圆锥形笔尖。',detail:'螺旋刀刃以连续斜切方式削去薄木屑。铅笔被稳定推进，直到笔尖达到合适形状。',demo:'完整削笔过程',steps:['铅笔对中','滚刀复合转动','木屑落入储屑盒'],view:'side'}
];
const dataBlock = `var Ee=${JSON.stringify(parts)},jr=${JSON.stringify(systems)},Ei=Object.fromEntries(jr.map(i=>[i.key,i])),gd=Object.fromEntries(jr.flatMap(i=>i.ids.map(t=>[t,i])))`;
const dataStart = source.indexOf('var Ee=['), dataEnd = source.indexOf(';var re=', dataStart);
if (dataStart < 0 || dataEnd < 0) throw new Error('Could not locate source data block');
source = source.slice(0, dataStart) + dataBlock + source.slice(dataEnd);
const builder = String.raw`function xd(){
let i=new Ue,t=new Map,e=new Map;
let n={shell:[12829677,.18,.24],shellLight:[15855346,.08,.3],pink:[14579332,.12,.3],pinkDark:[11951972,.18,.28],blue:[4161947,.42,.24],steel:[13092807,.82,.18],steelDark:[5663368,.7,.23],wood:[2155638,.02,.7],woodLight:[15064713,.04,.62],graphite:[2105376,.38,.22],drawer:[14833399,.08,.2],spring:[11451328,.7,.22],gear:[11306546,.62,.2],white:[16448250,.08,.26],black:[1516320,.12,.82]};
function s(V,W){let key=V+'-'+W;if(!e.has(key)){let a=n[W],tr=W==='shell'||W==='drawer',op=W==='shell'?.24:W==='drawer'?.42:1,m=new vi({color:a[0],metalness:a[1],roughness:a[2],transparent:tr,opacity:op,side:2});m.userData.baseColor=m.color.clone();m.userData.baseMetalness=a[1];m.userData.baseRoughness=a[2];m.userData.baseOpacity=op;e.set(key,m)}return e.get(key)}
for(let V of Ee){let W=new Ue;W.name=V.name;W.userData.partId=V.id;i.add(W);t.set(V.id,W)}
function r(V,G,M){let p=V;for(;p&&!p.userData.partId;)p=p.parent;if(!p)throw new Error('part group required');let m=new pe(G,s(p.userData.partId,M));m.userData.partId=p.userData.partId;m.castShadow=!0;m.receiveShadow=!0;V.add(m);return m}
function box(V,P,S,M='shellLight',R=[0,0,0]){let m=r(V,new Ln(...S,4,4,4),M);m.position.copy(re(P));m.rotation.set(...R);return m}
function rod(V,A,B,R1,R2=R1,M='steel'){let a=re(A),b=re(B),d=b.clone().sub(a),m=r(V,new _i(R2,R1,d.length(),24,1),M);m.position.copy(a.add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(_d,d.normalize());return m}
function cylX(V,P,L,R1,R2=R1,M='steel',seg=40){let m=r(V,new _i(R2,R1,L,seg,1),M);m.position.copy(re(P));m.rotation.z=Math.PI/2;return m}
function ringX(V,P,R,T,M='steelDark',seg=48){let m=r(V,new Nr(R,T,10,seg),M);m.position.copy(re(P));m.rotation.y=Math.PI/2;return m}
function helixX(V,x0,x1,cy,cz,R,turns,M='steel',segments=70,th=.012){let prev=null;for(let k=0;k<=segments;k++){let u=k/segments,q=u*turns*Math.PI*2,p=[x0+(x1-x0)*u,cy+Math.cos(q)*R,cz+Math.sin(q)*R];if(prev)rod(V,prev,p,th,th,M);prev=p}}
function gearX(V,P,R,T,N,M='gear'){let g=new Ue;g.userData.partId=V.userData.partId;g.position.copy(re(P));V.add(g);ringX(g,[0,0,0],R,T,M,N*4);cylX(g,[0,0,0],T*1.8,R*.22,R*.22,'steelDark',28);for(let a=0;a<N;a++){let q=a*Math.PI*2/N,y=Math.cos(q)*(R+T*.35),z=Math.sin(q)*(R+T*.35);box(g,[0,y,z],[T*1.5,T*.75,T*.34],M,[0,q,0])}for(let a=0;a<6;a++){let q=a*Math.PI/3;rod(g,[0,0,0],[0,Math.cos(q)*R*.78,Math.sin(q)*R*.78],T*.16,T*.16,M)}return g}
let frame=t.get(1);for(let z of[-.68,.68])box(frame,[0,1.02,z],[1.72,1.78,.055],'shell');box(frame,[.7,1.02,0],[.08,1.78,1.38],'shellLight');box(frame,[0,.14,0],[1.72,.1,1.38],'shellLight');box(frame,[0,1.91,0],[1.72,.1,1.38],'shellLight');for(let y of[.34,1.7])for(let z of[-.57,.57])rod(frame,[-.76,y,z],[.7,y,z],.026,.026,'blue');
let cover=t.get(2),coverRoot=new Ue;coverRoot.userData.partId=2;cover.add(coverRoot);box(coverRoot,[-1.14,1.02,0],[.16,1.48,1.28],'pink');for(let z of[-.45,.45])rod(coverRoot,[-1.02,.55,z],[.58,.55,z],.035,.035,'steel');for(let z of[-.45,.45])helixX(coverRoot,-.92,-.2,.55,z,.07,6,'spring',42,.014);for(let y of[.42,1.62])box(coverRoot,[-1.24,y,0],[.22,.16,1.06],'pinkDark');
let chuck=t.get(3),jawRoots=[];for(let a=0;a<3;a++){let q=a*Math.PI*2/3,g=new Ue;g.userData.partId=3;g.position.set(-1.38,1.02,0);g.rotation.x=q;chuck.add(g);let j=box(g,[0,.18,0],[.24,.28,.16],'steelDark',[0,0,-.18]);jawRoots.push(g)}ringX(chuck,[-1.4,1.02,0],.34,.065,'pinkDark');
let guide=t.get(4);cylX(guide,[-.94,1.02,0],.18,.28,.28,'blue',48);ringX(guide,[-1.04,1.02,0],.18,.035,'white');cylX(guide,[-.82,1.02,0],.22,.13,.18,'steelDark',40);
let cutter=t.get(5),cutterSpin=new Ue;cutterSpin.userData.partId=5;cutterSpin.position.set(-.08,1.02,0);cutter.add(cutterSpin);cylX(cutterSpin,[0,0,0],1.05,.235,.2,'steelDark',64);for(let h=0;h<5;h++)helixX(cutterSpin,-.51,.51,0,0,.255,2.35,'steel',58,.026);for(let x=-.45;x<=.45;x+=.18)ringX(cutterSpin,[x,0,0],.238,.01,'gear',36);
let drive=t.get(6),mainShaft=cylX(drive,[.63,1.02,0],1.52,.055,.055,'steelDark',32),mainGear=gearX(drive,[.72,1.02,0],.46,.055,18,'gear'),pinion=gearX(drive,[.18,1.02,.37],.15,.04,10,'steel');cylX(drive,[.18,1.02,.18],.54,.04,.04,'steel',24);
let handle=t.get(7),crankRoot=new Ue;crankRoot.userData.partId=7;crankRoot.position.set(.82,1.02,0);handle.add(crankRoot);cylX(crankRoot,[.2,0,0],.42,.09,.09,'blue',36);rod(crankRoot,[.38,0,0],[.38,.58,0],.075,.06,'blue');cylX(crankRoot,[.67,.58,0],.58,.11,.13,'pinkDark',36);ringX(crankRoot,[.39,0,0],.16,.035,'steelDark');
let drawer=t.get(8);box(drawer,[0,.43,0],[1.5,.52,1.2],'drawer');box(drawer,[-.76,.43,0],[.06,.52,1.2],'pinkDark');box(drawer,[-.81,.44,0],[.12,.16,.42],'pink');
let pencil=t.get(9),pencilRoot=new Ue;pencilRoot.userData.partId=9;pencil.add(pencilRoot);cylX(pencilRoot,[-1.92,1.02,0],1.75,.11,.11,'wood',6);cylX(pencilRoot,[-1.03,1.02,0],.36,.025,.11,'woodLight',40);cylX(pencilRoot,[-.84,1.02,0],.12,0,.027,'graphite',24);cylX(pencilRoot,[-2.82,1.02,0],.12,.112,.112,'pinkDark',6);
let demoRoot=new Ue;demoRoot.name='削笔过程';i.add(demoRoot);let chips=[];for(let k=0;k<28;k++){let m=new pe(new _i(.01,.026,.16,8,1),new vi({color:k%3?0xd5a66b:0xc8874d,roughness:.8}));m.rotation.z=(k%7)*.44;demoRoot.add(m);chips.push({m,phase:k/28,side:((k*17)%19)/19-.5})}demoRoot.visible=!1;
i.updateMatrixWorld(!0);let Mt=new Map;for(let V of Ee)Mt.set(V.id,new Ve().setFromObject(t.get(V.id)));
function pose(V,W,ids){for(let p of Ee){let g=t.get(p.id);g.visible=W!==null?p.id===W:ids?ids.includes(p.id):!0;g.position.copy(re(p.offset).multiplyScalar(W!==null||ids?0:V))}demoRoot.visible=demoRoot.visible&&W===null;i.updateMatrixWorld(!0)}
function highlight(V,W=[]){let related=new Set(W);for(let p of Ee){let g=t.get(p.id),active=p.id===V,same=related.has(p.id);g.traverse(m=>{if(!m.isMesh)return;let q=m.material,base=q.userData.baseColor;if(!base)return;q.color.copy(base);q.metalness=q.userData.baseMetalness;q.roughness=q.userData.baseRoughness;q.opacity=q.userData.baseOpacity;q.transparent=q.userData.baseOpacity<1;if(V!==null&&!active&&!same){q.color.lerp(new $t(14539718),.62);q.metalness*=.28;q.roughness=Math.min(1,q.roughness+.25)}else if(active)q.color.lerp(new $t(p.color),.2);q.needsUpdate=!0})}}
function resetMotion(){demoRoot.visible=!1;crankRoot.rotation.x=0;cutterSpin.rotation.x=0;mainGear.rotation.x=pinion.rotation.x=0;coverRoot.position.x=0;pencilRoot.position.x=0;for(let g of jawRoots)g.scale.setScalar(1);i.updateMatrixWorld(!0)}
function chipsAt(W,on){demoRoot.visible=on;for(let c of chips){let u=(W*.22+c.phase)%1;c.m.position.set(-.08,.86-.58*u,c.side*.58*(.3+u));c.m.rotation.x=W*2+c.phase*8;c.m.rotation.z+=.025}}
function runDemo(V,W){let turn=W*2.2;if(V==='power'){crankRoot.rotation.x=-turn;mainGear.rotation.x=-turn;return '摇柄与主轴同步转动：手的圆周运动成为机器的动力输入'}if(V==='transmission'){crankRoot.rotation.x=-turn;mainGear.rotation.x=-turn;pinion.rotation.x=turn*3.1;cutterSpin.rotation.x=turn*3.1;return '刀架随主轴公转，小齿轮沿固定齿圈滚动，带动滚刀快速自转'}if(V==='control'){let u=(Math.sin(W*1.35)+1)/2;coverRoot.position.x=-.38*u;pencilRoot.position.x=-.2*u;for(let g of jawRoots)g.scale.setScalar(.82+.18*u);return u>.55?'活动盖板被拉开，夹爪放松，准备插入铅笔':'弹簧拉回盖板，夹爪夹紧铅笔并持续向滚刀推进'}if(V==='support'){chipsAt(W,!0);return '外壳固定轴线并隔离运动部件，木屑在重力作用下落入透明储屑盒'}if(V==='execution'){crankRoot.rotation.x=-turn;mainGear.rotation.x=-turn;pinion.rotation.x=turn*3.1;cutterSpin.rotation.x=turn*3.1;pencilRoot.position.x=.13*(1-Math.cos(Math.min(W*.24,1)*Math.PI));chipsAt(W,!0);return '铅笔稳定前进，螺旋滚刀连续切削，薄木屑落入储屑盒'}return ''}
function anchor(V,W){return t.get(V).localToWorld(re(W))}
return{root:i,groups:t,materials:e,baseBoxes:Mt,pose,highlight,animate:()=>{},brake:()=>{},steer:()=>{},resetMotion,runDemo,anchor,demoRoot,powerDemoRoot:new Ue,pedals:[],pedalRotor:null,brakeLevers:[],brakeArms:[],chainPoint:()=>new w,chainLength:1,chainPitch:1,chainCount:1,gears:{big:1,small:1},V:re}
}`;
const builderStart = source.indexOf('function xd(){');
const builderEnd = source.indexOf('}var yd={', builderStart);
if (builderStart < 0 || builderEnd < 0) throw new Error('Could not locate source model builder');
source = source.slice(0, builderStart) + builder + source.slice(builderEnd + 1);
const replacements = [
['<meta name="description" content="小学科学3D课堂：自行车结构与五个子系统。支持部件观察、系统演示、离线使用及网页嵌入。">','<meta name="description" content="小学科学3D课堂：精细观察手摇卷笔刀的结构、简单机械与协同工作过程。">'],
['<title>自行车 · 小学科学3D课堂</title>','<title>手摇卷笔刀 · 小学科学3D课堂</title>'],
['<h1>自行车<span>结构探索</span></h1>','<h1>手摇卷笔刀<span>结构与功能</span></h1>'],
['<b>物质世界</b><span>力与运动 · 教材 P43–45</span>','<b>技术工程</b><span>它们是怎样工作的 · 教材 P38–40</span>'],
['aria-label="自行车观察目录"','aria-label="手摇卷笔刀观察目录"'],
['教材编号 1–9 <span>含脚踏板补充观察</span>','教材结构 1–9 <span>含加工对象铅笔</span>'],
['<i data-icon="bicycle"></i><span>整车概览</span>','<i data-icon="gear"></i><span>整机概览</span>'],
['<h2>自行车怎样工作？</h2>','<h2>手摇卷笔刀怎样工作？</h2>'],
['选择一个零部件，观察它的形状、位置，以及它与同一系统中其他部件的联系。','选择一个零部件，观察它的形状、位置、作用，以及它与其他部件的联系。'],
['<strong>动力来自骑行者</strong><p>人通过踩脚踏板产生动力。脚踏板是人力输入的部位。</p>','<strong>动力来自摇柄</strong><p>手摇曲柄输入转动，齿轮使滚刀产生自转与公转。</p>'],
['<div class="power-note"><i data-icon="pedal"></i>','<div class="power-note"><i data-icon="gear"></i>'],
['依据教材图片重建的教学模型。<br>遮挡结构按常见自行车补全。','依据教材 P38–40 的手摇卷笔刀重建。<br>内部遮挡结构按常见机构补全。'],
['物质世界 · 自行车','技术工程 · 手摇卷笔刀'],
['从部件，理解整个系统','从夹持、传动到切削，理解整机协同'],
['<h2 id="part-name">车座</h2>','<h2 id="part-name">外壳与机架</h2>'],
['<p id="part-en" class="part-en">SADDLE</p>','<p id="part-en" class="part-en">HOUSING & FRAME</p>'],
['<span id="part-system" class="system-tag">支承系统</span>','<span id="part-system" class="system-tag">支承系统</span>'],
['观察踩踏输入动力、支承、转向制动、链条传动或车轮滚动。','观察摇柄输入、齿轮传动、夹持推进、滚刀切削和木屑收集。'],
['window.bicycleLab','window.sharpenerLab'],
['C.selected!==3','!0']
];
for (const [from,to] of replacements) source = source.replaceAll(from,to);
source = source.replaceAll('自行车三维模型', '手摇卷笔刀三维模型');
source = source.replaceAll(String.raw`\u81EA\u884C\u8F66`, String.raw`\u624B\u6447\u5377\u7B14\u5200`);
source = source.replaceAll('整车', '整机');
source = source.replaceAll(String.raw`\u6574\u8F66`, String.raw`\u6574\u673A`);
source = source.replaceAll('read_bicycle_observation', 'read_sharpener_observation');
source = source.replaceAll('set_bicycle_observation', 'set_sharpener_observation');
source = source.replaceAll('自行车观察状态', '手摇卷笔刀观察状态');
source = source.replaceAll('设置自行车观察状态', '设置手摇卷笔刀观察状态');
source = source.replaceAll('var tx={1:[-36,-46],2:[-18,-16],3:[73,-16],4:[-45,-71],5:[-59,-12],6:[52,32],7:[-48,53],8:[13,85],9:[54,27],10:[78,48]}', 'var tx={1:[36,-55],2:[-62,-38],3:[-78,8],4:[-42,48],5:[15,-56],6:[48,-28],7:[70,-60],8:[25,60],9:[-68,62]}');
source = source.replaceAll('de.position.set(2.2,2.5,6.6)', 'de.position.set(4.6,3.2,6.9)');
source = source.replaceAll('Vt.target.set(0,.86,0)', 'Vt.target.set(-.05,1.02,0)');
source = source.replaceAll('--accent:#8a62a7;--accent-wash:#eee6f2;', '--accent:#3a7893;--accent-wash:#e4f1f5;');
source = source.replaceAll('color:#8a62a7', 'color:#3a7893');
source = source.replaceAll('border:1px solid #d8c7e2', 'border:1px solid #bdd8e2');
source = source.replaceAll(' / 09', ' / 09');
fs.writeFileSync(outputPath, source);
console.log(`Wrote ${outputPath} (${source.length} chars)`);

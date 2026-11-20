export const CATEGORIES = ["Civic", "Literar", "Creștin", "Științific", "Filosofic", "Impostor"];
export const PROMPTS = [
 {category:"Civic",type:"desen",text:"Desenează un cetățean care ajută comunitatea."},
 {category:"Civic",type:"text",text:"Scrie un motto despre responsabilitatea față de ceilalți."},
 {category:"Civic",type:"desen",text:"Desenează o comunitate în care oamenii colaborează."},
 {category:"Literar",type:"text",text:"Scrie începutul unei povești inspirate de lumea antică."},
 {category:"Literar",type:"desen",text:"Desenează o scenă inspirată de un mit antic."},
 {category:"Literar",type:"text",text:"Scrie un citat despre puterea cărților și a educației."},
 {category:"Creștin",type:"desen",text:"Desenează un simbol al credinței sau al iubirii aproapelui."},
 {category:"Creștin",type:"text",text:"Scrie un îndemn despre bunătate și iertare."},
 {category:"Științific",type:"desen",text:"Desenează un savant care cercetează natura."},
 {category:"Științific",type:"text",text:"Scrie o propoziție despre importanța dovezilor."},
 {category:"Filosofic",type:"desen",text:"Desenează un simbol al cunoașterii de sine."},
 {category:"Filosofic",type:"text",text:"Scrie o idee despre libertatea de gândire și rațiune."},
 {category:"Impostor",type:"desen",text:"Desenează un animal fantastic de pe o planetă îndepărtată."},
 {category:"Impostor",type:"text",text:"Scrie o reclamă amuzantă pentru o invenție imaginară."}
];
const svg = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
export const TEMPLATES = [
 {id:"b1",category:"Civic",kind:"text",content:"Un cetățean adevărat se gândește și la binele comunității."},
 {id:"b2",category:"Civic",kind:"drawing",content:svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360"><rect width="600" height="360" fill="#fff"/><path d="M40 300H560" stroke="#333" stroke-width="5"/><path d="M90 300V170L180 110L270 170V300M330 300V145L420 85L510 145V300" fill="#e8b86f" stroke="#333" stroke-width="5"/><circle cx="180" cy="205" r="22" fill="#d77e6d"/><circle cx="420" cy="180" r="22" fill="#6d9cc7"/><path d="M180 230V285M420 205V285M200 245L400 225" stroke="#333" stroke-width="9" stroke-linecap="round"/><path d="M260 250L300 220L340 250" fill="none" stroke="#399b72" stroke-width="10"/></svg>')},
 {id:"b3",category:"Literar",kind:"text",content:"Cărțile vechilor autori sunt izvoare de cunoaștere."},
 {id:"b4",category:"Literar",kind:"drawing",content:svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360"><rect width="600" height="360" fill="#fff"/><path d="M100 100Q200 65 300 110V290Q200 245 100 280Z" fill="#f2d9a7" stroke="#333" stroke-width="6"/><path d="M300 110Q400 65 500 100V280Q400 245 300 290Z" fill="#f2d9a7" stroke="#333" stroke-width="6"/><path d="M300 110V290M140 145L250 160M140 190L250 205M350 160L460 145M350 205L460 190" stroke="#9b7653" stroke-width="6"/></svg>')},
 {id:"b5",category:"Creștin",kind:"text",content:"Credința și iubirea aproapelui îl îndeamnă pe om să facă binele."},
 {id:"b6",category:"Creștin",kind:"drawing",content:svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360"><rect width="600" height="360" fill="#fff"/><path d="M300 55V210M235 120H365" stroke="#c58a47" stroke-width="22" stroke-linecap="round"/><path d="M300 320C180 245 115 200 155 145C195 90 260 135 300 180C340 135 405 90 445 145C485 200 420 245 300 320Z" fill="#d77e6d" stroke="#333" stroke-width="6"/></svg>')},
 {id:"b7",category:"Științific",kind:"text",content:"Observă, pune întrebări, cercetează și verifică înainte de concluzii."},
 {id:"b8",category:"Științific",kind:"drawing",content:svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360"><rect width="600" height="360" fill="#fff"/><path d="M250 65H350M270 65V170L190 290Q180 315 220 315H380Q420 315 410 290L330 170V65" fill="#b8d9e8" stroke="#333" stroke-width="7"/><path d="M225 260Q300 225 375 260" fill="none" stroke="#4289aa" stroke-width="8"/><circle cx="285" cy="240" r="10" fill="#d77e6d"/><circle cx="330" cy="280" r="8" fill="#d77e6d"/></svg>')},
 {id:"b9",category:"Filosofic",kind:"text",content:"Omul se cunoaște pe sine când își cercetează propriile idei."},
 {id:"b10",category:"Filosofic",kind:"drawing",content:svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360"><rect width="600" height="360" fill="#fff"/><circle cx="300" cy="170" r="105" fill="#f3d8a5" stroke="#333" stroke-width="7"/><path d="M250 150Q270 125 290 150M310 150Q330 125 350 150M260 210Q300 245 340 210" fill="none" stroke="#333" stroke-width="8" stroke-linecap="round"/><path d="M300 20V55M300 285V330M130 170H165M435 170H470" stroke="#c58a47" stroke-width="8"/></svg>')},
 {id:"b11",category:"Impostor",kind:"text",content:"Un dragon albastru a ascuns o comoară într-un castel."},
 {id:"b12",category:"Impostor",kind:"drawing",content:svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360"><rect width="600" height="360" fill="#fff"/><path d="M130 250Q100 100 300 85Q500 100 470 250Z" fill="#8fc77c" stroke="#333" stroke-width="7"/><circle cx="250" cy="175" r="15" fill="#fff"/><circle cx="350" cy="175" r="15" fill="#fff"/><circle cx="250" cy="175" r="7" fill="#333"/><circle cx="350" cy="175" r="7" fill="#333"/><path d="M260 220Q300 245 340 220" fill="none" stroke="#333" stroke-width="7"/><path d="M160 120L100 70M440 120L500 70" stroke="#8fc77c" stroke-width="22" stroke-linecap="round"/></svg>')}
];
export const pick = a => a[Math.floor(Math.random()*a.length)];
export const shuffle = a => [...a].sort(()=>Math.random()-.5);
export function makeRound(order,index){
 const who=order[index%order.length], mode=Math.random()<.5?'A':'B';
 if(mode==='A'){const category=pick(CATEGORIES),prompt=pick(PROMPTS.filter(p=>p.category===category));return {number:index+1,mode,creatorId:who.id,creatorName:who.name,category,prompt,phase:'creating',votes:{},templateVotes:{},artwork:null};}
 const template=pick(TEMPLATES),choices=shuffle([template,...shuffle(TEMPLATES.filter(t=>t.id!==template.id)).slice(0,5)]);
 return {number:index+1,mode,creatorId:who.id,creatorName:who.name,category:template.category,template,choices,prompt:{type:template.kind==='drawing'?'desen':'text',text:'Reprodu cât mai fidel modelul original.'},phase:'creating',votes:{},templateVotes:{},artwork:null};
}

export type MaterialGroup = 'earth' | 'building' | 'nature' | 'outdoor';
export type MaterialRole = 'floor' | 'structure' | 'decoration' | 'fence' | 'water';
export const GROUP_NAMES:Record<MaterialGroup,string>={earth:'Đất',building:'Xây dựng',nature:'Thiên nhiên',outdoor:'Công trình'};
export const MATERIALS = [
  {id:'grass',name:'Đất cỏ',group:'earth',role:'floor',note:'1 ô nền = 1 m²'},
  {id:'dirt',name:'Đất',group:'earth',role:'floor',note:'1 ô nền = 1 m²'},
  {id:'stone',name:'Đá',group:'earth',role:'floor',note:'1 ô sàn = 1 m²'},
  {id:'paving',name:'Gạch lát',group:'earth',role:'floor',note:'1 ô sàn = 1 m²'},
  {id:'wood',name:'Sàn gỗ',group:'earth',role:'floor',note:'1 ô sàn = 1 m²'},
  {id:'sand',name:'Cát',group:'earth',role:'floor',note:'1 ô nền = 1 m²'},
  {id:'brick',name:'Gạch xây',group:'building',role:'floor',note:'Khối nền gạch: 1 m²'},
  {id:'brick-wall',name:'Tường gạch',group:'building',role:'structure',note:'Đặt trên sàn · không cộng S'},
  {id:'wood-wall',name:'Tường gỗ',group:'building',role:'structure',note:'Đặt trên sàn · không cộng S'},
  {id:'stone-column',name:'Cột đá',group:'building',role:'structure',note:'Trang trí trên sàn · không cộng S'},
  {id:'wood-column',name:'Cột gỗ',group:'building',role:'structure',note:'Trang trí trên sàn · không cộng S'},
  {id:'stairs',name:'Bậc thang',group:'building',role:'structure',note:'Đặt trên sàn · không tạo sàn mới'},
  {id:'roof',name:'Mái',group:'building',role:'structure',note:'Mái hoàn thiện · không cộng S'},
  {id:'oak',name:'Cây xanh',group:'nature',role:'decoration',note:'Trồng trên sàn · không cộng S'},
  {id:'pine',name:'Thông nhỏ',group:'nature',role:'decoration',note:'Trồng trên sàn · không cộng S'},
  {id:'cherry',name:'Cây hoa',group:'nature',role:'decoration',note:'Trồng trên sàn · không cộng S'},
  {id:'bush',name:'Bụi cây',group:'nature',role:'decoration',note:'Trồng trên sàn · không cộng S'},
  {id:'flowers',name:'Hoa',group:'nature',role:'decoration',note:'Trồng trên sàn · không cộng S'},
  {id:'moss-rock',name:'Đá rêu',group:'nature',role:'decoration',note:'Đặt trên sàn · không cộng S'},
  {id:'fence',name:'Hàng rào',group:'outdoor',role:'fence',note:'Đặt ở mép sàn · không cộng S/P'},
  {id:'bridge',name:'Cầu gỗ',group:'outdoor',role:'floor',note:'1 ô cầu đi được = 1 m² sàn'},
  {id:'path',name:'Lối đi',group:'outdoor',role:'floor',note:'1 ô nền đường = 1 m²'},
  {id:'water',name:'Ô hồ',group:'outdoor',role:'water',note:'Tầng đất · không cộng S/P'},
  {id:'lamp',name:'Đèn vườn',group:'outdoor',role:'decoration',note:'Đặt trên sàn · không cộng S'},
] as const satisfies readonly {id:string;name:string;group:MaterialGroup;role:MaterialRole;note:string}[];
export type MaterialId=typeof MATERIALS[number]['id'];
export const material=(id:MaterialId)=>MATERIALS.find(m=>m.id===id)!;
export const isMaterial=(id:unknown):id is MaterialId=>MATERIALS.some(m=>m.id===id);
export const materialLayer=(id:MaterialId)=>material(id).role==='floor'?'floor':id==='water'?'water':'feature';
export const needsOpenSky=(id:MaterialId)=>['oak','pine','cherry','roof','lamp'].includes(id);

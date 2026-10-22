import { asFloor, blockKey, objectiveIssue, rectangle } from './construction';
import { BuildPoint, Difficulty, GardenQuest } from './model';
const rows=(widths:number[])=>widths.flatMap((w,y)=>rectangle(w,1).map(p=>({x:p.x,y})));
export function generateGardenQuests(mode:Difficulty):GardenQuest[]{
  const easy=[rows([4,4,4,4]),rows([6,4,4,4]),rows([6,6,4,4]),rows([8,6,4,4]),rows([8,8,6,6]),rows([10,8,6,6])];
  const medium=[rectangle(2,2),rectangle(3,2),rows([3,3,2]),rectangle(3,3),rows([4,3,3]),rectangle(4,3)];
  const high=[
    [rectangle(2,2),rectangle(2,2)],
    [rectangle(3,2),rectangle(2,2)],
    [rows([3,3,2]),rectangle(3,2)],
    [rectangle(3,3),rectangle(3,2),rectangle(2,2)],
    [rectangle(4,3),rectangle(3,3),rectangle(3,2)],
    [rectangle(4,4),rectangle(4,3),rectangle(3,3)],
  ];
  const titles=mode==='easy'?['Vườn của Thỏ Mầm','Mở rộng đường bao','Khu vườn lớn dần','Đường dạo quanh vườn','Sân vườn sum vầy','Khu vườn mơ ước']:mode==='medium'?['Nền vườn đầu tiên','Mở rộng sân','Góc vườn mới','Sân vuông xanh','Lối ra vườn','Khu vườn hoàn chỉnh']:['Nhà Mầm hai tầng','Mở rộng chân nhà','Thư viện xanh','Thêm tầng sáng tạo','Học viện bên hồ','Lâu đài Mầm Xanh'];
  const quests=Array.from({length:6},(_,i):GardenQuest=>{
    const id=`${mode}-${i+1}`,layers=mode==='hard'?high[i]:[mode==='easy'?easy[i]:medium[i]];
    const witness:BuildPoint[]=layers.flatMap((points,floorIndex)=>points.map(p=>({...p,x:p.x+5,y:p.y+6,floorIndex,missionId:id})));
    const area=mode==='easy'&&i%2===1?undefined:witness.length;
    const perimeter=mode==='easy'&&i%2===0?undefined:layers[0].length?2*(Math.max(...layers[0].map(p=>p.x))+Math.max(...layers[0].map(p=>p.y))+2):0;
    const description=mode==='hard'?`Xây tiếp ${layers.length} tầng. Tổng sàn ${area} m²; chu vi tầng 1 ${perimeter} m. Mỗi tầng ≥4 ô, có ô đỡ.`:area===undefined?`Mở rộng vườn hiện tại để chu vi đạt ${perimeter} m. Khối cũ vẫn tính.`:perimeter===undefined?`${i?'Xây tiếp để tổng':'Xây vườn có'} diện tích đạt ${area} m².`:`Xây tiếp: tổng diện tích ${area} m² và chu vi ${perimeter} m.`;
    return {id,title:titles[i],description,area,perimeter,floors:layers.length,minFloorArea:mode==='hard'?4:1,witness};
  });
  for(let i=0;i<quests.length;i++){
    const q=quests[i],set=new Set(q.witness.map(blockKey));
    if(objectiveIssue(q.witness.map(asFloor),q)||i>0&&quests[i-1].witness.some(p=>!set.has(blockKey(p))))throw Error(`Invalid cumulative blueprint: ${q.id}`);
  }
  return quests;
}

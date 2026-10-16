import { EndlessHistory } from '../logic/history';
import type { EndlessRecord } from '../logic/controller';
const memory=new Map<string,string>();
const storage={getItem:async(k:string)=>memory.get(k)??null,setItem:async(k:string,v:string)=>{memory.set(k,v);},removeItem:async(k:string)=>{memory.delete(k);},clear:async()=>{memory.clear();}};
const record=(id:string,date:string,score=10):EndlessRecord=>({id,playedAt:date,score,kills:score/10,completedWave:1,durationSeconds:36,reason:'exit'});
beforeEach(()=>memory.clear());
test('history survives store re-creation, sorts latest first and preserves separate runs',async()=>{
  const h=new EndlessHistory(storage);await h.save(record('a','2026-10-16T01:00:00Z',10));await h.save(record('b','2026-10-17T01:00:00Z',50));
  const rows=await new EndlessHistory(storage).list();expect(rows.map(r=>r.id)).toEqual(['b','a']);expect(Math.max(...rows.map(r=>r.score))).toBe(50);
});
test('concurrent completion callbacks cannot duplicate a record or lose another run',async()=>{
  const h=new EndlessHistory(storage);await Promise.all([h.save(record('a','2026-10-16')),h.save(record('a','2026-10-16')),h.save(record('b','2026-10-17'))]);
  expect((await h.list()).map(r=>r.id)).toEqual(['b','a']);
});
test('storage errors are exposed instead of pretending data persisted',async()=>{
  const h=new EndlessHistory({...storage,setItem:async()=>{throw new Error('disk');}});await expect(h.save(record('a','2026-10-16'))).rejects.toThrow();
});
test('corrupt existing history is not silently overwritten',async()=>{
  const h=new EndlessHistory(storage);memory.set('@tro_choi_cho_em:energy-defense:endless:v1','bad json');
  await expect(h.save(record('a','2026-10-16'))).rejects.toThrow();expect([...memory.values()]).toEqual(['bad json']);
});

import { QuestionHistory } from '../math/questionHistory';

test('late hydration preserves newer questions, caps rows and serializes coalesced writes',async()=>{
  let resolve!:(s:string)=>void;const writes:string[]=[];
  const store={getItem:()=>new Promise<string>(r=>{resolve=r;}),setItem:async(_k:string,v:string)=>{writes.push(v);}};
  const h=new QuestionHistory(store,'test',3);h.remember('energy:warmup','new');
  resolve(JSON.stringify({version:1,groups:{'energy:warmup':['old','new','previous']}}));await h.ready;
  expect(h.recent('energy:warmup')).toEqual(['old','previous','new']);
  for(const v of ['a','b','c','d'])h.remember('energy:warmup',v);await h.flush();
  expect(h.recent('energy:warmup')).toEqual(['b','c','d']);expect(JSON.parse(writes.at(-1)!).groups['energy:warmup']).toEqual(['b','c','d']);
  const next=new QuestionHistory({getItem:async()=>writes.at(-1)!,setItem:async()=>{}},'test',3);await next.ready;
  expect(next.recent('energy:warmup')).toEqual(['b','c','d']);
});
test('corrupt, rejecting and hanging storage cannot stall question history',async()=>{
  jest.useFakeTimers();
  for(const getItem of [async()=>'{bad',async()=>{throw Error('disk');},()=>new Promise<null>(()=>{})]){
    const h=new QuestionHistory({getItem,setItem:async()=>{throw Error('disk');}},'test');h.remember('race:medium','fresh');
    await jest.advanceTimersByTimeAsync(501);await h.flush();expect(h.recent('race:medium')).toEqual(['fresh']);
  }
  jest.useRealTimers();
});

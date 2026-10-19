import { defaultStorage } from '../storage/localStorageAdapter';
import type { IStorageAdapter } from '../storage/storageAdapter';

type Rows = Record<string, string[]>;
/** One owner/queue per storage key. Loading merges behind local additions, never over them.
 * Persistence observes questions only; it owns no gameplay timer or random source. */
export class QuestionHistory {
  readonly ready: Promise<void>;
  private rows: Rows = {};
  private members=new Map<string,Set<string>>();
  private hydrated = false;
  private dirty = false;
  private writing: Promise<void> | null = null;
  constructor(private storage: Pick<IStorageAdapter,'getItem'|'setItem'>, private key: string, readonly limit=200) {
    this.ready=this.load();
  }
  private async load() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const raw=await Promise.race([this.storage.getItem(this.key),new Promise<null>(resolve=>{timer=setTimeout(()=>resolve(null),500);})]);
      if(raw){const data=JSON.parse(raw) as {version?:number;groups?:unknown};
        if(data.version===1&&data.groups&&typeof data.groups==='object'&&!Array.isArray(data.groups)) {
          for(const [group,values] of Object.entries(data.groups).slice(0,32)) {
            if(!/^[a-z0-9:-]{1,60}$/.test(group)||!Array.isArray(values))continue;
            const old=values.filter((v):v is string=>typeof v==='string'&&v.length<=1000).slice(-this.limit);
            this.rows[group]=[...new Set([...old,...(this.rows[group]??[])].reverse())].reverse().slice(-this.limit);
            this.members.delete(group);
          }
        }
      }
    } catch { /* A storage failure cannot stop a game. Keep local memory. */ }
    finally {if(timer)clearTimeout(timer);this.hydrated=true;this.pump();}
  }
  recent(group:string): readonly string[] {return this.rows[group]??[];}
  has(group:string,key:string){let set=this.members.get(group);if(!set){set=new Set(this.recent(group));this.members.set(group,set);}return set.has(key);}
  remember(group:string,fingerprint:string) {
    if(!/^[a-z0-9:-]{1,60}$/.test(group)||fingerprint.length>1000)throw Error('Invalid question identity');
    this.rows[group]=[...(this.rows[group]??[]).filter(v=>v!==fingerprint),fingerprint].slice(-this.limit);
    this.members.delete(group);
    this.dirty=true;this.pump();
  }
  private pump() {
    if(!this.hydrated||this.writing||!this.dirty)return;
    this.writing=Promise.resolve().then(async()=>{
      while(this.dirty){this.dirty=false;const value=JSON.stringify({version:1,groups:this.rows});
        try {await this.storage.setItem(this.key,value);} catch { /* retry with a later question */ }
      }
    }).finally(()=>{this.writing=null;if(this.dirty)this.pump();});
  }
  async flush(){await this.ready;while(this.writing)await this.writing;}
}
export const questionHistory=new QuestionHistory(defaultStorage,'@tro_choi_cho_em:questions:v1');

/** Session-owned set; recent history is separately bounded and survives new sessions. */
export class QuestionSession {
  private used=new Set<string>();
  constructor(readonly history:QuestionHistory,readonly group:string){}
  allows(key:string){return !this.used.has(key)&&!this.history.has(this.group,key);}
  unused(key:string){return !this.used.has(key);}
  accept(key:string){this.used.add(key);this.history.remember(this.group,key);}
}

export function dateLabel(value,time=false){return new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',...(time?{timeStyle:'short'}:{}),timeZone:'Asia/Bangkok'}).format(new Date(value));}
export function stateOf(c,now){return Date.parse(c.opens_at)>now?'waiting':'ready';}

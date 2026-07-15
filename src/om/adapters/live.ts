import type { OmLiveMatch } from '../types/om';
export async function getOmLiveMatch():Promise<OmLiveMatch>{return{status:'LIVE',competition:'Ligue 1',minute:"64'",home:{code:'OM',name:'Olympique de Marseille',score:2},away:{code:'ADV',name:'Adversaire',score:1},stadium:'Orange Vélodrome',events:[{minute:"64'",type:'attack',team:'OM',text:'OM pousse côté droit.'}]};}

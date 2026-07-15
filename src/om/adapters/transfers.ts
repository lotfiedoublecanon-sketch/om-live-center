import type { OmTransferItem } from '../types/om';
export async function getOmTransfers():Promise<OmTransferItem[]>{return[{id:'mock-transfer-1',player:'Cible offensive',direction:'arrival',status:'RUMEUR',reliability:62,source:'Mock source à remplacer'}];}

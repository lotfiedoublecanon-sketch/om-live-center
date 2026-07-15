import type { OmNewsItem } from '../types/om';
export async function getOmNews():Promise<OmNewsItem[]>{return[{id:'mock-news-1',title:'Avant-match : l’OM veut confirmer',source:'Mock source à remplacer',tag:'Actu',publishedAt:new Date().toISOString()}];}

import type { Request, Response } from 'express';
import { getOmLiveMatch } from '../adapters/live';
import { getOmNews } from '../adapters/news';
import { getOmTransfers } from '../adapters/transfers';
let cache:{expires:number;data:unknown}|null=null;
export async function omWidgetApi(_req:Request,res:Response){const now=Date.now();if(cache&&cache.expires>now){res.setHeader('x-cache','HIT');return res.json(cache.data);}const [hero,news,transfers]=await Promise.all([getOmLiveMatch(),getOmNews(),getOmTransfers()]);const data={hero,news,transfers,fixtures:[],generatedAt:new Date().toISOString()};cache={expires:now+60_000,data};res.setHeader('x-cache','MISS');return res.json(data);}

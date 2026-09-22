/**
 * Data folder ek hi jagah se tay hota hai.
 *
 * Render par har service ka apna root hota hai, isliye data ab backend ke
 * andar rehta hai (repo ke root me nahi). DATA_DIR se jagah badal sakte ho --
 * Render ka persistent disk isi ke kaam aayega, jaise DATA_DIR=/var/data
 */
import path from 'node:path';

export const DATA_DIR = path.resolve(process.cwd(), process.env.DATA_DIR || 'data');

export const dataFile = (name) => path.join(DATA_DIR, name);

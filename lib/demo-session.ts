import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readdir, rm, readFile, writeFile, stat, utimes } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { NextRequest, NextResponse } from 'next/server';
import { localVerificationEnabled } from './app-mode';
const sessionGlobals = globalThis as typeof globalThis & { socialADemoSecret?: Buffer };
const secret = sessionGlobals.socialADemoSecret ??= randomBytes(32);
const base = path.join(os.tmpdir(), 'social-a-demo');
const root = path.join(base, createHmac('sha256', secret).update('directory').digest('hex').slice(0, 20));
const ttl = 24 * 3600000;
const cookie = 'social_a_demo';
function sign(value: string) { return createHmac('sha256', secret).update(value).digest('hex'); }
function valid(token?: string) {
  if (!token || token.length > 200) return null;
  const [id, issued, signature] = token.split('.');
  if (!/^[a-f0-9]{48}$/.test(id || '') || !/^\d{13}$/.test(issued || '') || !/^[a-f0-9]{64}$/.test(signature || '')) return null;
  const time = Number(issued);
  if (time > Date.now() || time + ttl <= Date.now()) return null;
  return timingSafeEqual(Buffer.from(sign(`${id}.${issued}`)), Buffer.from(signature)) ? `${id}.${issued}` : null;
}
export function demoOriginAllowed(request: NextRequest) {
  const expected = process.env.SOCIAL_A_DEMO_ORIGIN || 'http://127.0.0.1:43170';
  const origin = request.headers.get('origin');
  return request.headers.get('host') === new URL(expected).host && (!origin || origin === expected) && request.headers.get('sec-fetch-site') !== 'cross-site';
}
let lastSweep = 0;
async function sweepOrphans() {
  if (Date.now() - lastSweep < 60000) return;
  lastSweep = Date.now();
  await mkdir(root, { recursive: true, mode: 0o700 });
  await writeFile(path.join(root, '.owner'), String(process.pid), { mode: 0o600 });
  for (const entry of await readdir(base)) {
    if (!/^[a-f0-9]{20}$/.test(entry) || path.join(base, entry) === root) continue;
    const other = path.join(base, entry);
    try {
      const pid = Number(await readFile(path.join(other, '.owner'), 'utf8'));
      if (!Number.isSafeInteger(pid) || pid < 1) continue;
      try { process.kill(pid, 0); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ESRCH') await rm(other, { recursive: true, force: true }); }
    } catch { const info = await stat(other).catch(() => null); if (info && info.mtimeMs + ttl < Date.now()) await rm(other, { recursive: true, force: true }); }
  }
}
export async function reserveCapacity(directory: string, limit = 500) {
  const names = (await readdir(directory)).filter(name => /^[a-f0-9]{48}\.\d{13}$/.test(name));
  const entries = (await Promise.all(names.map(async name => ({ name, info: await stat(path.join(directory, name)).catch(() => null) })))).filter(e => e.info);
  entries.sort((a,b) => a.info!.mtimeMs - b.info!.mtimeMs);
  for (const entry of entries.slice(0, Math.max(0, entries.length - limit + 1))) await rm(path.join(directory, entry.name), { recursive: true, force: true });
}
export async function demoSession(request: NextRequest) {
  if (localVerificationEnabled()) return { directory: process.env.SOCIAL_A_DEMO_DIRECTORY || path.join(process.cwd(), '.runtime'), apply: (response: NextResponse) => response };
  await sweepOrphans();
  const token = request.cookies.get(cookie)?.value;
  let key = valid(token);
  if (!key) {
    await mkdir(root, { recursive: true, mode: 0o700 });
    const dirs = await readdir(root);
    for (const dir of dirs) if (/^[a-f0-9]{48}\.\d{13}$/.test(dir) && Number(dir.split('.')[1]) + ttl < Date.now()) await rm(path.join(root, dir), { recursive: true, force: true });
    await reserveCapacity(root);
    key = `${randomBytes(24).toString('hex')}.${Date.now()}`;
  }
  const directory = path.join(root, key); await mkdir(directory, { recursive: true, mode: 0o700 });
  await utimes(directory, new Date(), new Date());
  return { directory, apply: (response: NextResponse) => { response.headers.set('Cache-Control', 'no-store'); response.cookies.set(cookie, `${key}.${sign(key!)}`, { httpOnly: true, sameSite: 'lax', secure: (process.env.SOCIAL_A_DEMO_ORIGIN || '').startsWith('https:'), path: '/', maxAge: ttl / 1000 }); return response; } };
}
export function clearDemoSession(response: NextResponse) { response.cookies.set(cookie, '', { path: '/', maxAge: 0 }); return response; }

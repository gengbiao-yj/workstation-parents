import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>

const KEYLEN = 64

/** 用 Node 内置 scrypt 做密码哈希，免去 bcrypt 的原生编译依赖 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const buf = await scrypt(password, salt, KEYLEN)
  return `scrypt$${salt}$${buf.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, salt, hash] = (stored || '').split('$')
  if (algo !== 'scrypt' || !salt || !hash) return false
  const buf = await scrypt(password, salt, KEYLEN)
  const target = Buffer.from(hash, 'hex')
  if (target.length !== buf.length) return false
  return timingSafeEqual(buf, target)
}

import bcrypt from "bcryptjs"

const SALT_ROUNDS = 12

/** 비밀번호를 bcrypt 해시로 변환 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

/** 평문과 해시를 비교 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

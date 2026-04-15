import { CookieJar } from 'tough-cookie'
import type { TestPartner } from './fixtures'

export class TestClient {
  private jar = new CookieJar()
  constructor(private baseUrl = process.env.TEST_BASE_URL ?? 'http://localhost:3000') {}

  async authenticateAs(partner: TestPartner): Promise<void> {
    const idToken = await partner.mintIdToken()
    const res = await this.fetch('/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })
    if (!res.ok) {
      throw new Error(`authenticateAs failed: ${res.status} ${await res.text()}`)
    }
  }

  async fetch(pathOrUrl: string, init: RequestInit = {}): Promise<Response> {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${this.baseUrl}${pathOrUrl}`
    const cookieHeader = await this.jar.getCookieString(url)
    const headers = new Headers(init.headers)
    if (cookieHeader) headers.set('cookie', cookieHeader)
    const res = await fetch(url, { ...init, headers, redirect: 'manual' })
    const setCookie = res.headers.getSetCookie?.() ?? []
    for (const c of setCookie) await this.jar.setCookie(c, url)
    return res
  }

  async getJson<T = unknown>(path: string): Promise<{ status: number; body: T }> {
    const res = await this.fetch(path)
    return { status: res.status, body: (await res.json().catch(() => null)) as T }
  }

  async postJson<T = unknown>(
    path: string,
    data: unknown,
  ): Promise<{ status: number; body: T }> {
    const res = await this.fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    })
    return { status: res.status, body: (await res.json().catch(() => null)) as T }
  }
}

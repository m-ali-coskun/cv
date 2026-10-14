// Usage: node scripts/shot.mjs <outDir> [route ...]   (dev server must run on :5173)
// Env: VIEWPORT=desktop|mobile, LANG=en|de|tr, ROLE=client|designer, THEME=light|dark, DISC=all|visual|...
import { chromium } from '@playwright/test'
import fs from 'node:fs'

const out = process.argv[2] ?? '.qa/shots'
const routes = process.argv.slice(3).length ? process.argv.slice(3) : ['/overview']
const vp = process.env.VIEWPORT === 'mobile' ? { width: 390, height: 844 } : { width: 1512, height: 982 }
fs.mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: process.env.VIEWPORT === 'mobile', hasTouch: process.env.VIEWPORT === 'mobile' })
const page = await ctx.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

const base = process.env.BASE ?? 'http://localhost:5173/'
await page.goto(base)
await page.evaluate(({ lang, role, theme, disc, onboard }) => {
  const s = window.__designTab.getState()
  s.setSettings({ lang: lang || 'en', role: role || 'client', theme: theme || 'light', discipline: disc || 'all', onboardingDone: onboard !== '0' })
}, { lang: process.env.LANG_UI, role: process.env.ROLE, theme: process.env.THEME, disc: process.env.DISC, onboard: process.env.ONBOARD })
for (const r of routes) {
  await page.goto(base + '#' + r)
  await page.waitForTimeout(Number(process.env.WAIT ?? 1800))
  const name = r.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root'
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: process.env.FULL === '1' })
  console.log('shot', r)
}
if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'))
await browser.close()

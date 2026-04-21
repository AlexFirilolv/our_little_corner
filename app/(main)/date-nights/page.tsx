'use client'
import { useMemo, useState } from 'react'
import { useLocket } from '@/contexts/LocketContext'
import { getCurrentUserToken } from '@/lib/firebase/auth'
import { dateIdeas, type DateVibe, type DateSetting, type DateBudget } from '@/lib/data/date-night-ideas'

const vibes: DateVibe[] = ['cozy', 'adventurous', 'romantic', 'silly']
const settings: DateSetting[] = ['in', 'out']
const budgets: DateBudget[] = ['free', 'low', 'mid', 'high']

export default function DateNightsPage() {
  const { currentLocket } = useLocket()
  const [vibe, setVibe] = useState<DateVibe | null>(null)
  const [setting, setSetting] = useState<DateSetting | null>(null)
  const [budget, setBudget] = useState<DateBudget | null>(null)

  const filtered = useMemo(
    () => dateIdeas.filter((i) => (!vibe || i.vibe === vibe) && (!setting || i.setting === setting) && (!budget || i.budget === budget)),
    [vibe, setting, budget],
  )

  const save = async (id: string) => {
    if (!currentLocket) return
    const token = await getCurrentUserToken()
    await fetch('/api/date-nights/picks', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ locketId: currentLocket.id, idea_id: id }),
    })
  }

  return (
    <div className="container mx-auto px-4 max-w-3xl py-8">
      <h1 className="font-display text-display text-foreground mb-6">Date nights</h1>
      <div className="flex flex-wrap gap-2 mb-6">
        {vibes.map((v) => (
          <button key={v} onClick={() => setVibe(vibe === v ? null : v)} className={`px-3 py-1 rounded-full text-caption border ${vibe === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted'}`}>{v}</button>
        ))}
        <span className="w-px bg-border mx-2" />
        {settings.map((s) => (
          <button key={s} onClick={() => setSetting(setting === s ? null : s)} className={`px-3 py-1 rounded-full text-caption border ${setting === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted'}`}>{s}</button>
        ))}
        <span className="w-px bg-border mx-2" />
        {budgets.map((b) => (
          <button key={b} onClick={() => setBudget(budget === b ? null : b)} className={`px-3 py-1 rounded-full text-caption border ${budget === b ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted'}`}>{b}</button>
        ))}
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((i) => (
          <li key={i.id} className="card-base p-4 flex flex-col gap-2">
            <p className="font-display text-subheading text-foreground">{i.title}</p>
            <p className="text-caption text-muted">{i.vibe} · {i.setting} · {i.budget} · ~{i.est_minutes} min</p>
            <button onClick={() => save(i.id)} className="self-start text-body-sm text-primary hover:underline">Save</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

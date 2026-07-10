import { providedProfile, type ProvidedProfile } from '../demo/salesman.ts'

// Simulated stage-3 PROVIDED adapter (see VISION: stages 3–4 are pluggable,
// consent-gated, never core). The explicit sign-in click IS the stage-3
// consent; sign-out erases the profile. The engine never sees this module —
// site rules translate the profile into quantized traits like any other
// first-party evidence, and the inspector shows the payload transparently.

const KEY = 'nova:provided'

// ponytail: fixed fake profile — a real adapter would call a CRM/CDP here
const MARTA: ProvidedProfile = { name: 'Marta', ageRange: '65+', prefs: ['large-text'], history: ['gifts'] }

export function mountSignIn(): void {
  const el = document.createElement('div')
  el.id = 'nova-signin'
  document.body.appendChild(el)

  const render = () => {
    const profile = providedProfile()
    el.innerHTML = profile
      ? `<span>👤 ${profile.name} · ${profile.ageRange}</span><button>sign out</button>`
      : `<button>Sign in as Marta</button>`
    el.querySelector('button')!.addEventListener('click', () => {
      if (providedProfile()) localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, JSON.stringify(MARTA))
      render()
    })
  }
  render()
}

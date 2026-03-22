import { useState, useEffect, useCallback } from 'react'
import { useAccountsStore } from '@/stores/accounts'
import type { AppConfig, AppSettings } from '@shared/types'

interface SettingsProps {
  onClose: () => void
}

export default function Settings({ onClose }: SettingsProps) {
  const accounts = useAccountsStore((s) => s.accounts)
  const setAccounts = useAccountsStore((s) => s.setAccounts)

  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [accountNames, setAccountNames] = useState<Record<string, string>>({})

  // Load config on mount
  useEffect(() => {
    window.api
      .invoke('config:get', undefined)
      .then((config: AppConfig) => {
        setSettings(config.settings)
        const names: Record<string, string> = {}
        for (const acc of config.accounts) {
          names[acc.id] = acc.name
        }
        setAccountNames(names)
      })
      .catch(console.error)
  }, [])

  const updateSetting = useCallback(
    (update: Partial<AppSettings>) => {
      if (!settings) return
      const updated = { ...settings, ...update }
      setSettings(updated)
      window.api.invoke('config:update', { settings: update }).catch(console.error)
    },
    [settings]
  )

  const updateNotification = useCallback(
    (update: Partial<AppSettings['notifications']>) => {
      if (!settings) return
      const notifications = { ...settings.notifications, ...update }
      updateSetting({ notifications })
    },
    [settings, updateSetting]
  )

  const handleRename = useCallback(
    (id: string) => {
      const name = accountNames[id]?.trim()
      if (!name) return
      window.api.invoke('account:rename', { id, name }).catch(console.error)
    },
    [accountNames]
  )

  const handleRemove = useCallback(
    (id: string) => {
      const confirmed = window.confirm(
        'Are you sure you want to remove this account? This action cannot be undone.'
      )
      if (!confirmed) return

      window.api
        .invoke('account:remove', { id, deleteData: true })
        .then(() => {
          // Refresh accounts
          return window.api.invoke('account:list', undefined)
        })
        .then((accountList) => {
          setAccounts(accountList)
        })
        .catch(console.error)
    },
    [setAccounts]
  )

  if (!settings) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
        <div className="bg-bg-secondary border-2 border-border-secondary p-6 max-w-lg w-full mx-4">
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent-purple border-t-transparent animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="bg-bg-secondary border-2 border-accent-purple p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto scrollbar-thin relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary cursor-pointer border border-border-primary"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13" />
            <line x1="13" y1="1" x2="1" y2="13" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-text-primary mb-6 uppercase font-mono tracking-widest">SETTINGS</h2>

        {/* Notifications */}
        <Section title="NOTIFICATIONS">
          <ToggleRow
            label="ENABLE NOTIFICATIONS"
            checked={settings.notifications.enabled}
            onChange={(v) => updateNotification({ enabled: v })}
          />
          <ToggleRow
            label="NOTIFICATION SOUND"
            checked={settings.notifications.sound}
            onChange={(v) => updateNotification({ sound: v })}
          />
        </Section>

        {/* Behavior */}
        <Section title="BEHAVIOR">
          <ToggleRow
            label="CLOSE TO SYSTEM TRAY"
            checked={settings.closeToTray}
            onChange={(v) => updateSetting({ closeToTray: v })}
          />
          <div className="flex items-center justify-between py-2 border-b border-border-primary">
            <span className="text-[12px] text-text-primary font-mono uppercase">IDLE TIMEOUT (MIN)</span>
            <input
              type="number"
              min={5}
              max={120}
              value={settings.idleTimeoutMinutes}
              onChange={(e) => {
                const val = Math.min(120, Math.max(5, parseInt(e.target.value) || 5))
                updateSetting({ idleTimeoutMinutes: val })
              }}
              className="w-20 px-2 py-1 text-xs text-text-primary bg-bg-primary border-2 border-border-primary focus:outline-none focus:border-accent-purple text-center font-mono"
            />
          </div>
        </Section>

        {/* Account Management */}
        <Section title="ACCOUNT MANAGEMENT">
          {accounts.length === 0 ? (
            <p className="text-xs text-text-muted py-2 font-mono uppercase">NO ACCOUNTS ADDED YET.</p>
          ) : (
            <div className="space-y-2">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center gap-2 py-2 border-b-2 border-border-primary last:border-b-0"
                >
                  <input
                    type="text"
                    value={accountNames[acc.id] ?? acc.name}
                    onChange={(e) =>
                      setAccountNames((prev) => ({ ...prev, [acc.id]: e.target.value }))
                    }
                    onBlur={() => handleRename(acc.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(acc.id)
                    }}
                    className="flex-1 px-2 py-1 text-xs text-text-primary bg-bg-primary border-2 border-border-primary focus:outline-none focus:border-accent-purple font-mono"
                  />
                  <button
                    onClick={() => handleRemove(acc.id)}
                    className="px-3 py-1 text-[10px] text-accent-red border-2 border-accent-red hover:bg-accent-red hover:text-white cursor-pointer font-mono font-bold uppercase"
                  >
                    REMOVE
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Storage */}
        <Section title="STORAGE">
          <p className="text-xs text-text-muted py-2 font-mono uppercase">
            MEDIA CACHE MANAGEMENT COMING SOON
          </p>
        </Section>

        {/* About */}
        <Section title="ABOUT">
          <p className="text-xs text-text-primary py-1 font-mono font-bold">MULTIWHATSAPP V1.0.0</p>
          <p className="text-[10px] text-text-muted leading-relaxed font-mono">
            THIS APPLICATION IS AN UNOFFICIAL CLIENT. USING UNOFFICIAL WHATSAPP CLIENTS MAY RESULT
            IN YOUR ACCOUNT BEING TEMPORARILY OR PERMANENTLY BANNED BY WHATSAPP. USE AT YOUR OWN RISK.
          </p>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-[13px] font-bold text-text-secondary mb-2 uppercase tracking-widest font-mono border-b-2 border-border-secondary pb-1">
        {title}
      </h3>
      <div className="bg-bg-primary border-2 border-border-primary px-3 py-1">{children}</div>
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer border-b border-border-primary">
      <span className="text-[12px] text-text-primary font-mono">{label}</span>
      <div
        className={`w-10 h-5 relative cursor-pointer border-2 ${
          checked ? 'bg-accent-purple border-accent-purple' : 'bg-bg-tertiary border-border-secondary'
        }`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`absolute top-0.5 w-4 h-3.5 bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </label>
  )
}

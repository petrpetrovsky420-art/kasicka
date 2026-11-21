import { useId, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import type { Goal } from '../lib/types';
import { createBackup, previewImport } from '../lib/backup';
import { plural } from '../lib/format';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { useToast } from './Toasts';

type Props = {
  goals: Goal[];
  today: string;
  onClose: () => void;
  onImport: (incoming: Goal[], summary: { added: number; replaced: number }) => void;
};

/** Starý způsob kopírování pro prohlížeče bez Clipboard API (třeba http v místní síti). */
function legacyCopy(text: string, container: HTMLElement): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  container.append(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

export function BackupDialog({ goals, today, onClose, onImport }: Props) {
  const toast = useToast();
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const backup = useMemo(() => createBackup(goals), [goals]);
  const preview = useMemo(() => (text.trim() ? previewImport(text, goals, today) : null), [text, goals, today]);
  const movements = goals.reduce((sum, g) => sum + g.deposits.length, 0);
  const hasData = goals.length > 0;

  async function copy(event: MouseEvent<HTMLButtonElement>) {
    const container = event.currentTarget.closest('dialog') ?? document.body;
    try {
      await navigator.clipboard.writeText(backup);
      toast('Záloha je zkopírovaná. Vlož ji třeba do poznámek nebo do e-mailu.');
    } catch {
      if (legacyCopy(backup, container)) toast('Záloha je zkopírovaná.');
      else toast('Kopírování se nepovedlo. Stáhni si zálohu jako soubor.', { tone: 'error' });
    }
  }

  function download(event: MouseEvent<HTMLButtonElement>) {
    const container = event.currentTarget.closest('dialog') ?? document.body;
    const url = URL.createObjectURL(new Blob([backup], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `kasicka-zaloha-${today}.json`;
    container.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('Soubor se zálohou se stahuje.');
  }

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5_000_000) {
      toast('Tenhle soubor je moc velký, záloha z Kasičky to nebude.', { tone: 'error' });
      return;
    }
    try {
      setText(await file.text());
    } catch {
      toast('Soubor se nepodařilo přečíst.', { tone: 'error' });
    }
  }

  return (
    <Modal title="Záloha" onClose={onClose}>
      <section className="backup-section" aria-labelledby={`${id}-export`}>
        <h3 id={`${id}-export`} className="panel-title">
          Uložit zálohu
        </h3>
        <p className="muted">
          Data jsou uložená jen v tomhle prohlížeči. Zálohu si občas ulož, ať o ně nepřijdeš. Hodí se i na přenesení cílů do
          jiného zařízení.
        </p>
        {hasData ? (
          <p className="backup-count">
            Záloha obsahuje {goals.length} {plural(goals.length, 'cíl', 'cíle', 'cílů')} a {movements}{' '}
            {plural(movements, 'pohyb', 'pohyby', 'pohybů')}.
          </p>
        ) : (
          <p className="backup-count">Zatím nemáš žádné cíle, takže není co zálohovat.</p>
        )}
        <div className="button-row">
          <button type="button" className="btn btn-primary" onClick={copy} disabled={!hasData}>
            <Icon name="copy" />
            Kopírovat zálohu
          </button>
          <button type="button" className="btn btn-secondary" onClick={download} disabled={!hasData}>
            <Icon name="download" />
            Stáhnout soubor
          </button>
        </div>
        {hasData && (
          <details className="backup-raw">
            <summary>Zobrazit text zálohy</summary>
            <textarea className="input textarea" readOnly value={backup} aria-label="Text zálohy" rows={6} onFocus={(e) => e.currentTarget.select()} />
          </details>
        )}
      </section>

      <section className="backup-section" aria-labelledby={`${id}-import`}>
        <h3 id={`${id}-import`} className="panel-title">
          Obnovit ze zálohy
        </h3>
        <p className="muted">Cíle ze zálohy se přidají k těm, co už máš. Cíl se stejným id se přepíše verzí ze zálohy.</p>
        <label htmlFor={`${id}-text`} className="field-label">
          Vlož text zálohy
        </label>
        <textarea
          id={`${id}-text`}
          className="input textarea"
          rows={5}
          spellCheck={false}
          placeholder='{"app": "kasicka", "goals": [ … ] }'
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-describedby={preview ? `${id}-preview` : undefined}
        />
        <div className="button-row">
          <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" />
            Nahrát soubor
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json,text/plain,.txt" className="sr-only" tabIndex={-1} onChange={loadFile} />
          {text && (
            <button type="button" className="btn btn-ghost" onClick={() => setText('')}>
              Vymazat
            </button>
          )}
        </div>

        {preview && !preview.ok && (
          <p id={`${id}-preview`} className="field-error" role="alert">
            {preview.error}
          </p>
        )}
        {preview?.ok && (
          <div id={`${id}-preview`} className="import-preview" role="status">
            <p>
              <strong>Záloha je v pořádku.</strong>
            </p>
            <ul>
              <li>Nové cíle: {preview.added}</li>
              <li>Cíle, které se přepíšou: {preview.replaced}</li>
              {preview.skippedGoals + preview.skippedDeposits > 0 && (
                <li>
                  Neplatné záznamy (přeskočí se): {preview.skippedGoals > 0 && `cíle ${preview.skippedGoals}`}
                  {preview.skippedGoals > 0 && preview.skippedDeposits > 0 && ', '}
                  {preview.skippedDeposits > 0 && `pohyby ${preview.skippedDeposits}`}
                </li>
              )}
            </ul>
          </div>
        )}

        <div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!preview?.ok}
            onClick={() => preview?.ok && onImport(preview.goals, preview)}
          >
            Obnovit ze zálohy
          </button>
        </div>
      </section>
    </Modal>
  );
}

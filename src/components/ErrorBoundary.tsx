import { Component, type ErrorInfo, type ReactNode } from 'react';
import { readRawStorage } from '../lib/storage';
import { todayISO } from '../lib/dates';

type State = { failed: boolean };

/** Poslední záchrana: když se něco nečekaně rozbije, data zůstanou a dají se stáhnout. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Kasička spadla:', error, info.componentStack);
  }

  private download = () => {
    const raw = readRawStorage() ?? '{"goals": []}';
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `kasicka-data-${todayISO()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="crash">
        <h1>Něco se pokazilo</h1>
        <p>Tvoje data jsou pořád uložená v prohlížeči. Zkus aplikaci načíst znovu. Když to nepomůže, stáhni si data, ať o ně nepřijdeš.</p>
        <div className="button-row">
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Načíst znovu
          </button>
          <button type="button" className="btn btn-secondary" onClick={this.download}>
            Stáhnout data
          </button>
        </div>
      </main>
    );
  }
}

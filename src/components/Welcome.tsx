import { Icon } from './Icon';
import { PiggyShape } from './Logo';

/** Prázdný stav: pozvánka k prvnímu cíli. Pod ní App ukáže ukázkové karty. */
export function Welcome({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <div className="welcome-text">
        <p className="welcome-eyebrow">Vítej v Kasičce</p>
        <h2 id="welcome-title" className="welcome-title">
          Na co si chceš našetřit?
        </h2>
        <p className="welcome-lead">
          Založ si cíl, zapisuj vklady a Kasička ti spočítá, kolik odkládat, aby to vyšlo včas. Všechno zůstává jen
          v tvém zařízení a funguje i bez internetu.
        </p>
        <button type="button" className="btn btn-light btn-lg" onClick={onCreate}>
          <Icon name="plus" size={20} />
          Vytvořit první cíl
        </button>
      </div>
      <svg className="welcome-art" viewBox="40 40 440 440" aria-hidden="true" focusable="false">
        <circle cx="400" cy="120" r="22" fill="#f4b740" opacity=".55" />
        <circle cx="96" cy="150" r="14" fill="#f4b740" opacity=".4" />
        <PiggyShape body="#eaf7ef" ink="#0c4f33" />
      </svg>
    </section>
  );
}

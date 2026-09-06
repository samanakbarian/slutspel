import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

/**
 * Felgräns runt ett enskilt kort.
 *
 * Frontend deployas av Netlify direkt vid push, backend för hand. Mellan de
 * två ligger ett fönster där en ny klient möter ett äldre API-svar, och ett
 * fält som ännu inte finns. Utan gräns tar ett sådant fel hela sidan: läsaren
 * ser en tom vy i stället för allt det som fungerar.
 *
 * Med gränsen försvinner bara kortet. Det är rätt avvägning för ett kort som
 * kompletterar — matcher, tabell och spelprogram står kvar.
 */
type Props = { children: ReactNode; name: string };
type State = { failed: boolean };

export class Guard extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Loggas hellre än sväljs: felet ska gå att hitta i konsolen.
    console.error(`Kortet "${this.props.name}" kunde inte visas.`, error, info.componentStack);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

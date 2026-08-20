import { Component, ErrorInfo, ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("TaxiLive error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
          <div className="max-w-md space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-yellow-500">TaxiLive</p>
            <h1 className="text-2xl font-black">Ocurrio un error al cargar la app</h1>
            <p className="text-sm text-zinc-400">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-xl bg-yellow-500 px-4 py-3 font-black text-zinc-950"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

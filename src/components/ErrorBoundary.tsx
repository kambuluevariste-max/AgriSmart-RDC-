import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    let readable = error.message || 'Une erreur inattendue est survenue.';
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.error) {
        readable = `Accès aux données limité (${parsed.operationType || 'opération'}) : ${parsed.error}`;
      }
    } catch {
      // plain error string
    }
    return { hasError: true, message: readable };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F7F5] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-[#263238]">Interruption temporaire</h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#168447] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#126c3a] min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Recharger l’application</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

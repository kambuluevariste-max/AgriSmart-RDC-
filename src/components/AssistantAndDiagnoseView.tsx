import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Camera,
  ImagePlus,
  MessageSquare,
  Plus,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { PRODUCT_CATEGORIES } from '../data/drcData';
import type { LanguageCode } from '../types/agrismart';

interface AssistantAndDiagnoseViewProps {
  initialTab: 'assistant' | 'diagnose';
  language: LanguageCode;
  isOnline: boolean;
  onConsultExpert: () => void;
}

interface ChatItem {
  role: 'user' | 'assistant';
  text: string;
}

interface DiagnosisResult {
  potentialDisease: string;
  observedSymptoms: string[];
  confidenceLevel: string;
  preventionAdvice: string[];
  treatmentRecommendations: string[];
  expertDisclaimer: string;
}

const SAMPLE_QUESTIONS = [
  'Comment cultiver le manioc avec un bon rendement ?',
  'Quel engrais utiliser pour le maïs en RDC ?',
  'Comment préparer le sol avant la saison des pluies ?',
  'Comment lutter contre la chenille légionnaire ?',
  'Quand récolter le haricot et le riz ?',
];

export const AssistantAndDiagnoseView: React.FC<AssistantAndDiagnoseViewProps> = ({
  initialTab,
  language,
  isOnline,
  onConsultExpert,
}) => {
  const [tab, setTab] = useState<'assistant' | 'diagnose'>(initialTab);

  // Assistant state
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      role: 'assistant',
      text: 'Mbote ! Je suis AgriSmart Assistant. Posez-moi vos questions sur le manioc, le maïs, les engrais, les maladies ou la préparation de vos parcelles en RDC.',
    },
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');

  // Diagnostic state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [crop, setCrop] = useState<string>(PRODUCT_CATEGORIES[1]); // Manioc
  const [symptoms, setSymptoms] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageBase64, setImageBase64] = useState<string>('');
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState('');
  const [diagResult, setDiagResult] = useState<DiagnosisResult | null>(null);

  const sendAssistantMessage = async (textToSend?: string) => {
    const msg = (textToSend ?? input).trim();
    if (!msg || chatLoading) return;
    setChatError('');
    if (!isOnline) {
      setChatError('Connexion Internet requise pour interroger AgriSmart Assistant.');
      return;
    }

    const updatedHistory = [...messages, { role: 'user' as const, text: msg }];
    setMessages(updatedHistory);
    if (!textToSend) setInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: updatedHistory.slice(-8),
          language,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Service assistant indisponible');
      setMessages((prev) => [...prev, { role: 'assistant', text: json.reply }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Erreur de communication.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDiagError('');
    setDiagResult(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setDiagError('Veuillez choisir une image JPEG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setDiagError('Image trop volumineuse (maximum 5 Mo).');
      return;
    }
    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setImagePreview(result);
      const base64 = result.split(',')[1] || '';
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    setDiagError('');
    setDiagResult(null);
    if (!isOnline) {
      setDiagError('Connexion requise pour envoyer la photo au service d’analyse.');
      return;
    }
    if (!imageBase64) {
      setDiagError('Veuillez d’abord prendre ou importer une photo de la plante.');
      return;
    }
    setDiagLoading(true);
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType: imageMime,
          crop,
          symptoms,
          language,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Analyse indisponible');
      setDiagResult(json);
    } catch (err) {
      setDiagError(err instanceof Error ? err.message : 'Échec du diagnostic.');
    } finally {
      setDiagLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#263238]">
            {tab === 'assistant' ? 'AgriSmart Assistant' : 'Diagnostic des Maladies par Photo'}
          </h1>
          <p className="text-sm text-slate-600">
            {tab === 'assistant'
              ? 'Conseiller agricole intelligent connecté à notre passerelle serveur sécurisée.'
              : 'Importez une photo de feuille ou tige pour obtenir une orientation phytosanitaire indicative.'}
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setTab('assistant')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg min-h-[40px] ${
              tab === 'assistant' ? 'bg-[#168447] text-white' : 'text-slate-600'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Assistant</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('diagnose')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg min-h-[40px] ${
              tab === 'diagnose' ? 'bg-[#168447] text-white' : 'text-slate-600'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Diagnostic Photo</span>
          </button>
        </div>
      </div>

      {tab === 'assistant' ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-[#168447]">
              Conversation agronomique RDC
            </span>
            <button
              type="button"
              onClick={() => {
                setChatError('');
                setMessages([
                  {
                    role: 'assistant',
                    text: 'Nouvelle conversation démarrée. Comment puis-je vous aider sur votre exploitation ?',
                  },
                ]);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1976D2] hover:underline min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouvelle conversation</span>
            </button>
          </div>

          {/* Sample prompts */}
          <div className="px-5 py-3 bg-[#F5F7F5] border-b border-slate-100 flex flex-wrap gap-2">
            {SAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendAssistantMessage(q)}
                className="text-xs bg-white border border-slate-200 hover:border-[#168447] rounded-xl px-3 py-1.5 text-slate-700"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="p-5 space-y-4 max-h-[440px] overflow-y-auto">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#168447] text-white'
                      : 'bg-[#F5F7F5] text-[#263238] border border-slate-200'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <p className="text-xs text-slate-500">AgriSmart Assistant rédige sa réponse...</p>
            )}
          </div>

          {chatError && (
            <div className="mx-5 mb-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{chatError}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendAssistantMessage();
            }}
            className="p-4 border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question agricole..."
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm min-h-[44px]"
            />
            <button
              type="submit"
              disabled={chatLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#168447] hover:bg-[#126c3a] disabled:opacity-60 text-white font-semibold text-sm px-4 py-2.5 min-h-[44px]"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Envoyer</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleAnalyzePhoto}
            className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 space-y-4"
          >
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Ce diagnostic est strictement indicatif. Consultez un expert agricole avant tout traitement phytosanitaire intensif.
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Culture concernée</label>
              <select
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm min-h-[44px]"
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Photo de la plante</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handleFileSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 hover:border-[#168447] rounded-2xl p-6 text-center flex flex-col items-center gap-2 min-h-[140px] justify-center"
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Plante sélectionnée"
                    className="max-h-48 rounded-xl object-contain"
                  />
                ) : (
                  <>
                    <ImagePlus className="w-8 h-8 text-[#168447]" />
                    <span className="text-xs font-semibold text-[#263238]">
                      Prendre une photo ou importer depuis la galerie
                    </span>
                    <span className="text-xs text-slate-500">JPEG, PNG ou WebP (max 5 Mo)</span>
                  </>
                )}
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Symptômes observés (optionnel)
              </label>
              <textarea
                rows={3}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Ex. Feuilles jaunies, taches brunes, trous sur les bords..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>

            {diagError && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                {diagError}
              </div>
            )}

            <button
              type="submit"
              disabled={diagLoading}
              className="w-full rounded-xl bg-[#168447] hover:bg-[#126c3a] disabled:opacity-60 text-white font-semibold text-sm py-3 min-h-[48px]"
            >
              {diagLoading ? 'Analyse en cours...' : 'Analyser la photo'}
            </button>
          </form>

          {/* Diagnostic Result Panel */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6">
            {!diagResult ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10">
                <Camera className="w-10 h-10 text-slate-300 mb-3" />
                <h2 className="text-base font-bold text-[#263238]">Résultat du diagnostic</h2>
                <p className="mt-1 text-sm text-slate-500 max-w-md">
                  Sélectionnez la culture, importez une photo claire des feuilles ou tiges touchées et lancez l’analyse.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-xs text-slate-500">Maladie / Problème potentiel</p>
                    <h2 className="text-xl font-bold text-[#263238]">{diagResult.potentialDisease}</h2>
                  </div>
                  <span className="text-xs font-semibold text-[#1976D2]">
                    Confiance indicative : {diagResult.confidenceLevel}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#263238] mb-1.5">Symptômes observés</h3>
                  <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
                    {diagResult.observedSymptoms.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-[#E8F5E9] p-4">
                    <h3 className="text-xs font-bold text-[#168447] mb-2">Prévention</h3>
                    <ul className="list-disc pl-4 text-xs text-[#263238] space-y-1">
                      {diagResult.preventionAdvice.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl bg-[#F5F7F5] p-4">
                    <h3 className="text-xs font-bold text-[#1976D2] mb-2">Recommandations de traitement</h3>
                    <ul className="list-disc pl-4 text-xs text-[#263238] space-y-1">
                      {diagResult.treatmentRecommendations.map((tr, i) => (
                        <li key={i}>{tr}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-amber-800">{diagResult.expertDisclaimer}</p>
                  <button
                    type="button"
                    onClick={onConsultExpert}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#1976D2] text-white text-xs font-semibold px-4 py-2 shrink-0 min-h-[40px]"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Consulter un expert</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

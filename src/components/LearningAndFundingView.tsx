import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Coins,
  FileText,
  GraduationCap,
  HelpCircle,
  Trophy,
} from 'lucide-react';
import {
  DRC_PROVINCES,
  FUNDING_PROJECTS,
  QUIZ_QUESTIONS,
  TRAINING_COURSES,
} from '../data/drcData';
import type {
  AgriEvent,
  CurrencyCode,
  FundingApplication,
  UserProfile,
} from '../types/agrismart';

interface LearningAndFundingViewProps {
  initialTab: 'funding' | 'training' | 'quiz' | 'calendar';
  profile: UserProfile;
  applications: FundingApplication[];
  events: AgriEvent[];
  completedLessons: string[];
  quizScores: { level: string; score: number; total: number; date: string }[];
  onSubmitFunding: (app: Omit<FundingApplication, 'id' | 'applicantId' | 'status'>) => Promise<void>;
  onCompleteLesson: (lessonId: string) => void;
  onSaveQuizScore: (level: string, score: number, total: number) => void;
  onAddPersonalEvent: (ev: Omit<AgriEvent, 'id'>) => void;
}

export const LearningAndFundingView: React.FC<LearningAndFundingViewProps> = ({
  initialTab,
  profile,
  applications,
  events,
  completedLessons,
  quizScores,
  onSubmitFunding,
  onCompleteLesson,
  onSaveQuizScore,
  onAddPersonalEvent,
}) => {
  const [tab, setTab] = useState<'funding' | 'training' | 'quiz' | 'calendar'>(initialTab);

  // Funding form
  const [selectedCall, setSelectedCall] = useState(FUNDING_PROJECTS[0].title);
  const [institution, setInstitution] = useState(FUNDING_PROJECTS[0].institution);
  const [requestedAmount, setRequestedAmount] = useState('2500');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [summary, setSummary] = useState('');
  const [fundFeedback, setFundFeedback] = useState('');

  // Training
  const [activeCourseId, setActiveCourseId] = useState(TRAINING_COURSES[0].id);

  // Quiz
  const [quizLevel, setQuizLevel] = useState<'Débutant' | 'Intermédiaire' | 'Avancé' | 'Tous'>('Tous');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Calendar
  const [evTitle, setEvTitle] = useState('');
  const [evType, setEvType] = useState<AgriEvent['type']>('Rappel');
  const [evProvince, setEvProvince] = useState(profile.province || 'Kinshasa');
  const [evDate, setEvDate] = useState('2026-12-15');
  const [evDesc, setEvDesc] = useState('');

  const activeCourse = TRAINING_COURSES.find((c) => c.id === activeCourseId) || TRAINING_COURSES[0];
  const courseDoneCount = activeCourse.lessons.filter((l) => completedLessons.includes(l.id)).length;

  const filteredQuestions = QUIZ_QUESTIONS.filter(
    (q) => quizLevel === 'Tous' || q.level === quizLevel
  );
  const currentScore = filteredQuestions.filter((q) => answers[q.id] === q.correctIndex).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#263238]">
            Financement, Formations, Quiz & Calendrier
          </h1>
          <p className="text-sm text-slate-600">
            Développez vos compétences agricoles et soumettez vos projets aux institutions partenaires.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 p-1 bg-white border border-slate-200 rounded-xl self-start">
          {(
            [
              { id: 'funding', label: 'Financement', icon: <Coins className="w-3.5 h-3.5" /> },
              { id: 'training', label: 'Formations', icon: <GraduationCap className="w-3.5 h-3.5" /> },
              { id: 'quiz', label: 'Quiz', icon: <HelpCircle className="w-3.5 h-3.5" /> },
              { id: 'calendar', label: 'Calendrier', icon: <CalendarDays className="w-3.5 h-3.5" /> },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg min-h-[40px] ${
                tab === item.id ? 'bg-[#168447] text-white' : 'text-slate-600'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 1. FUNDING */}
      {tab === 'funding' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            {FUNDING_PROJECTS.map((proj) => (
              <div key={proj.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5">
                <p className="text-xs text-slate-500">
                  {proj.institution} · {proj.province} · Clôture : {proj.deadline}
                </p>
                <h2 className="text-base font-bold text-[#263238]">{proj.title}</h2>
                <p className="text-sm text-slate-600">{proj.summary}</p>
                <p className="text-xs font-mono font-semibold text-[#168447]">
                  Enveloppe indicative : {proj.maxAmount}
                </p>
                <div className="pt-2">
                  <p className="text-xs font-semibold text-[#263238] mb-1">Documents requis :</p>
                  <ul className="list-disc pl-5 text-xs text-slate-600 space-y-0.5">
                    {proj.requiredDocs.map((doc) => (
                      <li key={doc}>{doc}</li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCall(proj.title);
                    setInstitution(proj.institution);
                  }}
                  className="mt-2 rounded-xl bg-[#E8F5E9] text-[#168447] text-xs font-semibold px-4 py-2 min-h-[40px]"
                >
                  Préparer une demande pour cet appel
                </button>
              </div>
            ))}
          </div>

          <div className="lg:col-span-5 space-y-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onSubmitFunding({
                  projectTitle: selectedCall,
                  institution,
                  requestedAmount: Number(requestedAmount) || 500,
                  currency,
                  summary,
                });
                setSummary('');
                setFundFeedback(
                  "Votre dossier a été enregistré (statut : Soumis). L'étude par l'institution est requise et l'octroi n'est jamais automatique."
                );
              }}
              className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3.5"
            >
              <h2 className="text-base font-bold text-[#263238]">Formulaire de demande de financement</h2>
              <p className="text-xs text-amber-800 bg-amber-50 rounded-xl p-3">
                Information transparente : chaque demande fait l’objet d’une analyse de dossier par l’institution partenaire. Aucun financement n’est accordé automatiquement.
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Programme / Projet</label>
                <input
                  type="text"
                  required
                  value={selectedCall}
                  onChange={(e) => setSelectedCall(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Institution visée</label>
                <input
                  type="text"
                  required
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Montant demandé</label>
                  <input
                    type="number"
                    min="50"
                    required
                    value={requestedAmount}
                    onChange={(e) => setRequestedAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-mono min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Devise</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm min-h-[44px]"
                  >
                    <option value="USD">USD</option>
                    <option value="CDF">CDF</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Résumé du besoin</label>
                <textarea
                  rows={3}
                  required
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Expliquez l'activité, la superficie et l'utilisation des fonds..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              {fundFeedback && <p className="text-xs font-medium text-[#168447]">{fundFeedback}</p>}
              <button
                type="submit"
                className="w-full rounded-xl bg-[#168447] text-white font-semibold text-sm py-3 min-h-[44px]"
              >
                Soumettre le dossier
              </button>
            </form>

            {applications.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5">
                <h3 className="text-sm font-bold text-[#263238]">Suivi de mes demandes</h3>
                {applications.map((app) => (
                  <div key={app.id} className="border-t border-slate-100 pt-2.5 text-xs">
                    <p className="font-bold text-[#263238]">{app.projectTitle}</p>
                    <p className="text-slate-600">
                      {app.requestedAmount.toLocaleString('fr-FR')} {app.currency} · Statut :{' '}
                      <span className="font-semibold text-[#1976D2]">{app.status}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. TRAINING & GUIDES */}
      {tab === 'training' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-3">
            {TRAINING_COURSES.map((course) => {
              const done = course.lessons.filter((l) => completedLessons.includes(l.id)).length;
              const active = course.id === activeCourse.id;
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => setActiveCourseId(course.id)}
                  className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                    active ? 'bg-[#E8F5E9] border-[#168447]' : 'bg-white border-slate-200'
                  }`}
                >
                  <p className="text-xs text-slate-500">
                    {course.category} · {course.level} · {course.duration}
                  </p>
                  <h3 className="text-sm font-bold text-[#263238] mt-1">{course.title}</h3>
                  <p className="mt-2 text-xs font-mono text-[#168447]">
                    Progression : {done} / {course.lessons.length} leçons
                  </p>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs text-slate-500">
                  {activeCourse.category} · {activeCourse.level}
                </p>
                <h2 className="text-xl font-bold text-[#263238] mt-1">{activeCourse.title}</h2>
                <p className="text-sm text-slate-600 mt-1">{activeCourse.summary}</p>
              </div>
              {activeCourse.certificateAvailable && courseDoneCount === activeCourse.lessons.length && (
                <div className="rounded-xl bg-[#E8F5E9] text-[#168447] px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  <span>Attestation de suivi débloquée</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {activeCourse.lessons.map((lesson) => {
                const isDone = completedLessons.includes(lesson.id);
                return (
                  <div key={lesson.id} className="rounded-2xl bg-[#F5F7F5] p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-[#263238] flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#168447]" />
                        <span>{lesson.title}</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => onCompleteLesson(lesson.id)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold min-h-[36px] ${
                          isDone ? 'bg-[#168447] text-white' : 'bg-white border border-slate-300 text-slate-700'
                        }`}
                      >
                        {isDone ? 'Terminée' : 'Marquer terminée'}
                      </button>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{lesson.content}</p>
                    <p className="text-xs font-medium text-[#1976D2] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>À retenir : {lesson.keyTakeaway}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. QUIZ */}
      {tab === 'quiz' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[#263238]">Quiz Agricole Interactif</h2>
              <div className="flex gap-1.5">
                {(['Tous', 'Débutant', 'Intermédiaire', 'Avancé'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      setQuizLevel(lvl);
                      setAnswers({});
                      setQuizSubmitted(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold min-h-[36px] ${
                      quizLevel === lvl ? 'bg-[#1976D2] text-white' : 'bg-[#F5F7F5] text-slate-700'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              {filteredQuestions.map((q, qi) => (
                <div key={q.id} className="rounded-2xl border border-slate-200 p-4 space-y-3">
                  <p className="text-xs text-slate-500">
                    Question {qi + 1} · Niveau {q.level}
                  </p>
                  <p className="text-sm font-bold text-[#263238]">{q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const picked = answers[q.id] === oi;
                      const isCorrect = q.correctIndex === oi;
                      let style = 'border-slate-200 bg-white text-[#263238]';
                      if (quizSubmitted) {
                        if (isCorrect) style = 'border-[#168447] bg-[#E8F5E9] text-[#168447] font-semibold';
                        else if (picked) style = 'border-red-300 bg-red-50 text-red-700';
                      } else if (picked) {
                        style = 'border-[#1976D2] bg-blue-50 text-[#1976D2] font-semibold';
                      }
                      return (
                        <button
                          key={oi}
                          type="button"
                          disabled={quizSubmitted}
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                          className={`w-full text-left rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm min-h-[42px] ${style}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {quizSubmitted && (
                    <p className="text-xs text-slate-600 bg-[#F5F7F5] rounded-xl p-2.5">
                      Explication : {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {quizSubmitted ? (
                <>
                  <div className="inline-flex items-center gap-2 text-base font-bold font-mono text-[#168447]">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>
                      Score : {currentScore} / {filteredQuestions.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAnswers({});
                      setQuizSubmitted(false);
                    }}
                    className="rounded-xl bg-[#1976D2] text-white text-xs font-semibold px-4 py-2.5 min-h-[44px]"
                  >
                    Recommencer
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setQuizSubmitted(true);
                    onSaveQuizScore(quizLevel, currentScore, filteredQuestions.length);
                  }}
                  className="rounded-xl bg-[#168447] text-white font-semibold text-sm px-6 py-3 min-h-[44px]"
                >
                  Valider mes réponses
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#263238] flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-600" />
                <span>Classement & Historique</span>
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2 flex justify-between">
                  <span className="font-semibold">1. Coopérative Munganga</span>
                  <span className="font-mono text-[#168447]">4 / 4</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="font-semibold">2. {profile.displayName} (Vous)</span>
                  <span className="font-mono text-[#1976D2]">
                    {quizScores[0] ? `${quizScores[0].score} / ${quizScores[0].total}` : '—'}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span>3. Ferme Mbanza-Ngungu</span>
                  <span className="font-mono text-slate-600">3 / 4</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. CALENDAR & FAIRS */}
      {tab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-3">
            {events.map((ev) => (
              <div key={ev.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
                <p className="text-xs text-slate-500">
                  {ev.type} · {ev.province} · <span className="font-mono">{ev.date}</span>
                  {ev.isPersonal ? ' · Rappel personnel' : ''}
                </p>
                <h3 className="text-base font-bold text-[#263238]">{ev.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600">{ev.description}</p>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!evTitle.trim()) return;
              onAddPersonalEvent({
                title: evTitle.trim(),
                type: evType,
                province: evProvince,
                date: evDate,
                description: evDesc.trim() || 'Événement personnel AgriSmart-RDC',
                isPersonal: true,
              });
              setEvTitle('');
              setEvDesc('');
            }}
            className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 space-y-3.5 h-fit"
          >
            <h2 className="text-base font-bold text-[#263238]">Ajouter au calendrier agricole</h2>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Titre</label>
              <input
                type="text"
                required
                value={evTitle}
                onChange={(e) => setEvTitle(e.target.value)}
                placeholder="Ex. Semis maïs parcelle Nord"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm min-h-[44px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={evType}
                  onChange={(e) => setEvType(e.target.value as AgriEvent['type'])}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm min-h-[44px]"
                >
                  <option value="Rappel">Rappel</option>
                  <option value="Semis">Semis</option>
                  <option value="Récolte">Récolte</option>
                  <option value="Foire">Foire</option>
                  <option value="Formation">Formation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={evDate}
                  onChange={(e) => setEvDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm min-h-[44px]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Province</label>
              <select
                value={evProvince}
                onChange={(e) => setEvProvince(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm min-h-[44px]"
              >
                {DRC_PROVINCES.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                rows={2}
                value={evDesc}
                onChange={(e) => setEvDesc(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-[#168447] text-white font-semibold text-sm py-3 min-h-[44px]"
            >
              Ajouter à mon calendrier
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { MessageSquare, Phone, Search, Send, Video } from 'lucide-react';
import type { ChatMessage, Conversation, UserProfile } from '../types/agrismart';
import { UserAvatar } from './Logo';

interface MessagesViewProps {
  profile: UserProfile;
  conversations: Conversation[];
  activeConversationId: string | null;
  messagesByConv: Record<string, ChatMessage[]>;
  onSelectConversation: (convId: string) => void;
  onSendMessage: (convId: string, text: string) => Promise<void>;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  profile,
  conversations,
  activeConversationId,
  messagesByConv,
  onSelectConversation,
  onSendMessage,
}) => {
  const [search, setSearch] = useState('');
  const [text, setText] = useState('');
  const [callNotice, setCallNotice] = useState('');

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        (c.peerName || '').toLowerCase().includes(q) ||
        (c.lastMessage || '').toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const activeConv =
    conversations.find((c) => c.id === activeConversationId) || filteredConversations[0] || null;
  const messages = activeConv ? messagesByConv[activeConv.id] || [] : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#263238]">Messagerie & Communication</h1>
        <p className="text-sm text-slate-600">
          Échangez directement avec les agriculteurs, vendeurs, coopératives, transporteurs et experts.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
        {/* Conversation List */}
        <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une conversation..."
                className="w-full rounded-xl border border-slate-200 bg-[#F5F7F5] pl-9 pr-3 py-2 text-xs min-h-[40px]"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Aucune conversation. Contactez un vendeur depuis le Marché ou la Carte RDC.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const active = activeConv?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => onSelectConversation(conv.id)}
                    className={`w-full text-left p-4 transition-colors flex items-center gap-3 ${
                      active ? 'bg-[#E8F5E9]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <UserAvatar
                      photoUrl={conv.peerPhotoUrl}
                      name={conv.peerName || 'Interlocuteur AgriSmart'}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#263238] truncate">
                        {conv.peerName || 'Interlocuteur AgriSmart'}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {conv.lastMessage || 'Démarrer la discussion...'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Active Thread */}
        <div className="md:col-span-8 flex flex-col">
          {activeConv ? (
            <>
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar
                    photoUrl={activeConv.peerPhotoUrl}
                    name={activeConv.peerName || 'Discussion privée'}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-[#263238] truncate">
                      {activeConv.peerName || 'Discussion privée'}
                    </h2>
                    <p className="text-xs text-slate-500">Messagerie chiffrée en transit</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCallNotice('Appels audio WebRTC prévus dans une prochaine mise à jour (serveur TURN à configurer).')
                    }
                    aria-label="Appel audio (prochaine version)"
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-[#168447] min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCallNotice('Appels vidéo WebRTC prévus dans une prochaine mise à jour.')
                    }
                    aria-label="Appel vidéo (prochaine version)"
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-[#1976D2] min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {callNotice && (
                <div className="mx-4 mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs text-[#1976D2]">
                  {callNotice}
                </div>
              )}

              <div className="flex-1 p-5 space-y-3 overflow-y-auto max-h-[360px]">
                {messages.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">
                    Aucun message pour le moment. Envoyez votre premier message ci-dessous.
                  </p>
                ) : (
                  messages.map((m) => {
                    const isMine = m.senderId === profile.uid;
                    return (
                      <div
                        key={m.id}
                        className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMine && (
                          <UserAvatar
                            photoUrl={activeConv.peerPhotoUrl}
                            name={activeConv.peerName || 'Interlocuteur'}
                            size="xs"
                          />
                        )}
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                            isMine
                              ? 'bg-[#168447] text-white'
                              : 'bg-[#F5F7F5] text-[#263238] border border-slate-200'
                          }`}
                        >
                          {m.text}
                        </div>
                        {isMine && (
                          <UserAvatar
                            photoUrl={profile.photoUrl}
                            name={profile.displayName}
                            size="xs"
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!text.trim()) return;
                  const msg = text.trim();
                  setText('');
                  await onSendMessage(activeConv.id, msg);
                }}
                className="p-3.5 border-t border-slate-100 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Écrire un message..."
                  className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm min-h-[44px]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#168447] text-white font-semibold text-sm px-4 py-2.5 min-h-[44px]"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Envoyer</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm text-slate-600">Sélectionnez une conversation pour discuter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

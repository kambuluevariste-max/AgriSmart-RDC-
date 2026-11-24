import React, { useState } from 'react';
import { CheckCircle2, CreditCard, MessageSquare, Package, Truck } from 'lucide-react';
import type {
  Delivery,
  DeliveryStatus,
  MobileMoneyIntent,
  Order,
  OrderStatus,
  UserProfile,
} from '../types/agrismart';

interface OrdersLogisticsViewProps {
  profile: UserProfile;
  orders: Order[];
  deliveries: Delivery[];
  paymentIntents: MobileMoneyIntent[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onCreateDeliveryRequest: (order: Order, origin: string) => Promise<void>;
  onAcceptDelivery: (deliveryId: string, transportCost: number) => Promise<void>;
  onUpdateDeliveryStatus: (deliveryId: string, status: DeliveryStatus) => Promise<void>;
  onStartChat: (peerId: string, peerName: string) => void;
}

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  nouvelle: 'Nouvelle commande',
  confirmee: 'Confirmée',
  en_preparation: 'En préparation',
  en_livraison: 'En livraison',
  livree: 'Livrée',
  annulee: 'Annulée',
};

export const OrdersLogisticsView: React.FC<OrdersLogisticsViewProps> = ({
  profile,
  orders,
  deliveries,
  paymentIntents,
  onUpdateOrderStatus,
  onCreateDeliveryRequest,
  onAcceptDelivery,
  onUpdateDeliveryStatus,
  onStartChat,
}) => {
  const [tab, setTab] = useState<'orders' | 'transporter' | 'payments'>(
    profile.role === 'transporteur' ? 'transporter' : 'orders'
  );
  const [transportCosts, setTransportCosts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#263238]">Commandes, Livraisons & Paiements</h1>
          <p className="text-sm text-slate-600">
            Suivez vos commandes agricoles, missions de transport et intentions Mobile Money.
          </p>
        </div>
        <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setTab('orders')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg min-h-[40px] ${
              tab === 'orders' ? 'bg-[#168447] text-white' : 'text-slate-600'
            }`}
          >
            Commandes ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('transporter')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg min-h-[40px] ${
              tab === 'transporter' ? 'bg-[#168447] text-white' : 'text-slate-600'
            }`}
          >
            Espace Transporteur ({deliveries.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('payments')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg min-h-[40px] ${
              tab === 'payments' ? 'bg-[#1976D2] text-white' : 'text-slate-600'
            }`}
          >
            Mobile Money ({paymentIntents.length})
          </button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl bg-[#E8F5E9] p-3 text-sm text-[#168447] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-600">
              Aucune commande enregistrée. Parcourez le Marché pour passer une commande.
            </div>
          ) : (
            orders.map((order) => {
              const isBuyer = order.buyerId === profile.uid;
              const isSeller = order.sellerId === profile.uid;
              const isTerminal = order.status === 'livree' || order.status === 'annulee';

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">
                      Réf. {order.id.slice(0, 10)} · Statut :{' '}
                      <span className="font-semibold text-[#1976D2]">
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </p>
                    <h3 className="text-base font-bold text-[#263238]">{order.productTitle}</h3>
                    <p className="text-xs text-slate-600">
                      Quantité : <span className="font-mono font-semibold">{order.quantity}</span> · Total :{' '}
                      <span className="font-mono font-bold text-[#168447]">
                        {order.totalPrice.toLocaleString('fr-FR')} {order.currency}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">Adresse de livraison : {order.deliveryAddress}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!isTerminal && isSeller && order.status === 'nouvelle' && (
                      <button
                        type="button"
                        onClick={async () => {
                          await onUpdateOrderStatus(order.id, 'confirmee');
                          setFeedback('Commande confirmée.');
                        }}
                        className="rounded-xl bg-[#168447] text-white text-xs font-semibold px-3.5 py-2 min-h-[40px]"
                      >
                        Confirmer
                      </button>
                    )}
                    {!isTerminal && isSeller && order.status === 'confirmee' && (
                      <button
                        type="button"
                        onClick={async () => {
                          await onUpdateOrderStatus(order.id, 'en_preparation');
                          await onCreateDeliveryRequest(order, `${profile.city}, ${profile.province}`);
                          setFeedback('Commande en préparation et demande transporteur publiée.');
                        }}
                        className="rounded-xl bg-[#1976D2] text-white text-xs font-semibold px-3.5 py-2 min-h-[40px]"
                      >
                        Préparer & chercher transporteur
                      </button>
                    )}
                    {!isTerminal && isBuyer && order.status === 'nouvelle' && (
                      <button
                        type="button"
                        onClick={async () => {
                          await onUpdateOrderStatus(order.id, 'annulee');
                          setFeedback('Commande annulée.');
                        }}
                        className="rounded-xl border border-red-200 text-red-600 text-xs font-semibold px-3.5 py-2 min-h-[40px]"
                      >
                        Annuler
                      </button>
                    )}
                    {!isTerminal && isBuyer && order.status !== 'nouvelle' && (
                      <button
                        type="button"
                        onClick={async () => {
                          await onUpdateOrderStatus(order.id, 'livree');
                          setFeedback('Réception confirmée !');
                        }}
                        className="rounded-xl bg-[#168447] text-white text-xs font-semibold px-3.5 py-2 min-h-[40px]"
                      >
                        Confirmer réception
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        onStartChat(
                          isBuyer ? order.sellerId : order.buyerId,
                          isBuyer ? 'Vendeur' : 'Client'
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 text-xs font-medium px-3 py-2 min-h-[40px]"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'transporter' && (
        <div className="space-y-4">
          <div className="bg-[#E8F5E9] rounded-2xl p-4 flex items-center gap-3 text-sm text-[#168447]">
            <Truck className="w-5 h-5 shrink-0" />
            <p>
              Espace Transporteur : consultez les trajets ouverts, proposez votre coût de transport et mettez à jour le statut de livraison.
            </p>
          </div>

          {deliveries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-600">
              Aucune demande de livraison disponible actuellement.
            </div>
          ) : (
            deliveries.map((del) => (
              <div
                key={del.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">
                    Livraison #{del.id.slice(0, 8)} · Statut :{' '}
                    <span className="font-semibold text-[#1976D2]">{del.status}</span>
                  </p>
                  <h3 className="text-base font-bold text-[#263238]">
                    {del.origin} → {del.destination}
                  </h3>
                  {del.transportCost !== undefined && (
                    <p className="text-xs font-mono font-bold text-[#168447]">
                      Coût transport : {del.transportCost.toLocaleString('fr-FR')} {del.currency || 'CDF'}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {del.status === 'available' && (
                    <>
                      <input
                        type="number"
                        min="1"
                        placeholder="Coût (CDF)"
                        value={transportCosts[del.id] || ''}
                        onChange={(e) =>
                          setTransportCosts((prev) => ({ ...prev, [del.id]: e.target.value }))
                        }
                        className="w-36 rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono min-h-[40px]"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const cost = Number(transportCosts[del.id]) || 25000;
                          await onAcceptDelivery(del.id, cost);
                          setFeedback('Livraison acceptée.');
                        }}
                        className="rounded-xl bg-[#168447] text-white text-xs font-semibold px-3.5 py-2 min-h-[40px]"
                      >
                        Accepter la livraison
                      </button>
                    </>
                  )}
                  {del.status === 'accepted' && del.transporterId === profile.uid && (
                    <button
                      type="button"
                      onClick={() => onUpdateDeliveryStatus(del.id, 'in_transit')}
                      className="rounded-xl bg-[#1976D2] text-white text-xs font-semibold px-3.5 py-2 min-h-[40px]"
                    >
                      Démarrer le trajet
                    </button>
                  )}
                  {del.status === 'in_transit' && del.transporterId === profile.uid && (
                    <button
                      type="button"
                      onClick={() => onUpdateDeliveryStatus(del.id, 'delivered')}
                      className="rounded-xl bg-[#168447] text-white text-xs font-semibold px-3.5 py-2 min-h-[40px]"
                    >
                      Marquer livrée
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onStartChat(del.buyerId, 'Client')}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 text-xs font-medium px-3 py-2 min-h-[40px]"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Contacter client</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
            <div className="flex items-center gap-2 text-[#1976D2]">
              <CreditCard className="w-5 h-5" />
              <h2 className="text-base font-bold text-[#263238]">
                Architecture Paiement Mobile Money RDC (M-Pesa · Airtel Money · Orange Money)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Les intentions de paiement conservent uniquement la référence de transaction, le montant et l’opérateur choisi. Aucun code PIN ou mot de passe Mobile Money n’est jamais demandé ou enregistré. L’exécution réelle nécessite le raccordement des API marchands officielles (Vodacom M-Pesa, Airtel Africa, Orange Money RDC).
            </p>
          </div>

          {paymentIntents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-600">
              <Package className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              Aucune transaction Mobile Money initiée pour le moment.
            </div>
          ) : (
            <div className="space-y-3">
              {paymentIntents.map((pm) => (
                <div
                  key={pm.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs text-slate-500">
                      Réf : <span className="font-mono">{pm.reference}</span> · {pm.createdAt}
                    </p>
                    <h3 className="text-sm font-bold text-[#263238]">
                      {pm.operator} · {pm.phone}
                    </h3>
                    <p className="text-xs font-medium text-amber-700 mt-0.5">{pm.status}</p>
                  </div>
                  <span className="text-base font-mono font-bold tabular-nums text-[#168447]">
                    {pm.amount.toLocaleString('fr-FR')} {pm.currency}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

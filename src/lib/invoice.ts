import type { Payment } from './supabase';

export function buildInvoiceText(payment: Payment, client?: { first_name?: string; last_name?: string }) {
  const clientName = client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : 'Client';
  const lines = [
    'FACTURE KINÉSITHÉRAPIE',
    `Client: ${clientName}`,
    `Montant: ${Number(payment.amount).toFixed(3)} TND`,
    `Méthode: ${payment.payment_method}`,
    `Statut: ${payment.status}`,
    `Date: ${payment.paid_at}`,
  ];

  if (payment.notes) {
    lines.push('Notes:');
    lines.push(payment.notes);
  }

  return lines.join('\n');
}

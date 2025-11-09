// Utilitaires partagés

import { format, addDays, differenceInDays, isAfter } from 'date-fns';

/**
 * Formate un montant en F CFA
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' F CFA';
}

/**
 * Formate une date au format français
 */
export function formatDate(date: string | Date, formatStr: string = 'dd/MM/yyyy'): string {
  return format(new Date(date), formatStr);
}

/**
 * Vérifie si un abonnement est expiré
 */
export function isSubscriptionExpired(expiresAt: string | Date): boolean {
  return isAfter(new Date(), new Date(expiresAt));
}

/**
 * Calcule les jours restants avant expiration
 */
export function daysUntilExpiration(expiresAt: string | Date): number {
  return differenceInDays(new Date(expiresAt), new Date());
}

/**
 * Ajoute des jours à une date
 */
export function addDaysToDate(date: string | Date, days: number): Date {
  return addDays(new Date(date), days);
}

/**
 * Génère un numéro de facture unique
 */
export function generateInvoiceNumber(prefix: string = 'INV'): string {
  const date = format(new Date(), 'yyyyMMdd');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${date}-${random}`;
}

/**
 * Valide un numéro de téléphone (format Sénégal)
 */
export function validatePhoneNumber(phone: string): boolean {
  // Format: +221 XX XXX XX XX ou 77 123 45 67
  const regex = /^(\+221)?[7][0-9]{8}$/;
  return regex.test(phone.replace(/\s/g, ''));
}

/**
 * Valide un email
 */
export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Calcule la TVA (18% au Sénégal)
 */
export function calculateTax(amount: number, rate: number = 0.18): number {
  return Math.round(amount * rate);
}

/**
 * Calcule le montant HT à partir du TTC
 */
export function calculateAmountExcludingTax(amountIncludingTax: number, rate: number = 0.18): number {
  return Math.round(amountIncludingTax / (1 + rate));
}

/**
 * Tronque un texte avec ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * Génère un slug à partir d'une chaîne
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Vérifie si l'utilisateur a la permission
 */
export function hasPermission(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}

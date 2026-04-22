import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date): string {
  if (!date) return '-'
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDateShort(date: string | Date): string {
  if (!date) return '-'
  return format(new Date(date), 'dd/MM/yy', { locale: ptBR })
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export const STATUS_OBRA_LABEL: Record<string, string> = {
  prospeccao: 'Prospecção',
  orcamento: 'Orçamento',
  contratada: 'Contratada',
  em_andamento: 'Em Andamento',
  paralisada: 'Paralisada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

export const STATUS_OBRA_COLOR: Record<string, string> = {
  prospeccao: 'bg-gray-100 text-gray-700',
  orcamento: 'bg-blue-100 text-blue-700',
  contratada: 'bg-yellow-100 text-yellow-700',
  em_andamento: 'bg-green-100 text-green-700',
  paralisada: 'bg-orange-100 text-orange-700',
  concluida: 'bg-emerald-100 text-emerald-700',
  cancelada: 'bg-red-100 text-red-700',
}

export const STATUS_ORC_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  em_revisao: 'Em Revisão',
  expirado: 'Expirado',
}

export const STATUS_ORC_COLOR: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-700',
  enviado: 'bg-blue-100 text-blue-700',
  aprovado: 'bg-green-100 text-green-700',
  reprovado: 'bg-red-100 text-red-700',
  em_revisao: 'bg-yellow-100 text-yellow-700',
  expirado: 'bg-orange-100 text-orange-700',
}

export const TIPO_CONTA_LABEL: Record<string, string> = {
  gerencial: 'Conta Gerencial',
  operacional: 'Conta Operacional',
  fluxo_fixo: 'Fluxo Fixo',
  provisao: 'Provisões',
  lucro_excedente: 'Lucro Excedente',
  caixa: 'Caixa',
}

export const TIPO_CONTA_COLOR: Record<string, string> = {
  gerencial: '#22c55e',
  operacional: '#f97316',
  fluxo_fixo: '#f59e0b',
  provisao: '#8b5cf6',
  lucro_excedente: '#a855f7',
  caixa: '#ef4444',
}

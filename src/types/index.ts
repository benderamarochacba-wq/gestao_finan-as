export type TransactionType = 'receita' | 'despesa_fixa' | 'despesa_variavel';

export type TransactionStatus = 'pendente' | 'pago';

export interface Transaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  is_recurring: boolean;
  recurring_group_id: string | null;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionFormData {
  description: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  is_recurring: boolean;
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  receita: 'Receita',
  despesa_fixa: 'Despesa Fixa',
  despesa_variavel: 'Despesa Variável',
};

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  pendente: 'Pendente de pagamento',
  pago: 'Foi pago',
};

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

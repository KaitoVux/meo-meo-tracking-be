import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Expense } from '../../entities/expense.entity';

@Injectable()
export class PaymentIdService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Generates the next payment ID with auto-increment logic
   * Requirements 1.4, 1.5: Auto-increment starting from 1, sub-IDs for same vendor
   */
  async generatePaymentId(
    vendor: string,
    transactionDate: Date,
  ): Promise<{ paymentId: string; subId?: string }> {
    // Check if there are existing expenses for the same vendor on the same transaction date
    const existingExpensesForVendor = await this.em.find(
      Expense,
      {
        vendor,
        transactionDate: {
          $gte: new Date(
            transactionDate.getFullYear(),
            transactionDate.getMonth(),
            transactionDate.getDate(),
          ),
          $lt: new Date(
            transactionDate.getFullYear(),
            transactionDate.getMonth(),
            transactionDate.getDate() + 1,
          ),
        },
      },
      {
        orderBy: { paymentId: 'DESC', subId: 'DESC' },
      },
    );

    if (existingExpensesForVendor.length > 0) {
      // Same vendor, same transaction date - use sub-ID logic
      const latestExpense = existingExpensesForVendor[0];
      const basePaymentId = latestExpense.paymentId;

      // Find the highest sub-ID for this payment ID
      const expensesWithSamePaymentId = existingExpensesForVendor.filter(
        (exp) => exp.paymentId === basePaymentId,
      );

      let nextSubId = 1;
      if (expensesWithSamePaymentId.length > 0) {
        const subIds = expensesWithSamePaymentId
          .map((exp) => (exp.subId ? parseInt(exp.subId) : 0))
          .filter((id) => !isNaN(id));

        if (subIds.length > 0) {
          nextSubId = Math.max(...subIds) + 1;
        }
      }

      return {
        paymentId: basePaymentId,
        subId: nextSubId.toString(),
      };
    }

    // New vendor or different transaction date - generate new payment ID
    const latestExpense = await this.em.findOne(
      Expense,
      {},
      {
        orderBy: { paymentId: 'DESC' },
      },
    );

    let nextPaymentId = 1;
    if (latestExpense && latestExpense.paymentId) {
      // Extract numeric part from payment ID (handle cases like "15" or "15-1")
      const numericPart = latestExpense.paymentId.split('-')[0];
      const currentId = parseInt(numericPart);
      if (!isNaN(currentId)) {
        nextPaymentId = currentId + 1;
      }
    }

    return {
      paymentId: nextPaymentId.toString(),
    };
  }

  /**
   * Validates payment ID format
   */
  validatePaymentIdFormat(paymentId: string, subId?: string): boolean {
    // Payment ID should be numeric
    if (!/^\d+$/.test(paymentId)) {
      return false;
    }

    // Sub ID should be numeric if provided
    if (subId && !/^\d+$/.test(subId)) {
      return false;
    }

    return true;
  }

  /**
   * Formats payment ID for display (e.g., "15" or "15-1")
   */
  formatPaymentId(paymentId: string, subId?: string): string {
    if (subId) {
      return `${paymentId}-${subId}`;
    }
    return paymentId;
  }

  /**
   * Parses formatted payment ID back to components
   */
  parsePaymentId(formattedId: string): { paymentId: string; subId?: string } {
    if (!formattedId || formattedId.trim() === '') {
      throw new Error('Invalid payment ID format');
    }

    const parts = formattedId.split('-');
    if (parts.length === 1) {
      return { paymentId: parts[0] };
    } else if (parts.length === 2) {
      return { paymentId: parts[0], subId: parts[1] };
    }
    throw new Error('Invalid payment ID format');
  }
}

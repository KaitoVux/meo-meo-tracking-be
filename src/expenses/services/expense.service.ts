import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EntityManager, FilterQuery, FindOptions } from '@mikro-orm/core';
import { Expense, ExpenseStatus } from '../../entities/expense.entity';
import { User } from '../../entities/user.entity';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto } from '../dto';
import { ExpenseValidationService } from './expense-validation.service';
import { PaymentIdService } from './payment-id.service';
import { ExpenseWorkflowService } from './expense-workflow.service';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ExpenseStatistics {
  totalExpenses: number;
  totalAmount: number;
  statusCounts: Record<string, number>;
}

@Injectable()
export class ExpenseService {
  constructor(
    private readonly em: EntityManager,
    private readonly validationService: ExpenseValidationService,
    private readonly paymentIdService: PaymentIdService,
    private readonly workflowService: ExpenseWorkflowService,
  ) {}

  /**
   * Creates a new expense with validation and payment ID generation
   * Requirements 1.1, 1.2, 1.4, 1.5
   */
  async create(createExpenseDto: CreateExpenseDto): Promise<Expense> {
    // Validate expense data
    const validationResult =
      this.validationService.validateExpenseCreation(createExpenseDto);
    this.validationService.validateOrThrow(validationResult);

    // Verify submitter exists
    const submitter = await this.em.findOne(User, {
      id: createExpenseDto.submitterId,
    });
    if (!submitter) {
      throw new BadRequestException('Submitter not found');
    }

    // Generate payment ID
    const expenseDate = new Date(createExpenseDto.date);
    const { paymentId, subId } = await this.paymentIdService.generatePaymentId(
      createExpenseDto.vendor,
      expenseDate,
    );

    // Create expense entity
    const expense = new Expense();
    expense.paymentId = paymentId;
    expense.subId = subId;
    expense.date = expenseDate;
    expense.vendor = createExpenseDto.vendor;
    expense.category = createExpenseDto.category;
    expense.amount = createExpenseDto.amount;
    expense.currency = createExpenseDto.currency;
    expense.exchangeRate = createExpenseDto.exchangeRate;
    expense.description = createExpenseDto.description;
    expense.submitter = submitter;
    expense.projectCostCenter = createExpenseDto.projectCostCenter;
    expense.paymentMethod = createExpenseDto.paymentMethod;
    expense.status = ExpenseStatus.DRAFT;

    // Handle invoice file if provided
    if (createExpenseDto.invoiceFileId) {
      // Note: File entity relationship would be set here
      // For now, we'll store the file ID reference
    }

    this.em.persist(expense);
    await this.em.flush();

    return expense;
  }

  /**
   * Finds expenses with pagination and filtering
   * Requirement 3.7: 100 records per page limit
   */
  async findAll(query: ExpenseQueryDto): Promise<PaginatedResult<Expense>> {
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '100'), 100); // Enforce 100 record limit
    const offset = (page - 1) * limit;

    // Build filter query
    const where: FilterQuery<Expense> = {};

    if (query.vendor) {
      where.vendor = { $ilike: `%${query.vendor}%` };
    }

    if (query.category) {
      where.category = { $ilike: `%${query.category}%` };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.currency) {
      where.currency = query.currency;
    }

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }

    if (query.submitterId) {
      where.submitter = query.submitterId;
    }

    if (query.paymentId) {
      where.paymentId = { $ilike: `%${query.paymentId}%` };
    }

    // Date range filtering
    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) {
        where.date.$gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.date.$lte = new Date(query.dateTo);
      }
    }

    const [expenses, total] = await this.em.findAndCount(Expense, where, {
      populate: ['submitter', 'invoiceFile'],
      orderBy: { createdAt: 'DESC' },
      limit,
      offset,
    });

    return {
      data: expenses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Finds a single expense by ID
   */
  async findOne(id: string, includeDeleted = false): Promise<Expense> {
    const options: FindOptions<Expense> = {
      populate: [
        'submitter',
        'invoiceFile',
        'statusHistory',
        'statusHistory.changedBy',
      ] as never[],
    };

    // Disable soft delete filter if we want to include deleted records
    if (includeDeleted) {
      options.filters = { softDelete: false };
    }

    const expense = await this.em.findOne(Expense, { id }, options);

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  /**
   * Updates an expense with validation
   */
  async update(
    id: string,
    updateExpenseDto: UpdateExpenseDto,
  ): Promise<Expense> {
    const expense = await this.findOne(id);

    // Validate update data
    const validationResult = this.validationService.validateExpenseUpdate(
      updateExpenseDto,
      expense,
    );
    this.validationService.validateOrThrow(validationResult);

    // Check if expense can be updated (not in final states)
    if (expense.status === ExpenseStatus.CLOSED) {
      throw new BadRequestException('Cannot update closed expense');
    }

    // Update fields
    if (updateExpenseDto.date) {
      expense.date = new Date(updateExpenseDto.date);
    }
    if (updateExpenseDto.vendor) {
      expense.vendor = updateExpenseDto.vendor;
    }
    if (updateExpenseDto.category) {
      expense.category = updateExpenseDto.category;
    }
    if (updateExpenseDto.amount !== undefined) {
      expense.amount = updateExpenseDto.amount;
    }
    if (updateExpenseDto.currency) {
      expense.currency = updateExpenseDto.currency;
    }
    if (updateExpenseDto.exchangeRate !== undefined) {
      expense.exchangeRate = updateExpenseDto.exchangeRate;
    }
    if (updateExpenseDto.description) {
      expense.description = updateExpenseDto.description;
    }
    if (updateExpenseDto.projectCostCenter !== undefined) {
      expense.projectCostCenter = updateExpenseDto.projectCostCenter;
    }
    if (updateExpenseDto.paymentMethod) {
      expense.paymentMethod = updateExpenseDto.paymentMethod;
    }

    expense.updatedAt = new Date();

    await this.em.flush();
    return expense;
  }

  /**
   * Updates expense status using workflow service
   * Requirements 2.1-2.5
   */
  async updateStatus(
    id: string,
    status: ExpenseStatus,
    userId: string,
    notes?: string,
  ): Promise<Expense> {
    return this.workflowService.updateExpenseStatus(id, status, userId, notes);
  }

  /**
   * Soft deletes an expense
   */
  async remove(id: string): Promise<void> {
    const expense = await this.findOne(id);

    // Only allow deletion of draft expenses
    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new BadRequestException('Can only delete draft expenses');
    }

    // Soft delete by setting deletedAt timestamp
    expense.deletedAt = new Date();
    await this.em.flush();
  }

  /**
   * Hard deletes an expense (permanently removes from database)
   */
  async hardDelete(id: string): Promise<void> {
    const expense = await this.findOne(id);

    // Only allow hard deletion of draft expenses
    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new BadRequestException('Can only hard delete draft expenses');
    }

    this.em.remove(expense);
    await this.em.flush();
  }

  /**
   * Restores a soft-deleted expense
   */
  async restore(id: string): Promise<Expense> {
    const expense = await this.em.findOne(Expense, { id });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (!expense.deletedAt) {
      throw new BadRequestException('Expense is not deleted');
    }

    expense.deletedAt = undefined;
    await this.em.flush();

    return expense;
  }

  /**
   * Gets expenses by payment ID (including sub-IDs)
   */
  async findByPaymentId(
    paymentId: string,
    includeDeleted = false,
  ): Promise<Expense[]> {
    const options: FindOptions<Expense> = {
      populate: ['submitter'] as never[],
      orderBy: { subId: 'ASC' },
    };

    // Disable soft delete filter if we want to include deleted records
    if (includeDeleted) {
      options.filters = { softDelete: false };
    }

    return this.em.find(Expense, { paymentId }, options);
  }

  /**
   * Gets expense statistics for dashboard
   */
  async getExpenseStatistics(userId?: string): Promise<ExpenseStatistics> {
    const where: FilterQuery<Expense> = {};
    if (userId) {
      where.submitter = userId;
    }

    const totalExpenses = await this.em.count(Expense, where);

    // Calculate total amount
    const expenses = await this.em.find(Expense, where, { fields: ['amount'] });
    const totalAmount = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    // Calculate status counts
    const allExpenses = await this.em.find(Expense, where, {
      fields: ['status'],
    });
    const statusCounts = allExpenses.reduce(
      (acc, expense) => {
        acc[expense.status] = (acc[expense.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalExpenses,
      totalAmount,
      statusCounts,
    };
  }

  /**
   * Finds all soft-deleted expenses with pagination
   */
  async findDeleted(query: ExpenseQueryDto): Promise<PaginatedResult<Expense>> {
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '100'), 100);
    const offset = (page - 1) * limit;

    // Build filter query - only soft deleted records
    const where: FilterQuery<Expense> = {
      deletedAt: { $ne: null },
    };

    if (query.vendor) {
      where.vendor = { $ilike: `%${query.vendor}%` };
    }

    if (query.category) {
      where.category = { $ilike: `%${query.category}%` };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.submitterId) {
      where.submitter = query.submitterId;
    }

    const [expenses, total] = await this.em.findAndCount(Expense, where, {
      populate: ['submitter', 'invoiceFile'],
      orderBy: { deletedAt: 'DESC' },
      limit,
      offset,
      filters: { softDelete: false }, // Disable soft delete filter to find deleted records
    });

    return {
      data: expenses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

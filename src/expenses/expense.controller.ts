import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ExpenseService } from './services/expense.service';
import { ExpenseWorkflowService } from './services/expense-workflow.service';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  UpdateExpenseStatusDto,
  ExpenseQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

interface AuthenticatedUser {
  id: string;
  email: string;
}

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpenseController {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly workflowService: ExpenseWorkflowService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createExpenseDto: CreateExpenseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Set submitter to current user if not provided
    if (!createExpenseDto.submitterId) {
      createExpenseDto.submitterId = user.id;
    }

    const expense = await this.expenseService.create(createExpenseDto);
    return {
      success: true,
      data: expense,
      message: 'Expense created successfully',
    };
  }

  @Get()
  async findAll(@Query() query: ExpenseQueryDto) {
    const result = await this.expenseService.findAll(query);
    return {
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Get('statistics')
  async getStatistics(@CurrentUser() user: AuthenticatedUser) {
    const stats = await this.expenseService.getExpenseStatistics(user.id);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('payment/:paymentId')
  async findByPaymentId(@Param('paymentId') paymentId: string) {
    const expenses = await this.expenseService.findByPaymentId(paymentId);
    return {
      success: true,
      data: expenses,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const expense = await this.expenseService.findOne(id);
    return {
      success: true,
      data: expense,
    };
  }

  @Get(':id/status-history')
  async getStatusHistory(@Param('id') id: string) {
    const history = await this.workflowService.getExpenseStatusHistory(id);
    return {
      success: true,
      data: history,
    };
  }

  @Get(':id/available-transitions')
  async getAvailableTransitions(@Param('id') id: string) {
    const expense = await this.expenseService.findOne(id);
    const transitions = this.workflowService.getAvailableTransitions(
      expense.status,
    );
    return {
      success: true,
      data: transitions,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    const expense = await this.expenseService.update(id, updateExpenseDto);
    return {
      success: true,
      data: expense,
      message: 'Expense updated successfully',
    };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateExpenseStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const expense = await this.expenseService.updateStatus(
      id,
      updateStatusDto.status,
      user.id,
      updateStatusDto.notes,
    );
    return {
      success: true,
      data: expense,
      message: `Expense status updated to ${updateStatusDto.status}`,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.expenseService.remove(id);
    return {
      success: true,
      message: 'Expense deleted successfully',
    };
  }

  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  async hardDelete(@Param('id') id: string) {
    await this.expenseService.hardDelete(id);
    return {
      success: true,
      message: 'Expense permanently deleted',
    };
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string) {
    const expense = await this.expenseService.restore(id);
    return {
      success: true,
      data: expense,
      message: 'Expense restored successfully',
    };
  }

  @Get('deleted')
  async findDeleted(@Query() query: ExpenseQueryDto) {
    const result = await this.expenseService.findDeleted(query);
    return {
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }
}

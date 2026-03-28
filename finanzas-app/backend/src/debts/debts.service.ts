import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Debt, DebtType } from '../database/entities/debt.entity';

@Injectable()
export class DebtsService {
  constructor(@InjectRepository(Debt) private debtRepo: Repository<Debt>) {}

  async findAll(houseId?: string) {
    return this.debtRepo.find({ where: houseId ? { house: { id: houseId } } : {}, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const debt = await this.debtRepo.findOne({ where: { id } });
    if (!debt) throw new NotFoundException('Deuda no encontrada');
    return debt;
  }

  async create(dto: any, houseId: string) {
    const debt = this.debtRepo.create({ ...dto, house: { id: houseId } });
    return this.debtRepo.save(debt);
  }

  async update(id: string, dto: any) {
    const debt = await this.findOne(id);
    if (dto.isPaid && !debt.isPaid) dto.paidAt = new Date();
    Object.assign(debt, dto);
    return this.debtRepo.save(debt);
  }

  async remove(id: string) {
    const debt = await this.findOne(id);
    await this.debtRepo.remove(debt);
    return { message: 'Deuda eliminada' };
  }

  async getSummary(houseId?: string) {
    const debts = await this.findAll(houseId);
    const active = debts.filter(d => !d.isPaid);

    const theyOweMe = active
      .filter(d => d.type === DebtType.THEY_OWE_ME)
      .reduce((sum, d) => sum + Number(d.amount), 0);

    const iOwe = active
      .filter(d => d.type === DebtType.I_OWE)
      .reduce((sum, d) => sum + Number(d.amount), 0);

    const byPerson = active.reduce((acc, d) => {
      if (!acc[d.personName]) acc[d.personName] = { theyOweMe: 0, iOwe: 0 };
      if (d.type === DebtType.THEY_OWE_ME) acc[d.personName].theyOweMe += Number(d.amount);
      else acc[d.personName].iOwe += Number(d.amount);
      return acc;
    }, {});

    return {
      totalTheyOweMe: theyOweMe,
      totalIOwe: iOwe,
      balance: theyOweMe - iOwe,
      totalDebts: debts.length,
      activeDebts: active.length,
      byPerson,
    };
  }
}

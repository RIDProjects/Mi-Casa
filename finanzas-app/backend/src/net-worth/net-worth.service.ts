import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset, AssetType } from '../database/entities/asset.entity';

@Injectable()
export class NetWorthService {
  constructor(
    @InjectRepository(Asset) private repo: Repository<Asset>,
  ) {}

  async findByHouse(houseId: string) {
    return this.repo.find({
      where: { house: { id: houseId } },
      order: { createdAt: 'DESC' },
    });
  }

  async getNetWorthSummary(
    houseId: string,
    totalCardBalances: number = 0,
    totalLoanDebt: number = 0,
  ) {
    const assets = await this.findByHouse(houseId);

    const physicalAssets = assets
      .filter((a) => a.assetType === AssetType.PHYSICAL)
      .reduce((s, a) => s + Number(a.value), 0);

    const cashAssets = assets
      .filter((a) => a.assetType === AssetType.CASH)
      .reduce((s, a) => s + Number(a.value), 0);

    const totalAssets = physicalAssets + cashAssets;
    const totalDebts = totalCardBalances + totalLoanDebt;
    const netWorth = totalAssets - totalDebts;

    return {
      physicalAssets: Math.round(physicalAssets * 100) / 100,
      cashAssets: Math.round(cashAssets * 100) / 100,
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalDebts: Math.round(totalDebts * 100) / 100,
      netWorth: Math.round(netWorth * 100) / 100,
      assets,
    };
  }

  async create(dto: any, houseId: string) {
    const asset = this.repo.create({ ...dto, house: { id: houseId } });
    return this.repo.save(asset);
  }

  async update(id: string, dto: any) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('Activo no encontrado');
    Object.assign(asset, dto);
    return this.repo.save(asset);
  }

  async remove(id: string) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('Activo no encontrado');
    await this.repo.remove(asset);
    return { message: 'Activo eliminado' };
  }
}

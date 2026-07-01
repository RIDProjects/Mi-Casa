import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset, AssetType } from '../database/entities/asset.entity';

@Injectable()
export class NetWorthService {
  constructor(
    @InjectRepository(Asset) private repo: Repository<Asset>,
  ) {}

  private toFrontend(a: Asset) {
    return {
      id:             a.id,
      nombre:         a.name,
      valorEstimado:  a.value,
      assetType:      a.assetType,
      notas:          a.notes,
      createdAt:      a.createdAt,
      updatedAt:      a.updatedAt,
    };
  }

  private fromFrontend(dto: any): Partial<Asset> {
    return {
      name:      dto.nombre,
      value:     dto.valorEstimado,
      assetType: dto.assetType,
      notes:     dto.notas,
    };
  }

  async getNetWorthSummary(
    houseId: string,
    totalCardBalances: number = 0,
    totalLoanDebt: number = 0,
  ) {
    if (!houseId) return { physicalAssets: 0, cashAssets: 0, totalAssets: 0, totalDebts: 0, netWorth: 0, assets: [] };

    const raw = await this.repo.find({
      where: { house: { id: houseId } },
      order: { createdAt: 'DESC' },
    });

    const physical = raw.filter(a => a.assetType === AssetType.PHYSICAL).reduce((s, a) => s + Number(a.value), 0);
    const cash     = raw.filter(a => a.assetType === AssetType.CASH).reduce((s, a) => s + Number(a.value), 0);
    const totalAssets = physical + cash;
    const totalDebts  = totalCardBalances + totalLoanDebt;

    return {
      physicalAssets: Math.round(physical * 100) / 100,
      cashAssets:     Math.round(cash * 100) / 100,
      totalAssets:    Math.round(totalAssets * 100) / 100,
      totalDebts:     Math.round(totalDebts * 100) / 100,
      netWorth:       Math.round((totalAssets - totalDebts) * 100) / 100,
      assets:         raw.map(a => this.toFrontend(a)),
    };
  }

  async create(dto: any, houseId: string) {
    const asset = this.repo.create({ ...this.fromFrontend(dto), house: { id: houseId } as any });
    return this.toFrontend(await this.repo.save(asset));
  }

  async update(id: string, dto: any) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('Activo no encontrado');
    Object.assign(asset, this.fromFrontend(dto));
    return this.toFrontend(await this.repo.save(asset));
  }

  async remove(id: string) {
    const asset = await this.repo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('Activo no encontrado');
    await this.repo.remove(asset);
    return { message: 'Activo eliminado' };
  }
}

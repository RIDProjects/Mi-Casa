import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset, AssetType } from '../database/entities/asset.entity';
import { NetWorthSnapshot } from '../database/entities/net-worth-snapshot.entity';

interface AssetFrontendDto {
  nombre?: string;
  valorEstimado?: number;
  assetType?: AssetType;
  notas?: string;
}

@Injectable()
export class NetWorthService {
  private readonly logger = new Logger(NetWorthService.name);

  constructor(
    @InjectRepository(Asset) private repo: Repository<Asset>,
    @InjectRepository(NetWorthSnapshot) private snapshotRepo: Repository<NetWorthSnapshot>,
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

  private fromFrontend(dto: AssetFrontendDto): Partial<Asset> {
    return {
      name:      dto.nombre,
      value:     dto.valorEstimado,
      assetType: dto.assetType,
      notes:     dto.notas,
    };
  }

  private currentMonthFirstDay(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }

  async saveSnapshot(houseId: string, totalAssets: number, totalLiabilities: number) {
    const snapshotDate = this.currentMonthFirstDay();
    const netWorth = totalAssets - totalLiabilities;

    const existing = await this.snapshotRepo.findOne({
      where: { house: { id: houseId }, snapshotDate },
    });

    if (existing) {
      existing.totalAssets = totalAssets;
      existing.totalLiabilities = totalLiabilities;
      existing.netWorth = netWorth;
      await this.snapshotRepo.save(existing);
    } else {
      await this.snapshotRepo.save(
        this.snapshotRepo.create({
          snapshotDate,
          totalAssets,
          totalLiabilities,
          netWorth,
          house: { id: houseId } as any,
        }),
      );
    }
  }

  async getHistory(houseId: string, months = 12) {
    const snapshots = await this.snapshotRepo.find({
      where: { house: { id: houseId } },
      order: { snapshotDate: 'DESC' },
      take: months,
    });
    // Frontend (patrimonio.tsx) reads month/netWorth/assets/liabilities from
    // each history point -- the entity stores snapshotDate/totalAssets/
    // totalLiabilities, so map to the contract the chart expects.
    return snapshots.map(s => ({
      month: s.snapshotDate,
      netWorth: Number(s.netWorth),
      assets: Number(s.totalAssets),
      liabilities: Number(s.totalLiabilities),
    }));
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

    this.saveSnapshot(houseId, totalAssets, totalDebts).catch((err) =>
      this.logger.error(`Failed to save net-worth snapshot for house ${houseId}: ${err.message}`),
    );

    return {
      physicalAssets: Math.round(physical * 100) / 100,
      cashAssets:     Math.round(cash * 100) / 100,
      totalAssets:    Math.round(totalAssets * 100) / 100,
      totalDebts:     Math.round(totalDebts * 100) / 100,
      netWorth:       Math.round((totalAssets - totalDebts) * 100) / 100,
      assets:         raw.map(a => this.toFrontend(a)),
    };
  }

  async create(dto: AssetFrontendDto, houseId: string) {
    const asset = this.repo.create({ ...this.fromFrontend(dto), house: { id: houseId } as any });
    return this.toFrontend(await this.repo.save(asset));
  }

  async update(id: string, houseId: string, dto: AssetFrontendDto) {
    const asset = await this.repo.findOne({ where: { id, house: { id: houseId } } });
    if (!asset) throw new NotFoundException('Activo no encontrado');
    Object.assign(asset, this.fromFrontend(dto));
    return this.toFrontend(await this.repo.save(asset));
  }

  async remove(id: string, houseId: string) {
    const asset = await this.repo.findOne({ where: { id, house: { id: houseId } } });
    if (!asset) throw new NotFoundException('Activo no encontrado');
    await this.repo.remove(asset);
    return { message: 'Activo eliminado' };
  }
}

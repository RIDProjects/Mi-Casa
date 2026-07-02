import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuotasController } from './cuotas.controller';
import { CuotasService } from './cuotas.service';
import { Cuota } from '../database/entities/cuota.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Cuota]), AuthModule],
  controllers: [CuotasController],
  providers: [CuotasService],
  exports: [CuotasService],
})
export class CuotasModule {}

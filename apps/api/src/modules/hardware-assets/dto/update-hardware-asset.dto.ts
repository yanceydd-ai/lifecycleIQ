import { PartialType } from '@nestjs/mapped-types';
import { CreateHardwareAssetDto } from './create-hardware-asset.dto';

export class UpdateHardwareAssetDto extends PartialType(CreateHardwareAssetDto) {}

import { PartialType } from '@nestjs/mapped-types';
import { CreateSoftwareProductDto } from './create-software-product.dto';

export class UpdateSoftwareProductDto extends PartialType(CreateSoftwareProductDto) {}

import { Controller } from '@nestjs/common';
import { OutletsService } from './outlets.service';

@Controller('outlets')
export class OutletsController {
  constructor(private readonly outletsService: OutletsService) {}
}

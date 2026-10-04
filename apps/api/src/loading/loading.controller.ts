import { Controller } from '@nestjs/common';
import { LoadingService } from './loading.service';

@Controller('loading')
export class LoadingController {
  constructor(private readonly loadingService: LoadingService) {}
}

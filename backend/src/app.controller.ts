import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('status')
  getStatus() {
    return { 
      service: 'campaign-backend', 
      version: '1.0.1-fixed', 
      env: process.env.NODE_ENV 
    };
  }
}

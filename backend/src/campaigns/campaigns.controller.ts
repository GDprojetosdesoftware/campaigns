import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  create(@Body() createCampaignDto: any) {
    return this.campaignsService.create(createCampaignDto);
  }

  @Get('inboxes')
  getInboxes() {
    return this.campaignsService.getInboxes();
  }

  @Get('instances')
  getInstances() {
    return this.campaignsService.getEvolutionInstances();
  }

  @Get()
  findAll() {
    return this.campaignsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(+id);
  }
}

import { Controller, Get, Post, Body, Param, InternalServerErrorException, Logger } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
export class CampaignsController {
  private readonly logger = new Logger(CampaignsController.name);
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  async create(@Body() createCampaignDto: any) {
    try {
      return await this.campaignsService.create(createCampaignDto);
    } catch (error) {
      console.error('Error creating campaign in controller:', error);
      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException('Unknown error creating campaign');
    }
  }

  @Get('inboxes')
  async getInboxes() {
    try {
      return await this.campaignsService.getInboxes();
    } catch (error) {
      this.logger.error(`Error fetching inboxes: ${error.message}`);
      throw new InternalServerErrorException('Erro ao buscar inboxes do Chatwoot');
    }
  }

  @Get('labels')
  async getLabels() {
    try {
      return await this.campaignsService.getLabels();
    } catch (error) {
      this.logger.error(`Error fetching labels: ${error.message}`);
      throw new InternalServerErrorException('Erro ao buscar etiquetas do Chatwoot');
    }
  }

  @Get('instances')
  async getInstances() {
    try {
      return await this.campaignsService.getEvolutionInstances();
    } catch (error) {
      this.logger.error(`Error fetching instances: ${error.message}`);
      throw new InternalServerErrorException('Erro ao buscar instâncias do Evolution API');
    }
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

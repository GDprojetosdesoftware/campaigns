import { Controller, Get, Post, Body, Param, Delete, Put, InternalServerErrorException, Logger } from '@nestjs/common';
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

  @Post(':id/start')
  async start(@Param('id') id: string) {
    try {
      return await this.campaignsService.startCampaign(+id);
    } catch (error) {
      console.error('Error starting campaign in controller:', error);
      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException('Unknown error starting campaign');
    }
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string) {
    try {
      return await this.campaignsService.duplicate(+id);
    } catch (error) {
      this.logger.error(`Error duplicating campaign: ${error.message}`);
      throw new InternalServerErrorException(error.message || 'Error duplicating campaign');
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    try {
      return await this.campaignsService.update(+id, updateDto);
    } catch (error) {
      this.logger.error(`Error updating campaign: ${error.message}`);
      throw new InternalServerErrorException(error.message || 'Error updating campaign');
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.campaignsService.remove(+id);
    } catch (error) {
      this.logger.error(`Error deleting campaign: ${error.message}`);
      throw new InternalServerErrorException(error.message || 'Error deleting campaign');
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

  /** Endpoint de debug temporário para testar filtros do Chatwoot */
  @Get('debug-filter/:label')
  async debugFilter(@Param('label') label: string) {
    try {
      return await this.campaignsService.debugChatwootFilter(label);
    } catch (error) {
      this.logger.error(`Debug filter error: ${error.message}`);
      throw new InternalServerErrorException(error.message);
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

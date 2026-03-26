import { Controller, Get, Post, Body, Param, Delete, Put, InternalServerErrorException, Logger, Headers, UnauthorizedException, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CampaignsService } from './campaigns.service';
import { diskStorage } from 'multer';
import { extname } from 'path';


@Controller('campaigns')
export class CampaignsController {
  private readonly logger = new Logger(CampaignsController.name);
  constructor(private readonly campaignsService: CampaignsService) {}

  /** Valida e extrai os headers de tenant. Lança 401 se ausentes. */
  private requireTenant(accountId: string, token: string): { aid: number; token: string } {
    if (!accountId || isNaN(+accountId) || !token) {
      throw new UnauthorizedException(
        'Parâmetros de conta ausentes. Acesse esta página pelo Chatwoot com ?accountId=X&token=Y na URL.'
      );
    }
    return { aid: +accountId, token };
  }

  @Post()
  async create(@Body() createCampaignDto: any, @Headers('x-account-id') accountId: string, @Headers('x-auth-token') token: string) {
    try {
      const { aid, token: tok } = this.requireTenant(accountId, token);
      createCampaignDto.accountId = aid;
      return await this.campaignsService.create(createCampaignDto, tok);
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(error.message || 'Unknown error creating campaign');
    }
  }

  @Post(':id/start')
  async start(@Param('id') id: string) {
    try {
      return await this.campaignsService.startCampaign(+id);
    } catch (error) {
      throw new InternalServerErrorException(error.message || 'Unknown error starting campaign');
    }
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string) {
    try {
      return await this.campaignsService.duplicate(+id);
    } catch (error) {
      throw new InternalServerErrorException(error.message || 'Error duplicating campaign');
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any, @Headers('x-account-id') accountId: string, @Headers('x-auth-token') token: string) {
    try {
      const { aid } = this.requireTenant(accountId, token);
      return await this.campaignsService.update(+id, updateDto, aid);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException(error.message || 'Error updating campaign');
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Headers('x-account-id') accountId: string, @Headers('x-auth-token') token: string) {
    try {
      const { aid } = this.requireTenant(accountId, token);
      return await this.campaignsService.remove(+id, aid);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException(error.message || 'Error deleting campaign');
    }
  }

  @Get('inboxes')
  async getInboxes(@Headers('x-account-id') accountId: string, @Headers('x-auth-token') token: string) {
    try {
      const { aid, token: tok } = this.requireTenant(accountId, token);
      return await this.campaignsService.getInboxes(aid, tok);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      const detail = error.response?.data?.message || error.message || 'Erro desconhecido';
      throw new InternalServerErrorException(`Erro Chatwoot Inboxes: ${detail}`);
    }
  }

  @Get('labels')
  async getLabels(@Headers('x-account-id') accountId: string, @Headers('x-auth-token') token: string) {
    try {
      const { aid, token: tok } = this.requireTenant(accountId, token);
      return await this.campaignsService.getLabels(aid, tok);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      const detail = error.response?.data?.message || error.message || 'Erro desconhecido';
      throw new InternalServerErrorException(`Erro Chatwoot Labels: ${detail}`);
    }
  }

  @Get('instances')
  async getInstances() {
    try {
      return await this.campaignsService.getEvolutionInstances();
    } catch (error) {
      const detail = error.response?.data?.message || error.message || 'Erro desconhecido';
      throw new InternalServerErrorException(`Erro Evolution Instances: ${detail}`);
    }
  }

  @Get('debug-filter/:label')
  async debugFilter(@Param('label') label: string) {
    try {
      return await this.campaignsService.debugChatwootFilter(label);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    
    // Detect type based on mimetype
    let type = 'document';
    if (file.mimetype.startsWith('image/')) type = 'image';
    else if (file.mimetype.startsWith('video/')) type = 'video';
    else if (file.mimetype.startsWith('audio/')) type = 'audio';

    // The URL should be relative to the base URL or absolute
    // For local dev, we assume /uploads/filename
    return {
      url: `/api/uploads/${file.filename}`,
      type: type,
      filename: file.originalname
    };
  }

  @Get()
  async findAll(@Headers('x-account-id') accountId: string, @Headers('x-auth-token') token: string) {
    const { aid } = this.requireTenant(accountId, token);
    return this.campaignsService.findAll(aid);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Headers('x-account-id') accountId: string, @Headers('x-auth-token') token: string) {
    const { aid } = this.requireTenant(accountId, token);
    return this.campaignsService.findOne(+id, aid);
  }
}

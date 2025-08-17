import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { GoogleDriveService } from './google-drive.service';
import { File } from '../entities/file.entity';

@Module({
  imports: [MikroOrmModule.forFeature([File])],
  controllers: [FilesController],
  providers: [FilesService, GoogleDriveService],
  exports: [FilesService, GoogleDriveService],
})
export class FilesModule {}

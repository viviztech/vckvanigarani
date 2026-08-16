import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JurisdictionsModule } from '../jurisdictions/jurisdictions.module';
import { PostsModule } from '../posts/posts.module';
import { PublicController } from './public.controller';
import { PublicRegistrationsService } from './public-registrations.service';
import { PublicDirectoryService } from './public-directory.service';
import { PublicContentService } from './public-content.service';

@Module({
  imports: [AuthModule, JurisdictionsModule, PostsModule],
  controllers: [PublicController],
  providers: [PublicRegistrationsService, PublicDirectoryService, PublicContentService],
})
export class PublicModule {}

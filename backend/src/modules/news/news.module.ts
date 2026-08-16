import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { FeedQueryService } from './feed-query.service';
import { FanoutJob } from './fanout.job';

@Module({
  controllers: [NewsController],
  providers: [NewsService, FeedQueryService, FanoutJob],
})
export class NewsModule {}

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestLoggingMiddleware } from './common/filters/request-logging.middleware';
import { PrismaModule } from './prisma/prisma.module';
import { AuditLogModule } from './common/audit/audit-log.module';
import { GuardsModule } from './common/guards/guards.module';
import { NotificationsModule } from './common/notifications/notifications.module';
import { AuthModule } from './modules/auth/auth.module';
import { PostsModule } from './modules/posts/posts.module';
import { JurisdictionsModule } from './modules/jurisdictions/jurisdictions.module';
import { BearersModule } from './modules/bearers/bearers.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { ContributionsModule } from './modules/contributions/contributions.module';
import { EventsModule } from './modules/events/events.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { NewsModule } from './modules/news/news.module';
import { PublicModule } from './modules/public/public.module';
import { PendingRegistrationsModule } from './modules/pending-registrations/pending-registrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 3 }] }),
    PrismaModule,
    AuditLogModule,
    GuardsModule,
    NotificationsModule,
    AuthModule,
    PostsModule,
    JurisdictionsModule,
    BearersModule,
    AssignmentsModule,
    ContributionsModule,
    EventsModule,
    ReportsModule,
    RemindersModule,
    NewsModule,
    PublicModule,
    PendingRegistrationsModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}

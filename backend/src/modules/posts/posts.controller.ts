import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Auth } from '../../common/guards/auth.decorator';
import { SuperAdminOnly } from '../../common/guards/super-admin-only.decorator';
import { CurrentBearerId } from '../../common/decorators/current-bearer-id.decorator';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  @Auth()
  list() {
    return this.posts.list();
  }

  @Post()
  @SuperAdminOnly()
  create(@Body() dto: CreatePostDto, @CurrentBearerId() bearerId: string) {
    return this.posts.create(dto, bearerId);
  }

  @Patch(':id')
  @SuperAdminOnly()
  update(@Param('id') id: string, @Body() dto: UpdatePostDto, @CurrentBearerId() bearerId: string) {
    return this.posts.update(id, dto, bearerId);
  }
}

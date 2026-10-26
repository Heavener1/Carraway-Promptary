# Promptary

面向 AI 创作者的提示词共享社区，覆盖 **文生图 / 图生图 / 文生视频 / 图生视频**，并提供 AI 资讯与论坛的扩展位置。

当前版本已完成可运行的核心闭环：

- 邮箱注册 / 登录 / 退出，HttpOnly Cookie + JWT
- 图片 / 视频上传，自动读取图片尺寸
- 发布提示词（正负向提示词、模型、参数、标签、分类、素材）
- 草稿 / 提交审核 / 管理员审核通过或驳回
- 首页瀑布流、类型筛选、标签筛选、关键词搜索、游标分页
- 提示词详情页：媒体画廊、参考图、参数展示、一键复制、相关推荐
- 社区互动：点赞、收藏、评论，个人收藏页
- AI 资讯：公开列表 / 分类筛选 / 搜索 / 分页、详情页、编辑精选
- 资讯后台：新建、编辑、封面上传、草稿 / 发布、下架、删除
- SEO：服务端渲染、动态 Metadata、Open Graph、JSON-LD
- 管理后台：待审核队列、统计、通过 / 驳回、资讯管理

尚未实现（已在数据模型和目录结构中预留）：评论回复与点赞、关注、通知、资讯 RSS 自动采集、论坛发帖、用户管理、邮件验证。

---

## 技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | Next.js 16（App Router）+ React 19 + TypeScript + Tailwind CSS 4 + TanStack Query |
| 后端 | FastAPI + SQLAlchemy 2.0（async）+ Pydantic v2 |
| 数据库 | 本地 SQLite（aiosqlite）；生产 PostgreSQL 17（asyncpg） |
| 迁移 | Alembic |
| 鉴权 | JWT（PyJWT）+ Argon2 密码哈希 + HttpOnly Cookie |
| 媒体 | 本地文件存储（开发）；预留 S3 / MinIO / R2 切换点 |
| 部署 | Docker Compose + Next.js standalone |

## 架构

```text
浏览器
 ├─ Next.js (web, :3000)
 │    ├─ SSR / 动态 Metadata / 图片优化
 │    ├─ 浏览器直连 API（credentials: include）
 │    └─ 服务端组件转发 Cookie 调 API
 └─ FastAPI (api, :8000)
      ├─ /api/v1/auth        注册 / 登录 / 刷新 / 退出
      ├─ /api/v1/prompts     发布 / 列表 / 详情 / 搜索 / 编辑 / 删除
      ├─ /api/v1/news        AI 资讯列表 / 详情
      ├─ /api/v1/tags        热门标签
      ├─ /api/v1/media       媒体上传
      ├─ /api/v1/meta        类型 / 分类 / 模型 / 资讯分类选项
      ├─ /api/v1/*           点赞 / 收藏 / 评论
      └─ /api/v1/admin       审核队列 / 统计 / 资讯 CRUD
           │
           ├─ SQLite（开发） / PostgreSQL（生产）
           └─ 本地 media/ 目录（生产可替换为对象存储）
```

前后端完全分离：前端只通过 REST 调用后端，不共享进程或数据库连接。Next.js 仅承担渲染与 SEO，不承载业务逻辑。

## 目录结构

```text
Carraway-Promptary/
├─ backend/
│  ├─ app/
│  │  ├─ api/v1/         路由层（auth/users/prompts/tags/media/meta/admin）
│  │  ├─ core/           配置、数据库、安全、依赖、Cookie
│  │  ├─ models/         SQLAlchemy 模型
│  │  ├─ schemas/        Pydantic 请求/响应模型
│  │  ├─ services/       业务逻辑（提示词、存储）
│  │  └─ main.py         应用入口、CORS、静态媒体、种子管理员
│  ├─ alembic/           数据库迁移
│  ├─ scripts/
│  │  ├─ smoke_test.py   端到端冒烟测试
│  │  └─ seed_demo.py    本地演示数据
│  ├─ tests/
│  └─ pyproject.toml
├─ frontend/
│  ├─ src/app/           首页、详情、登录、注册、发布、资讯、审核、论坛占位
│  ├─ src/components/    卡片、瀑布流、发布表单、资讯流/编辑器、审核台等
│  └─ src/lib/           API 客户端、类型、常量、React Query hooks
├─ docker-compose.yml
├─ .env.docker.example
└─ README.md
```

---

## 本地启动

环境要求：Python 3.12+、uv、Node.js 20+（推荐 24）。本地不依赖 Docker。

### 1. 后端

```bash
cd backend
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

- API 文档：<http://localhost:8000/docs>
- 健康检查：<http://localhost:8000/health>
- 首次启动会自动建表，并创建管理员：
  - 邮箱：`admin@example.com`
  - 密码：`admin123456`
  - 生产环境务必修改，并在首次创建后设置 `SEED_ADMIN=false`

### 2. 前端

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

访问 <http://localhost:3000>。

前端环境变量：

```env
NEXT_PUBLIC_API_URL=http://localhost:8000   # 浏览器访问的 API 地址
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # SEO / Open Graph 站点地址
API_INTERNAL_URL=http://127.0.0.1:8000      # 服务端组件内部访问 API
```

### 3. 演示数据（可选）

```bash
cd backend
uv run python scripts/seed_demo.py
```

会创建 5 条已审核的演示提示词和 3 篇已发布资讯（均含本地生成的占位封面），首页与资讯频道立即有内容。脚本按标题幂等，可重复执行。

### 4. 常用命令

```bash
# 后端
cd backend
uv run ruff check .
uv run python scripts/smoke_test.py    # 使用临时数据库跑完整闭环
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head

# 前端
cd frontend
npm run typecheck
npm run build
```

> 本地开发使用 SQLite 时，应用通过 `AUTO_CREATE_TABLES=true` 自动建表。生产环境请设置 `AUTO_CREATE_TABLES=false` 并只通过 Alembic 管理表结构。

---

## 核心设计

### 数据模型

- `users`：邮箱、用户名、Argon2 密码、角色（user/admin）、头像、简介
- `prompts`：类型、标题、slug、正/负向提示词、模型、参数 JSONB/JSON、分类、状态、可见性、计数、发布时间
- `prompt_assets`：输入/输出素材，支持图片与视频，记录宽高、时长、排序
- `tags` / `prompt_tags`：多对多标签
- `prompt_likes` / `prompt_favorites`：用户与提示词的唯一关系，重复请求幂等
- `prompt_comments`：评论内容、作者与时间，删除时同步维护计数
- `prompts` 上的 `like_count`、`favorite_count`、`comment_count`、`view_count` 采用原子更新，避免并发覆盖
- `news_articles`：标题、拼音 slug、摘要、正文、封面、分类、来源、状态、编辑精选、浏览数、发布时间

### 状态流转

```text
draft ──提交──> pending ──通过──> published
                   │
                   └──驳回──> rejected ──修改后重新提交──> pending

published 被作者修改 ──> pending（重新审核），published_at 清空
```

### 分页

公开列表使用 **keyset / 游标分页**，避免 offset 深分页性能退化：

- `latest`：`(published_at, id)`
- `popular`：`(like_count, id)`
- `views`：`(view_count, id)`

响应返回 `next_cursor`，前端用 TanStack Query `useInfiniteQuery` + IntersectionObserver 自动加载。

### 搜索与 slug

- 当前使用 `ILIKE` 匹配标题、正向提示词与简介，中小数据量足够；后续可平滑替换为 Meilisearch。
- 中文标题通过 `pypinyin` 生成拼音 slug，例如 `晨雾中的山间小屋` → `chen-wu-zhong-de-shan-jian-xiao-wu-xxxxxx`，兼顾可读性与 SEO。

### AI 资讯

- 资讯与提示词分表存储，避免把编辑内容混进用户投稿模型。
- 状态只有 `draft` / `published`：草稿仅管理员可见，发布后进入公开列表；下架不删除数据。
- 分类固定为模型发布 / 产品动态 / 行业观察 / 教程实践 / 研究论文，后端校验、前端复用 `/meta/options` 语义。
- 公开列表使用 offset 分页（资讯量级远小于提示词），按 `published_at DESC, id DESC` 排序；后台按创建时间排序。
- 正文支持轻量排版：`##` / `###` 小标题、`- ` 列表、空行分段，前端渲染时按纯文本节点输出，不执行 HTML。
- 详情页输出 `NewsArticle` JSON-LD、Open Graph 与动态 Metadata；来源链接统一 `rel="noopener noreferrer nofollow"`。

### 媒体上传

- 开发环境：`POST /api/v1/media/upload` 接收 multipart，校验 MIME、大小，图片用 Pillow 校验并读取尺寸。
- 存储抽象在 `app/services/storage.py`。生产建议替换为 S3 兼容存储 + 预签名直传，避免大文件经过 API。
- 视频目前原样保存，未做转码；建议生产环境用 ffmpeg 生成封面、统一 H.264 MP4，并限制时长。

### 鉴权与权限

- 登录后由 API 写入两个 HttpOnly Cookie：`promptary_access`（60 分钟）与 `promptary_refresh`（30 天）。
- 前端 `clientFetch` 遇到 401 会自动调用 `/auth/refresh` 并重试一次。
- 所有管理接口通过 `require_admin` 依赖强制校验角色，前端隐藏入口不作为安全边界。
- Cookie 使用 `SameSite=Lax`；生产 HTTPS 下设置 `COOKIE_SECURE=true`。

---

## API 概览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | 注册并登录 |
| POST | `/api/v1/auth/login` | 登录 |
| POST | `/api/v1/auth/refresh` | 刷新 Cookie |
| POST | `/api/v1/auth/logout` | 退出 |
| GET | `/api/v1/users/me` | 当前用户 |
| PATCH | `/api/v1/users/me` | 修改用户名 / 头像 / 简介 |
| GET | `/api/v1/prompts` | 公开列表（q/type/tag/category/sort/cursor/limit） |
| GET | `/api/v1/prompts/mine` | 我的提示词（含草稿与驳回） |
| POST | `/api/v1/prompts` | 创建（草稿或提交审核） |
| GET | `/api/v1/prompts/{slug}` | 详情（未发布仅作者/管理员可见） |
| GET | `/api/v1/prompts/{slug}/related` | 相关推荐 |
| PATCH | `/api/v1/prompts/{id}` | 编辑 |
| DELETE | `/api/v1/prompts/{id}` | 删除 |
| GET | `/api/v1/tags` | 热门标签 |
| GET | `/api/v1/meta/options` | 类型 / 分类 / 模型选项 |
| POST | `/api/v1/media/upload` | 上传素材（需登录） |
| POST / DELETE | `/api/v1/prompts/{slug}/like` | 点赞 / 取消点赞 |
| POST / DELETE | `/api/v1/prompts/{slug}/favorite` | 收藏 / 取消收藏 |
| GET / POST | `/api/v1/prompts/{slug}/comments` | 评论列表 / 发布评论 |
| DELETE | `/api/v1/comments/{comment_id}` | 删除自己的评论（管理员可删任意） |
| GET | `/api/v1/users/me/favorites` | 我的收藏 |
| GET | `/api/v1/news` | 公开资讯列表（q/category/limit/offset） |
| GET | `/api/v1/news/{slug}` | 资讯详情，公开接口自动增加浏览数 |
| GET | `/api/v1/admin/news` | 资讯管理列表，含草稿（管理员） |
| GET | `/api/v1/admin/news/{id}` | 资讯完整详情，用于编辑草稿（管理员） |
| POST | `/api/v1/admin/news` | 新建资讯（管理员） |
| PATCH | `/api/v1/admin/news/{id}` | 编辑 / 发布 / 下架（管理员） |
| DELETE | `/api/v1/admin/news/{id}` | 删除资讯（管理员） |
| GET | `/api/v1/admin/prompts` | 审核列表（管理员） |
| POST | `/api/v1/admin/prompts/{id}/review` | 通过 / 驳回（管理员） |
| GET | `/api/v1/admin/stats` | 后台统计（管理员） |

完整 OpenAPI：<http://localhost:8000/docs>

---

## 扩展指南

### 新增内容类型（资讯 / 论坛 / 工作流）

1. 新建独立表（例如 `news_articles`、`forum_threads`），不要把所有内容塞进 `prompts`。
2. 评论、点赞、收藏、举报统一使用 `(target_type, target_id)` 多态关联，新增内容类型无需改互动表。
3. 后端按领域新增 `app/api/v1/<module>.py` + `services/<module>.py`，在 `router.py` 注册。
4. 前端新增路由与 `lib/types.ts` 类型，复用卡片、筛选、详情布局。

### 搜索升级

在 `app/services/prompt_service.py` 中把 `list_prompts` 的查询替换为 Meilisearch / Typesense 调用，保持返回结构不变。给索引同步加上 outbox 或队列任务即可。

### 异步任务与缓存

接入 Redis 后可增加：

- 热榜、详情缓存、标签计数缓存
- 浏览去重（同一 IP/用户 5 分钟内只计一次）
- 通知、邮件、缩略图、视频转码任务队列（ARQ / Celery）

### 对象存储

实现 `S3Storage.save()` 与 `POST /media/presign`，前端改为拿预签名 URL 直传，API 只落库元数据。数据库中的 URL 使用相对路径或 CDN 域名，便于迁移。

---

## 生产部署（Docker Compose）

```bash
cp .env.docker.example .env
# 修改 .env 中的 SECRET_KEY、POSTGRES_PASSWORD、ADMIN_PASSWORD、SITE_URL、PUBLIC_API_URL
docker compose up -d --build
```

- 前台：<http://服务器IP:3000>
- API：<http://服务器IP:8000/docs>
- 数据库迁移在 API 容器启动时自动执行 `alembic upgrade head`。
- 媒体文件保存在 `media` volume。
- `NEXT_PUBLIC_API_URL` 在构建时写入前端产物，修改后需要重新 `docker compose build web`。

生产检查清单：

- [ ] 使用 Nginx / Caddy 反代并启用 HTTPS，设置 `COOKIE_SECURE=true`
- [ ] 设置准确的 `CORS_ORIGINS`、`SITE_URL`、`PUBLIC_API_URL`
- [ ] 更换默认管理员密码，首次启动后设置 `SEED_ADMIN=false`
- [ ] 备份 PostgreSQL 与媒体 volume
- [ ] 增加登录/发布限流、内容审核与敏感词过滤
- [ ] 视频转码与封面生成
- [ ] 监控（Sentry / 日志 / 健康检查）与告警
- [ ] 面向中国大陆用户时完成 ICP 备案与内容合规

---

## 性能与体验现状

已实现：

- SSR 首页与详情页，动态 Metadata、Open Graph、JSON-LD
- Next Image 自动生成多尺寸图片，CDN 友好的远程图片配置
- 游标分页、数据库复合索引、懒加载无限滚动
- 瀑布流布局、骨架屏、乐观加载更多、复制反馈、暗色 UI、移动端适配
- 上传素材预览与角色切换
- 点赞 / 收藏 / 评论的乐观更新，收藏夹与详情页状态同步
- 未登录用户点击互动时自动跳转登录，登录后回到原页面
- 资讯频道 SSR 首屏、分类切换、搜索防抖、分页加载与骨架屏
- 资讯后台弹层编辑、封面上传预览、发布状态快捷切换、删除确认

下一步优化：

- 公开详情页改为 ISR + 发布后按需 revalidate（当前为 `force-dynamic`）
- Redis 缓存热榜与详情，浏览去重
- Meilisearch 全文检索与同义词
- 视频封面、转码、HLS
- 图片 blurhash 占位与 AVIF 转换
- 评论回复、评论点赞、关注、通知
- AI 资讯 RSS 采集与 AI 摘要
- 论坛板块、举报与审核日志

---

## 已知限制

- 评论为单层结构，暂不支持回复、评论点赞、编辑和举报。
- 互动接口暂无频率限制和敏感词审核，公开上线前需要补上。
- 未实现关注、通知、@ 提醒和邮件订阅。
- 视频仅接受浏览器可直接播放的格式，未转码。
- 本地存储为单实例方案，多副本部署前需切换对象存储。
- 未实现邮箱验证、找回密码、OAuth 登录。
- 管理后台目前包含提示词审核、统计和资讯管理，尚未提供用户管理、评论审核与操作日志。
- AI 资讯目前由管理员手动撰写，未接入 RSS 采集、自动摘要和定时发布。
- 本地 SQLite 仅用于开发；生产请使用 PostgreSQL + Alembic。

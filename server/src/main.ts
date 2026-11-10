import 'reflect-metadata'
import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { json, urlencoded } from 'express'
import { AppModule } from './app.module'

async function bootstrap() {
  // 关掉内置 body parser，自己挂一份带更大上限的：
  // 整库导入（含 AI 会话历史）很容易超过 express 默认的 100kb
  const app = await NestFactory.create(AppModule, { bodyParser: false })

  app.use(json({ limit: '32mb' }))
  app.use(urlencoded({ extended: true, limit: '32mb' }))

  app.setGlobalPrefix('api')
  app.enableCors({ origin: true, credentials: true })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  )

  const port = Number(process.env.PORT) || 3000
  await app.listen(port)
  new Logger('Bootstrap').log(`API 已启动 → http://localhost:${port}/api`)
}

void bootstrap()

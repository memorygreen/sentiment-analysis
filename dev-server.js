/**
 * ==============================================================================
 * Moodly 로컬 개발 서버 (dev-server.js)
 * ==============================================================================
 * [역할 및 기능]
 * 1. 로컬 환경에서 Vercel CLI 없이도 완벽하게 웹 서비스를 실행할 수 있는 경량 서버
 * 2. .env 환경변수를 자동으로 불러옵니다.
 * 3. 정적 파일 (index.html, assets/css, assets/js)을 안전하게 서빙합니다.
 * 4. /api/analyze 요청을 Vercel Serverless 핸들러(api/analyze.js)로 라우팅합니다.
 * ==============================================================================
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import analyzeHandler from './api/analyze.js';

// .env 파일의 환경변수 로드
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

// MIME 타입 매핑 테이블
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // 1) API 엔드포인트 라우팅 (/api/analyze)
  if (pathname === '/api/analyze') {
    // Vercel 호환 헬퍼 메서드 주입 (res.status, res.json)
    res.status = function (statusCode) {
      this.statusCode = statusCode;
      return this;
    };
    res.json = function (data) {
      this.setHeader('Content-Type', 'application/json; charset=utf-8');
      this.end(JSON.stringify(data));
      return this;
    };

    // 요청 본문 버퍼 수집
    let rawBody = '';
    req.on('data', chunk => {
      rawBody += chunk;
    });

    req.on('end', async () => {
      try {
        req.body = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        req.body = rawBody; // 문자열 상태 유지 후 핸들러에서 검증
      }

      try {
        await analyzeHandler(req, res);
      } catch (err) {
        console.error('[Server Error]', err);
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: '서버 내부 오류가 발생했습니다.'
          }
        });
      }
    });

    return;
  }

  // 2) 정적 파일 서빙 (루트 경로 접근 시 index.html 제공)
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(path.join(__dirname, filePath));

  // 디렉터리 순회 보안 취약점 차단
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('접근이 거부되었습니다.');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('요청하신 파일을 찾을 수 없습니다.');
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(safePath).pipe(res);
  });
});

// 서버 실행 시작
server.listen(PORT, () => {
  console.log('====================================================');
  console.log(` Moodly 개발 서버가 성공적으로 시작되었습니다!`);
  console.log(` 접속 주소: http://localhost:${PORT}`);
  console.log('====================================================');
});


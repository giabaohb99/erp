import { NextResponse } from 'next/server';

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'BaoERP Sản xuất / MRP API',
    version: '1.0.0',
    description: 'API documentation for BaoERP Sản xuất / MRP module / Tài liệu API cho module Sản xuất / MRP của BaoERP',
  },
  servers: [
    { url: 'http://localhost:3005', description: 'Development / Phát triển' },
  ],
  paths: {},
  components: { schemas: {} },
  tags: [],
};

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

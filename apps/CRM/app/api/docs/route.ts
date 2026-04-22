import { NextResponse } from 'next/server';

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'BaoERP CRM API',
    version: '1.0.0',
    description: 'API documentation for BaoERP CRM module / Tài liệu API cho module CRM của BaoERP',
  },
  servers: [
    { url: 'http://localhost:3018', description: 'Development / Phát triển' },
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

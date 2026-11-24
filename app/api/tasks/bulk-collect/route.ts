import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json(
        { error: 'This legacy collection route is retired. Run the registered monthly-close Automation Task.' },
        { status: 410 }
    );
}

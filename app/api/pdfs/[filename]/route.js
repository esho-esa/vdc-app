import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request, { params }) {
  try {
    const { filename } = params

    if (!filename || !filename.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
    }

    // Check public/pdfs first
    let filePath = path.join(process.cwd(), 'public', 'pdfs', filename)

    // If not found check assets/pdfs
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'assets', 'pdfs', filename)
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
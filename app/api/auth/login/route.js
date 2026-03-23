import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { verifyPassword, generateToken } from '@/lib/auth'

export async function POST(request) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    const supabase = getDB()

    const { data: user, error } = await supabase
      .from('staff')
      .select('*')
      .eq('username', username)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    if (!verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const token = generateToken({
      email: user.email,
      name: user.name,
      role: user.role
    })

    return NextResponse.json({
      success: true,
      token,
      user: {
        email: user.email,
        name: user.name,
        role: user.role
      }
    })

  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
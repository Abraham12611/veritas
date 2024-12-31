import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Database } from '@/lib/supabase/types'

const instanceSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  environment: z.enum(['public', 'private']),
})

export const runtime = 'edge'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore,
    })

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: instances, error } = await supabase
      .from('instances')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching instances:', error)
      return NextResponse.json(
        { error: 'Failed to fetch instances' },
        { status: 500 }
      )
    }

    return NextResponse.json(instances)
  } catch (error) {
    console.error('Error in instances GET route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore,
    })

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      console.error('Session error:', sessionError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const json = await request.json()

    // Validate request body
    const validatedData = instanceSchema.parse(json)

    // Create instance
    const { data: instance, error } = await supabase
      .from('instances')
      .insert([
        {
          name: validatedData.name,
          user_id: session.user.id,
          environment: validatedData.environment,
          is_public: validatedData.environment === 'public',
          status: 'active',
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating instance:', error)
      return NextResponse.json(
        { error: 'Failed to create instance' },
        { status: 500 }
      )
    }

    return NextResponse.json(instance)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error in instances POST route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
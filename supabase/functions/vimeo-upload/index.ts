import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { accessToken, title, description, privacy } = await req.json()

    // Step 1: Create upload ticket
    const createResponse = await fetch('https://api.vimeo.com/me/videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.vimeo.*+json;version=3.4'
      },
      body: JSON.stringify({
        upload: {
          approach: 'tus',
          size: req.headers.get('x-file-size') || '0'
        },
        name: title,
        description: description,
        privacy: privacy || {
          view: 'unlisted',
          embed: 'whitelist',
          download: false,
          add: false,
          comments: 'nobody'
        }
      })
    })

    if (!createResponse.ok) {
      const error = await createResponse.text()
      throw new Error(`Failed to create upload: ${error}`)
    }

    const videoData = await createResponse.json()
    
    return new Response(
      JSON.stringify({
        uploadLink: videoData.upload.upload_link,
        videoId: videoData.uri.split('/').pop(),
        embedUrl: `https://player.vimeo.com/video/${videoData.uri.split('/').pop()}`,
        videoData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
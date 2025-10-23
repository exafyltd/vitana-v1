import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoMetadata {
  durationSec: number;
  width: number;
  height: number;
  thumbnailUrl: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Extract video metadata function called');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { videoPath } = await req.json();

    if (!videoPath) {
      throw new Error('videoPath is required');
    }

    console.log('Processing video:', videoPath);

    // Download video file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('media')
      .download(videoPath);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error(`Failed to download video: ${downloadError.message}`);
    }

    console.log('Video downloaded, size:', fileData.size);

    // Create temporary file
    const tempVideoPath = `/tmp/${crypto.randomUUID()}.mp4`;
    await Deno.writeFile(tempVideoPath, new Uint8Array(await fileData.arrayBuffer()));

    // Extract video metadata using ffprobe
    const probeCommand = new Deno.Command('ffprobe', {
      args: [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,duration',
        '-show_entries', 'format=duration',
        '-of', 'json',
        tempVideoPath
      ],
      stdout: 'piped',
      stderr: 'piped',
    });

    const probeOutput = await probeCommand.output();
    const probeData = JSON.parse(new TextDecoder().decode(probeOutput.stdout));

    console.log('Probe data:', probeData);

    const width = probeData.streams[0]?.width || 1080;
    const height = probeData.streams[0]?.height || 1920;
    const duration = parseFloat(probeData.streams[0]?.duration || probeData.format?.duration || '0');
    const durationSec = Math.floor(duration);

    console.log('Video metadata:', { width, height, durationSec });

    // Generate thumbnail from first frame
    const thumbnailPath = `/tmp/${crypto.randomUUID()}.jpg`;
    const thumbnailCommand = new Deno.Command('ffmpeg', {
      args: [
        '-i', tempVideoPath,
        '-ss', '00:00:01',
        '-vframes', '1',
        '-vf', 'scale=640:-1',
        '-y',
        thumbnailPath
      ],
      stdout: 'piped',
      stderr: 'piped',
    });

    await thumbnailCommand.output();
    console.log('Thumbnail generated');

    // Upload thumbnail to storage
    const thumbnailFile = await Deno.readFile(thumbnailPath);
    const thumbnailStoragePath = videoPath.replace(/\.[^.]+$/, '.jpg');
    
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(thumbnailStoragePath, thumbnailFile, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Thumbnail upload error:', uploadError);
      throw new Error(`Failed to upload thumbnail: ${uploadError.message}`);
    }

    console.log('Thumbnail uploaded to:', thumbnailStoragePath);

    // Get public URL for thumbnail
    const { data: { publicUrl: thumbnailUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(thumbnailStoragePath);

    // Cleanup temp files
    try {
      await Deno.remove(tempVideoPath);
      await Deno.remove(thumbnailPath);
    } catch (e) {
      console.warn('Cleanup error:', e);
    }

    const metadata: VideoMetadata = {
      durationSec,
      width,
      height,
      thumbnailUrl
    };

    console.log('Metadata extracted successfully:', metadata);

    return new Response(
      JSON.stringify(metadata),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-video-meta:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

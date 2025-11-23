
import { createClient } from '@supabase/supabase-js';

// 填入您的 Supabase URL 和 Anon Key
const supabaseUrl = 'https://hlkwaetcyteahoiweicv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsa3dhZXRjeXRlYWhvaXdlaWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4ODk5NzUsImV4cCI6MjA3OTQ2NTk3NX0.T5mdGG6cac0aiHrqFINwr_yBqWeXxVpBjqfbfHdaTSg';

export const supabase = createClient(supabaseUrl, supabaseKey);